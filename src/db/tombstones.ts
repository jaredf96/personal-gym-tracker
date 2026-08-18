// Durable record of locally-deleted rows.
//
// Why this exists: pulls are additive (they must never delete local-only data),
// so "row is absent from the cloud" can no longer mean "deleted". Without a
// record, a deletion whose remote call was dropped — offline, or fired while a
// pull/repair had sync suspended — would be undone by the next pull.
//
// Tombstones are kept in localStorage rather than a Dexie table because they
// are written from inside Dexie's `deleting` hook, which runs in a transaction
// that only covers the tables being modified.

const KEY = "gym-tracker.tombstones";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

type Store = Record<string, string>; // "table:id" -> ISO deletedAt

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* best effort */
  }
}

const key = (table: string, id: string) => `${table}:${id}`;

/** Record a deletion. Always called, even when sync is off or suspended. */
export function addTombstone(table: string, id: string): void {
  const store = load();
  store[key(table, id)] = new Date().toISOString();
  save(store);
}

export function hasTombstone(table: string, id: string): boolean {
  return key(table, id) in load();
}

/** All tombstones for a table, as a Set of row ids. */
export function tombstonedIds(table: string): Set<string> {
  const prefix = `${table}:`;
  return new Set(
    Object.keys(load())
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
  );
}

/** Clear one tombstone — used once the cloud confirms the row is gone. */
export function clearTombstone(table: string, id: string): void {
  const store = load();
  delete store[key(table, id)];
  save(store);
}

/** Drop tombstones older than the retention window. */
export function pruneTombstones(): void {
  const store = load();
  const cutoff = Date.now() - MAX_AGE_MS;
  let changed = false;
  for (const [k, ts] of Object.entries(store)) {
    if (new Date(ts).getTime() < cutoff) {
      delete store[k];
      changed = true;
    }
  }
  if (changed) save(store);
}

export function tombstoneCount(): number {
  return Object.keys(load()).length;
}
