// Durable record of locally-deleted rows.
//
// Why this exists: pulls are additive (they must never delete local-only data),
// so "row is absent from the cloud" can no longer mean "deleted". Without a
// record, a deletion whose remote call was dropped — offline, or fired while a
// pull/repair had sync suspended — would be undone by the next pull.
//
// A tombstone means "deleted on this device and not re-created since". It is
// kept for the whole retention window, NOT cleared when the cloud confirms the
// delete: a full push that read the row just before the delete, or another
// device that still holds it, can put the row back in the cloud afterwards, and
// the tombstone is what stops the next pull from restoring it. Confirmation only
// stops the delete from being re-sent on every flush.
//
// Tombstones are kept in localStorage rather than a Dexie table because they
// are written from inside Dexie's `deleting` hook, which runs in a transaction
// that only covers the tables being modified.

const KEY = "gym-tracker.tombstones";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

interface Entry {
  at: string; // ISO time of the local delete
  confirmed?: boolean; // the cloud delete succeeded at least once
}

type Store = Record<string, Entry>; // "table:id" -> entry

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

// Stores written before confirmation existed map key -> ISO string; those
// entries read back as unconfirmed.
function parse(raw: string | null): Store {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out: Store = {};
    for (const [k, v] of Object.entries(obj ?? {})) {
      if (typeof v === "string") {
        out[k] = { at: v };
      } else if (v && typeof v === "object" && typeof (v as Entry).at === "string") {
        const e = v as Entry;
        out[k] = e.confirmed ? { at: e.at, confirmed: true } : { at: e.at };
      }
    }
    return out;
  } catch {
    return {};
  }
}

// In-memory copy: the creating hook consults it for every row a pull writes, so
// it must not re-parse localStorage each time. Another tab's write invalidates it.
let cache: Store | null = null;
let pending: Store | null = null; // latest store waiting to be written

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === null) cache = null;
  });
}

function load(): Store {
  if (!cache) cache = parse(storage()?.getItem(KEY) ?? null);
  return cache;
}

function persist() {
  const store = pending;
  pending = null;
  if (!store) return;
  try {
    storage()?.setItem(KEY, JSON.stringify(store));
  } catch {
    /* best effort */
  }
}

// A clear() fires the deleting hook once per row; coalescing the writes into one
// microtask keeps a bulk wipe from re-serializing the whole store per row.
function save(store: Store) {
  cache = store;
  const scheduled = pending !== null;
  pending = store;
  if (scheduled) return;
  if (typeof queueMicrotask === "function") queueMicrotask(persist);
  else persist();
}

const key = (table: string, id: string) => `${table}:${id}`;

/** Test hook: forget the in-memory copy so the next read comes from storage. */
export function resetTombstoneCache(): void {
  cache = null;
  pending = null;
}

/** Record a deletion. Always called, even when sync is off or suspended. */
export function addTombstone(table: string, id: string): void {
  const store = load();
  store[key(table, id)] = { at: new Date().toISOString() };
  save(store);
}

export function hasTombstone(table: string, id: string): boolean {
  return key(table, id) in load();
}

/** All tombstones for a table (confirmed or not), as a Set of row ids. */
export function tombstonedIds(table: string): Set<string> {
  const prefix = `${table}:`;
  return new Set(
    Object.keys(load())
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
  );
}

/** Tombstones whose cloud delete has not succeeded yet. */
export function unconfirmedTombstoneIds(table: string): Set<string> {
  const prefix = `${table}:`;
  return new Set(
    Object.entries(load())
      .filter(([k, e]) => k.startsWith(prefix) && !e.confirmed)
      .map(([k]) => k.slice(prefix.length))
  );
}

export function hasUnconfirmedTombstones(): boolean {
  return Object.values(load()).some((e) => !e.confirmed);
}

/** The cloud no longer holds these rows — stop re-sending the delete, keep the record. */
export function confirmTombstones(table: string, ids: Iterable<string>): void {
  const store = load();
  let changed = false;
  for (const id of ids) {
    const e = store[key(table, id)];
    if (e && !e.confirmed) {
      store[key(table, id)] = { at: e.at, confirmed: true };
      changed = true;
    }
  }
  if (changed) save(store);
}

/** Forget one tombstone — the row exists locally again. */
export function clearTombstone(table: string, id: string): void {
  const store = load();
  const k = key(table, id);
  if (!(k in store)) return;
  delete store[k];
  save(store);
}

/** Forget every tombstone (account switch, erase-everything). */
export function clearAllTombstones(): void {
  save({});
}

/** Drop tombstones older than the retention window. */
export function pruneTombstones(now = Date.now()): void {
  const store = load();
  const cutoff = now - MAX_AGE_MS;
  let changed = false;
  for (const [k, e] of Object.entries(store)) {
    if (new Date(e.at).getTime() < cutoff) {
      delete store[k];
      changed = true;
    }
  }
  if (changed) save(store);
}

export function tombstoneCount(): number {
  return Object.keys(load()).length;
}
