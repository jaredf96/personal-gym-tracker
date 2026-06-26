import { db, BACKUP_TABLES, type BackupTableName } from "../db/db";
import { ensureSeeded, didUpgradeProgram } from "../db/seedRunner";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// ===========================================================================
// Per-user cloud sync.
//
// Model: Dexie stays the local working store (the engine/repo/screens are
// untouched). Once signed in, Supabase is the per-user source of truth and Dexie
// is a synced cache. Each Dexie table maps to a thin Supabase table shaped
// (user_id, id, data jsonb, updated_at) protected by RLS (user_id = auth.uid()).
//
// Writes are captured with Dexie table hooks (no repo changes needed):
//   - create/update  -> debounced upsert of the changed table
//   - delete         -> immediate remote delete by id
// Reconciliation on login uses a local "owner" marker so pre-auth data is
// preserved (adopted) and one user never sees another user's local cache.
//
// Known MVP limit: conflict resolution is last-write-wins (single-device
// oriented). Offline deletes may not propagate; a manual "Sync now" re-uploads.
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
  personalNotes: "personal_notes",
  settings: "settings",
  aiReports: "ai_reports",
  swapGroups: "swap_groups",
  volumeTargets: "volume_targets",
  progressionRules: "progression_rules",
  weeklySchedule: "weekly_schedule",
  programMeta: "program_meta",
};

// Primary-key field per Dexie table (defaults to "id"). The remote `id` column
// always stores the string form of this key.
const KEY_FIELD: Partial<Record<BackupTableName, string>> = {
  volumeTargets: "muscle",
  progressionRules: "rule",
};
function keyField(t: BackupTableName): string {
  return KEY_FIELD[t] ?? "id";
}

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

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
let currentUserId: string | null = null;
let enabled = false; // true only while a user is signed in
let suspended = false; // true while we write cloud->local (prevents echo)
let hooksInstalled = false;
let startGeneration = 0; // guards against overlapping start() calls (StrictMode)
const dirty = new Set<BackupTableName>();
let pushTimer: ReturnType<typeof setTimeout> | undefined;

// ---------------------------------------------------------------------------
// Dexie change capture
// ---------------------------------------------------------------------------
function installHooks() {
  if (hooksInstalled) return;
  for (const t of BACKUP_TABLES) {
    const table = db.table(t);
    table.hook("creating", () => {
      onLocalWrite(t);
    });
    table.hook("updating", () => {
      onLocalWrite(t);
    });
    table.hook("deleting", (primKey) => {
      onLocalDelete(t, primKey);
    });
  }
  hooksInstalled = true;
}

function onLocalWrite(t: BackupTableName) {
  if (!enabled || suspended) return;
  dirty.add(t);
  scheduleFlush();
}

function onLocalDelete(t: BackupTableName, primKey: unknown) {
  if (!enabled || suspended || !supabase || !currentUserId) return;
  void supabase
    .from(REMOTE[t])
    .delete()
    .eq("user_id", currentUserId)
    .eq("id", String(primKey))
    .then(({ error }) => {
      if (error) setStatus({ state: "error", message: errMessage(error) });
    });
}

function scheduleFlush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void flushDirty(), 1500);
}

async function flushDirty() {
  if (!enabled || !supabase || !currentUserId || dirty.size === 0) return;
  const tables = [...dirty];
  dirty.clear();
  setStatus({ state: "syncing" });
  try {
    for (const t of tables) await upsertTable(t);
    setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), message: undefined });
  } catch (e) {
    tables.forEach((t) => dirty.add(t)); // retry on next change / manual sync
    setStatus({ state: navigator.onLine ? "error" : "offline", message: errMessage(e) });
  }
}

// ---------------------------------------------------------------------------
// Push / pull primitives
// ---------------------------------------------------------------------------
async function upsertTable(t: BackupTableName) {
  if (!supabase || !currentUserId) return;
  const rows = await db.table(t).toArray();
  if (rows.length === 0) return;
  const kf = keyField(t);
  const payload = rows.map((r) => ({
    user_id: currentUserId,
    id: String((r as Record<string, unknown>)[kf]),
    data: r,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from(REMOTE[t]).upsert(payload, { onConflict: "user_id,id" });
  if (error) throw error;
}

export async function pushSnapshot() {
  for (const t of BACKUP_TABLES) await upsertTable(t);
}

async function pullSnapshot() {
  if (!supabase || !currentUserId) return;
  suspended = true;
  try {
    for (const t of BACKUP_TABLES) {
      const { data, error } = await supabase
        .from(REMOTE[t])
        .select("data")
        .eq("user_id", currentUserId);
      if (error) throw error;
      const rows = (data ?? []).map((r) => (r as { data: unknown }).data);
      await db.table(t).clear();
      if (rows.length) await db.table(t).bulkPut(rows as never[]);
    }
  } finally {
    suspended = false;
  }
}

async function clearLocal() {
  suspended = true;
  try {
    for (const t of BACKUP_TABLES) await db.table(t).clear();
  } finally {
    suspended = false;
  }
}

// Delete every cloud row for this user across all tables. Used when the seeded
// program version changes so stale rows from the old program can't be pulled back.
async function resetCloud(userId: string) {
  if (!supabase) return;
  for (const t of BACKUP_TABLES) {
    const { error } = await supabase.from(REMOTE[t]).delete().eq("user_id", userId);
    if (error) throw error;
  }
}

async function cloudHasData(userId: string): Promise<boolean> {
  if (!supabase) return false;
  // `exercises` always exists for a synced user (seeded). A brand-new user has none.
  const { count, error } = await supabase
    .from(REMOTE.exercises)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

// Begin syncing for a signed-in user. Reconciles local vs cloud, then keeps the
// cloud updated via hooks. Safe to call repeatedly with the same user.
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
    // Program upgrade this launch: local was already wiped + reseeded to the new
    // program. Purge the stale cloud copy and push the fresh seed (no pull-back).
    if (didUpgradeProgram()) {
      await resetCloud(userId);
      await pushSnapshot();
      localStorage.setItem(OWNER_KEY, userId);
      if (gen !== startGeneration) return;
      setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), message: undefined });
      return;
    }

    let owner = localStorage.getItem(OWNER_KEY);

    // A different user's cache must not be visible — wipe it first.
    if (owner && owner !== userId) {
      await clearLocal();
      localStorage.removeItem(OWNER_KEY);
      owner = null;
    }

    if (!owner) {
      // Local belongs to nobody: either pre-auth data to adopt, or freshly cleared.
      if (await cloudHasData(userId)) {
        await pullSnapshot();
      } else {
        await ensureSeeded(); // guarantee local has at least the seed
        await pushSnapshot(); // adopt pre-auth data / seed -> cloud
      }
      localStorage.setItem(OWNER_KEY, userId);
    } else {
      // Returning user on this device: flush local changes, then pull merged cloud.
      await ensureSeeded();
      await pushSnapshot();
      await pullSnapshot();
    }

    if (gen !== startGeneration) return; // superseded by a newer start()
    setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), message: undefined });
  } catch (e) {
    setStatus({ state: navigator.onLine ? "error" : "offline", message: errMessage(e) });
  }
}

// Stop syncing (on logout). Local cache is left intact and tagged to its owner,
// so it is reused if the same user signs back in and replaced only if a
// different user signs in. The auth gate hides app data until login regardless.
export function stopSync(): void {
  enabled = false;
  currentUserId = null;
  dirty.clear();
  if (pushTimer) clearTimeout(pushTimer);
  setStatus({ state: "disabled", lastSyncedAt: status.lastSyncedAt });
}

// Manual full reconcile from the Settings screen.
export async function syncNow(): Promise<void> {
  if (!enabled || !supabase || !currentUserId) return;
  setStatus({ state: "syncing", message: undefined });
  try {
    await pushSnapshot();
    await pullSnapshot();
    setStatus({ state: "idle", lastSyncedAt: new Date().toISOString(), message: undefined });
  } catch (e) {
    setStatus({ state: navigator.onLine ? "error" : "offline", message: errMessage(e) });
  }
}
