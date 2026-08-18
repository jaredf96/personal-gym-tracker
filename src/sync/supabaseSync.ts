import { db, BACKUP_TABLES, REFERENCE_TABLES, LOG_TABLES, type BackupTableName } from "../db/db";
import { ensureSeeded, reseedProgramData, repairData, SEED_VERSION } from "../db/seedRunner";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { takeSnapshot } from "../db/snapshot";
import type { ProgramMeta } from "../types";

// ===========================================================================
// Per-user cloud sync.
//
// Model: Dexie is the local working store (engine/repo/screens untouched).
// Once signed in, Supabase holds the per-user copy, one thin table per entity:
// (user_id, id, data jsonb, updated_at), RLS user_id = auth.uid().
//
// Safety rules this module enforces (each fixes a reviewed defect):
//  1. The cloud is NEVER reset based on a local guess. Program migrations are
//     decided by comparing the CLOUD program version to SEED_VERSION — a fresh
//     device with empty localStorage adopts cloud history instead of wiping it.
//  2. Program upgrades replace REFERENCE tables only; LOG tables (history,
//     metrics, settings) are pushed up before any pull, so they survive on
//     both sides.
//  3. startSync awaits ensureSeeded() — no race against the seeding pass.
//  4. Pulls are diff-applies in one local transaction, and rows the user wrote
//     while a pull was in flight are skipped (kept + re-pushed) instead of
//     silently destroyed.
//  5. Failed remote deletes are queued and retried on the next flush.
//  6. Bulk local rewrites (backup import) run inside withSyncPaused() and then
//     one bounded reconcile — never a per-row network storm.
//
// Known, accepted tradeoff: conflict resolution is last-write-wins snapshots,
// single-user oriented.
// ===========================================================================

const OWNER_KEY = "gym-tracker.localOwner";

// Dexie table name -> Supabase table name.
const REMOTE: Record<BackupTableName, string> = {
  exercises: "exercises",
  workoutTemplates: "workout_templates",
  templateExercises: "template_exercises",
  workoutSessions: "workout_sessions",
  setEntries: "set_entries",
  cardioLogs: "cardio_logs",
  bodyMetrics: "body_metrics",
  readinessLogs: "readiness_logs",
  settings: "settings",
  aiReports: "ai_reports",
  volumeTargets: "volume_targets",
  progressionRules: "progression_rules",
  weeklySchedule: "weekly_schedule",
  programMeta: "program_meta",
};

// Primary-key field per Dexie table (defaults to "id").
const KEY_FIELD: Partial<Record<BackupTableName, string>> = {
  volumeTargets: "muscle",
  progressionRules: "rule",
};
function keyField(t: BackupTableName): string {
  return KEY_FIELD[t] ?? "id";
}

const DELETE_CHUNK = 200;

// ---------------------------------------------------------------------------
// Status (observable for the Settings UI)
// ---------------------------------------------------------------------------
export type SyncState = "disabled" | "syncing" | "idle" | "offline" | "error";
export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: string | null;
  message?: string;
}

let status: SyncStatus = { state: "disabled", lastSyncedAt: null };
const listeners = new Set<(s: SyncStatus) => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l(status));
}

export function subscribeSync(listener: (s: SyncStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}
export function getSyncStatus(): SyncStatus {
  return status;
}

function errMessage(e: unknown): string {
  if (!navigator.onLine) return "Offline — will sync when back online.";
  return e instanceof Error ? e.message : String(e);
}

function failStatus(e: unknown) {
  setStatus({ state: navigator.onLine ? "error" : "offline", message: errMessage(e) });
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
let currentUserId: string | null = null;
let enabled = false; // true only while a user is signed in

// Suspension is a COUNTER, not a boolean: a pull, an import, and a clear can
// overlap, and the first one to finish must not un-suspend the others.
let suspendCount = 0;
function isSuspended(): boolean {
  return suspendCount > 0;
}
let hooksInstalled = false;
let startGeneration = 0; // guards overlapping start() calls (StrictMode, re-login)
// Row-level dirty tracking: each flush uploads only the rows that changed —
// logging one set no longer re-uploads the entire (ever-growing) history.
const dirtyRows = new Map<BackupTableName, Set<string>>();
let pushTimer: ReturnType<typeof setTimeout> | undefined;

function markDirty(t: BackupTableName, id: string) {
  let set = dirtyRows.get(t);
  if (!set) {
    set = new Set();
    dirtyRows.set(t, set);
  }
  set.add(id);
}

// Remote deletes that failed (e.g. offline) — retried on the next flush.
const pendingDeletes = new Map<BackupTableName, Set<string>>();

// Rows the user mutated recently, so an in-flight pull never clobbers or
// deletes them (they stay local + dirty and win via the next push).
const RECENT_TTL_MS = 10 * 60_000;
const recentMutations = new Map<BackupTableName, Map<string, number>>();

function noteMutation(t: BackupTableName, id: unknown) {
  let m = recentMutations.get(t);
  if (!m) {
    m = new Map();
    recentMutations.set(t, m);
  }
  m.set(String(id), Date.now());
}

function pruneRecentMutations() {
  const cutoff = Date.now() - RECENT_TTL_MS;
  for (const [t, m] of recentMutations) {
    for (const [id, ts] of m) if (ts < cutoff) m.delete(id);
    if (m.size === 0) recentMutations.delete(t);
  }
}

// ---------------------------------------------------------------------------
// Dexie change capture
// ---------------------------------------------------------------------------
function installHooks() {
  if (hooksInstalled) return;
  for (const t of BACKUP_TABLES) {
    const table = db.table(t);
    table.hook("creating", (primKey) => {
      onLocalWrite(t, primKey);
    });
    table.hook("updating", (_mods, primKey) => {
      onLocalWrite(t, primKey);
    });
    table.hook("deleting", (primKey) => {
      onLocalDelete(t, primKey);
    });
  }
  hooksInstalled = true;
}

function onLocalWrite(t: BackupTableName, primKey: unknown) {
  if (!enabled || isSuspended()) return;
  noteMutation(t, primKey);
  markDirty(t, String(primKey));
  scheduleFlush();
}

function onLocalDelete(t: BackupTableName, primKey: unknown) {
  if (!enabled || isSuspended() || !supabase || !currentUserId) return;
  noteMutation(t, primKey);
  const id = String(primKey);
  void supabase
    .from(REMOTE[t])
    .delete()
    .eq("user_id", currentUserId)
    .eq("id", id)
    .then(({ error }) => {
      if (error) {
        // Queue for retry instead of losing the delete (it would otherwise be
        // resurrected by the next pull).
        let set = pendingDeletes.get(t);
        if (!set) {
          set = new Set();
          pendingDeletes.set(t, set);
        }
        set.add(id);
        failStatus(error);
        scheduleFlush();
      }
    });
}

function scheduleFlush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void flushDirty(), 1500);
}

async function flushDirty() {
  if (!enabled || !supabase || !currentUserId) return;
  if (dirtyRows.size === 0 && pendingDeletes.size === 0) return;
  const snapshot = new Map([...dirtyRows].map(([t, ids]) => [t, new Set(ids)]));
  dirtyRows.clear();
  setStatus({ state: "syncing" });
  try {
    await retryPendingDeletes();
    for (const [t, ids] of snapshot) await upsertRows(t, [...ids]);
    setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), message: undefined });
  } catch (e) {
    // Put everything back for the next flush / manual sync.
    for (const [t, ids] of snapshot) ids.forEach((id) => markDirty(t, id));
    failStatus(e);
  }
}

async function retryPendingDeletes() {
  if (!supabase || !currentUserId) return;
  for (const [t, ids] of [...pendingDeletes]) {
    const list = [...ids];
    for (let i = 0; i < list.length; i += DELETE_CHUNK) {
      const chunk = list.slice(i, i + DELETE_CHUNK);
      const { error } = await supabase
        .from(REMOTE[t])
        .delete()
        .eq("user_id", currentUserId)
        .in("id", chunk);
      if (error) throw error;
      chunk.forEach((id) => ids.delete(id));
    }
    if (ids.size === 0) pendingDeletes.delete(t);
  }
}

// ---------------------------------------------------------------------------
// Push / pull / prune primitives
// ---------------------------------------------------------------------------
const UPSERT_CHUNK = 500;

function toPayload(t: BackupTableName, rows: unknown[]) {
  const kf = keyField(t);
  return rows.map((r) => ({
    user_id: currentUserId,
    id: String((r as Record<string, unknown>)[kf]),
    data: r,
    updated_at: new Date().toISOString(),
  }));
}

async function upsertPayload(t: BackupTableName, rows: unknown[]) {
  if (!supabase || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const { error } = await supabase
      .from(REMOTE[t])
      .upsert(toPayload(t, rows.slice(i, i + UPSERT_CHUNK)), { onConflict: "user_id,id" });
    if (error) throw error;
  }
}

// Upsert only specific rows by id. Ids that no longer exist locally are
// deletions — the delete path owns those, so they're skipped here.
async function upsertRows(t: BackupTableName, ids: string[]) {
  if (!supabase || !currentUserId || ids.length === 0) return;
  const rows = (await db.table(t).bulkGet(ids)).filter((r) => r !== undefined);
  await upsertPayload(t, rows);
}

async function upsertTable(t: BackupTableName) {
  if (!supabase || !currentUserId) return;
  const rows = await db.table(t).toArray();
  await upsertPayload(t, rows);
}

async function pushTables(tables: readonly BackupTableName[]) {
  for (const t of tables) await upsertTable(t);
}

// Diff-apply pull: fetch cloud rows over the network first (sync hooks stay
// live so user writes keep getting tracked), then apply everything in ONE
// local transaction with hooks suspended. Rows the user touched after the
// fetch started are left alone — they stay dirty and win via the next push.
async function pullTables(tables: readonly BackupTableName[]) {
  if (!supabase || !currentUserId) return;
  pruneRecentMutations();
  const pullStart = Date.now();

  const fetched = new Map<BackupTableName, unknown[]>();
  for (const t of tables) {
    const { data, error } = await supabase
      .from(REMOTE[t])
      .select("data")
      .eq("user_id", currentUserId);
    if (error) throw error;
    fetched.set(t, (data ?? []).map((r) => (r as { data: unknown }).data));
  }

  const touchedSincePull = (t: BackupTableName, id: string): boolean => {
    const ts = recentMutations.get(t)?.get(id);
    return ts !== undefined && ts >= pullStart;
  };

  suspendCount++;
  try {
    await db.transaction("rw", tables.map((t) => db.table(t)), async () => {
      for (const t of tables) {
        const kf = keyField(t);
        const cloudRows = fetched.get(t) ?? [];
        const cloudIds = new Set(
          cloudRows.map((r) => String((r as Record<string, unknown>)[kf]))
        );
        const table = db.table(t);
        const localIds = (await table.toCollection().primaryKeys()).map(String);

        // ADDITIVE ONLY. A local row missing from the cloud used to be deleted
        // ("cloud wins"), which destroys anything logged while a push was
        // failing — e.g. a workout recorded offline in the gym. Real deletions
        // still propagate device -> cloud immediately via the deleting hook
        // (with retry), so a deleted row is gone from the cloud and simply
        // never comes back. The tradeoff — a row deleted on another device can
        // linger locally until deleted here — is far cheaper than losing data.
        void cloudIds;
        void localIds;
        const toPut = cloudRows.filter(
          (r) => !touchedSincePull(t, String((r as Record<string, unknown>)[kf]))
        );

        if (toPut.length) await table.bulkPut(toPut as never[]);
      }
    });
  } finally {
    suspendCount--;
  }
}

// Delete cloud rows (for the current user) whose ids no longer exist locally.
async function pruneCloudTables(tables: readonly BackupTableName[]) {
  if (!supabase || !currentUserId) return;
  for (const t of tables) {
    const kf = keyField(t);
    const localIds = new Set(
      (await db.table(t).toArray()).map((r) => String((r as Record<string, unknown>)[kf]))
    );
    const { data, error } = await supabase
      .from(REMOTE[t])
      .select("id")
      .eq("user_id", currentUserId);
    if (error) throw error;
    const stale = (data ?? []).map((r) => (r as { id: string }).id).filter((id) => !localIds.has(id));
    for (let i = 0; i < stale.length; i += DELETE_CHUNK) {
      const chunk = stale.slice(i, i + DELETE_CHUNK);
      const { error: delError } = await supabase
        .from(REMOTE[t])
        .delete()
        .eq("user_id", currentUserId)
        .in("id", chunk);
      if (delError) throw delError;
    }
  }
}

async function clearLocal() {
  suspendCount++;
  try {
    await db.transaction("rw", db.tables, async () => {
      for (const t of BACKUP_TABLES) await db.table(t).clear();
    });
  } finally {
    suspendCount--;
  }
}

async function cloudHasData(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { count, error } = await supabase
    .from(REMOTE.exercises)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// The program version the CLOUD copy was written with. null when the cloud has
// no program_meta (pre-v2 cloud, or brand-new account).
async function cloudSeedVersion(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(REMOTE.programMeta)
    .select("data")
    .eq("user_id", userId)
    .eq("id", "program")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (data.data as ProgramMeta).seedVersion ?? null;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

// Begin syncing for a signed-in user. Decides between adopt/reconcile/migrate
// using the CLOUD's program version — never a local-only flag.
export async function startSync(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    setStatus({ state: "disabled" });
    return;
  }
  if (enabled && currentUserId === userId) return; // already running for this user
  installHooks();
  currentUserId = userId;
  enabled = true;
  const gen = ++startGeneration;
  setStatus({ state: "syncing", message: undefined });

  try {
    // Seeding must complete before any reconcile decision (kills the startup race).
    await ensureSeeded();
    // Safety net: stash local logs before any cloud reconcile touches them.
    await takeSnapshot("before sync reconcile");
    if (gen !== startGeneration) return;

    // A different user's local cache must never leak across accounts.
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== userId) {
      await clearLocal();
      await reseedProgramData();
      if (gen !== startGeneration) return;
    }

    const [cloudVer, hasData] = [await cloudSeedVersion(userId), await cloudHasData(userId)];
    if (gen !== startGeneration) return;

    if (!hasData && cloudVer === null) {
      // Brand-new account: adopt local (seed + any pre-auth logs) into the cloud.
      await pushTables(BACKUP_TABLES);
    } else if (cloudVer === SEED_VERSION) {
      // Same program: push local state up (union), then pull the merged truth.
      await pushTables(BACKUP_TABLES);
      if (gen !== startGeneration) return;
      await pullTables(BACKUP_TABLES);
    } else {
      // Cloud is on an older program (or predates program_meta): migrate it.
      // Reference data: local new seed wins, stale cloud rows are pruned.
      // Log data: pushed up FIRST so nothing local is lost, then pulled so
      // history from the cloud lands on this device. History always survives.
      await pushTables(REFERENCE_TABLES);
      await pruneCloudTables(REFERENCE_TABLES);
      if (gen !== startGeneration) return;
      await pushTables(LOG_TABLES);
      await pullTables(LOG_TABLES);
    }

    if (gen !== startGeneration) return;

    // Repair AFTER the pull, not just at boot. ensureSeeded() is single-flight
    // and already ran from main.tsx before sync existed, so its repair only
    // touched local data — and the pull then re-imported the same legacy rows
    // (and still-open sessions) straight back from the cloud. Running it here,
    // with hooks live, both fixes the pulled data and propagates the fix up.
    await repairAndPropagate();

    if (gen !== startGeneration) return;
    localStorage.setItem(OWNER_KEY, userId);
    setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), message: undefined });
  } catch (e) {
    failStatus(e);
  }
}

/**
 * Repairs legacy/stale rows and pushes the result to the cloud, so the fix
 * survives the next pull. Deletions of dropped legacy rows are propagated by
 * pruning; normalized rows and auto-finished sessions go up as upserts.
 */
export async function repairAndPropagate(): Promise<Awaited<ReturnType<typeof repairData>>> {
  const report = await repairData();
  const changed =
    report.normalizedExercises > 0 ||
    report.removedOrphanExercises > 0 ||
    report.closedStaleSessions > 0;
  if (!changed || !enabled || !supabase || !currentUserId) return report;

  // Push only. Repair never deletes rows any more, so there is nothing to
  // prune — and pruning here previously propagated local deletions of sessions
  // whose sets simply had not been pulled yet.
  await pushTables(["exercises", "workoutSessions"]);
  return report;
}

/** Every session the account knows about, local + cloud, for recovery. */
export interface RemoteSessionRow {
  id: string;
  templateId: string;
  date: string;
  endedAt?: string;
  inLocal: boolean;
  cloudSetCount: number;
}

/**
 * Reads sessions straight from the cloud and reports which are missing
 * locally. Used by the recovery tool when workouts don't appear on the
 * calendar — the data is often still in Supabase.
 */
export async function fetchCloudSessions(): Promise<RemoteSessionRow[]> {
  if (!supabase || !currentUserId) return [];
  const [sessRes, setRes, localIds] = await Promise.all([
    supabase.from(REMOTE.workoutSessions).select("data").eq("user_id", currentUserId),
    supabase.from(REMOTE.setEntries).select("data").eq("user_id", currentUserId),
    db.workoutSessions.toCollection().primaryKeys(),
  ]);
  if (sessRes.error) throw sessRes.error;
  if (setRes.error) throw setRes.error;

  const localSet = new Set(localIds.map(String));
  const setCounts = new Map<string, number>();
  for (const r of setRes.data ?? []) {
    const s = (r as { data: { sessionId?: string } }).data;
    if (s?.sessionId) setCounts.set(s.sessionId, (setCounts.get(s.sessionId) ?? 0) + 1);
  }

  return (sessRes.data ?? [])
    .map((r) => (r as { data: Record<string, unknown> }).data)
    .map((s) => ({
      id: String(s.id),
      templateId: String(s.templateId ?? ""),
      date: String(s.date ?? ""),
      endedAt: s.endedAt ? String(s.endedAt) : undefined,
      inLocal: localSet.has(String(s.id)),
      cloudSetCount: setCounts.get(String(s.id)) ?? 0,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Pulls sessions + their sets back down from the cloud (restores missing ones). */
export async function restoreSessionsFromCloud(): Promise<number> {
  if (!supabase || !currentUserId) return 0;
  const [sessRes, setRes] = await Promise.all([
    supabase.from(REMOTE.workoutSessions).select("data").eq("user_id", currentUserId),
    supabase.from(REMOTE.setEntries).select("data").eq("user_id", currentUserId),
  ]);
  if (sessRes.error) throw sessRes.error;
  if (setRes.error) throw setRes.error;

  const sessions = (sessRes.data ?? []).map((r) => (r as { data: unknown }).data);
  const sets = (setRes.data ?? []).map((r) => (r as { data: unknown }).data);

  suspendCount++;
  try {
    await db.transaction("rw", [db.workoutSessions, db.setEntries], async () => {
      if (sessions.length) await db.workoutSessions.bulkPut(sessions as never[]);
      if (sets.length) await db.setEntries.bulkPut(sets as never[]);
    });
  } finally {
    suspendCount--;
  }
  return sessions.length;
}

// Stop syncing (on logout). Local cache is left intact and tagged to its owner;
// the auth gate hides app data until login regardless.
export function stopSync(): void {
  enabled = false;
  currentUserId = null;
  startGeneration++; // invalidate any in-flight startSync
  dirtyRows.clear();
  if (pushTimer) clearTimeout(pushTimer);
  setStatus({ state: "disabled", lastSyncedAt: status.lastSyncedAt });
}

// Manual full reconcile (Settings "Sync now"). Returns true on success.
export async function syncNow(): Promise<boolean> {
  if (!enabled || !supabase || !currentUserId) return false;
  setStatus({ state: "syncing", message: undefined });
  try {
    await retryPendingDeletes();
    await pushTables(BACKUP_TABLES);
    await pullTables(BACKUP_TABLES);
    setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), message: undefined });
    return true;
  } catch (e) {
    failStatus(e);
    return false;
  }
}

// Run a bulk local rewrite (e.g. backup import) without per-row sync traffic.
// Callers should follow up with reconcileAfterImport().
export async function withSyncPaused<T>(fn: () => Promise<T>): Promise<T> {
  suspendCount++;
  try {
    return await fn();
  } finally {
    suspendCount--;
  }
}

// One bounded reconcile after a program reseed. Only REFERENCE tables changed,
// so only they are pushed/pruned — log tables must never be pruned here (a
// device that hasn't pulled cloud history yet would delete it).
export async function reconcileAfterReseed(): Promise<boolean> {
  if (!enabled || !supabase || !currentUserId) return true; // local-only: nothing to do
  setStatus({ state: "syncing", message: undefined });
  try {
    await pushTables(REFERENCE_TABLES);
    await pruneCloudTables(REFERENCE_TABLES);
    setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), message: undefined });
    return true;
  } catch (e) {
    failStatus(e);
    return false;
  }
}

// One bounded reconcile after a backup import. `replace` also prunes cloud rows
// that the imported snapshot no longer contains — correct there, because the
// import rewrote every table.
export async function reconcileAfterImport(replace: boolean): Promise<boolean> {
  if (!enabled || !supabase || !currentUserId) return true; // local-only: nothing to do
  setStatus({ state: "syncing", message: undefined });
  try {
    await pushTables(BACKUP_TABLES);
    if (replace) await pruneCloudTables(BACKUP_TABLES);
    setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), message: undefined });
    return true;
  } catch (e) {
    failStatus(e);
    return false;
  }
}

// Explicit, user-requested total erase: cloud rows (when signed in) AND the
// sync bookkeeping. The caller deletes the local DB and reloads.
export async function eraseEverything(): Promise<{ cloudCleared: boolean }> {
  const userId = currentUserId;
  stopSync();
  let cloudCleared = false;
  if (isSupabaseConfigured && supabase && userId) {
    for (const t of BACKUP_TABLES) {
      const { error } = await supabase.from(REMOTE[t]).delete().eq("user_id", userId);
      if (error) throw error;
    }
    cloudCleared = true;
  }
  localStorage.removeItem(OWNER_KEY);
  return { cloudCleared };
}
