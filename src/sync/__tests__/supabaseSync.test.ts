import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Behavior of the cloud-delete path in supabaseSync, end to end: an in-memory
// stand-in for the Dexie tables (running the hooks sync installs), a Supabase
// query builder that records uploads and can hold a delete in flight, and stubs
// for seeding and snapshots. Every cloud read comes back empty, so startSync
// takes the brand-new-account path.

type Row = { id: string };
type Hook = (primKey: unknown) => void;
interface Upload {
  table: string;
  userId: unknown;
  id: unknown;
}
interface Builder {
  select(): Builder;
  eq(): Builder;
  in(): Builder;
  maybeSingle(): Builder;
  upsert(payload: { user_id: unknown; id: unknown }[]): Builder;
  delete(): Builder;
  then(onOk: (result: unknown) => unknown, onErr?: (e: unknown) => unknown): Promise<unknown>;
}

const fake = vi.hoisted(() => ({
  tables: new Map<string, Map<string, Row>>(),
  hooks: new Map<string, { creating?: Hook; deleting?: Hook }>(),
  uploads: [] as Upload[],
  holdDeletes: false,
  heldDeletes: [] as (() => void)[],
  snapshotGate: null as Promise<void> | null,
}));

function rows(table: string): Map<string, Row> {
  let t = fake.tables.get(table);
  if (!t) fake.tables.set(table, (t = new Map()));
  return t;
}

vi.mock("../../lib/supabase", () => {
  function from(table: string): Builder {
    let op: "read" | "upsert" | "delete" = "read";
    let payload: { user_id: unknown; id: unknown }[] = [];
    const builder: Builder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      upsert: (p) => {
        op = "upsert";
        payload = p;
        return builder;
      },
      delete: () => {
        op = "delete";
        return builder;
      },
      then: (onOk, onErr) => {
        if (op === "upsert") {
          fake.uploads.push(...payload.map((r) => ({ table, userId: r.user_id, id: r.id })));
        }
        if (op === "delete" && fake.holdDeletes) {
          return new Promise((resolve) => fake.heldDeletes.push(() => resolve({ error: null }))).then(
            onOk,
            onErr
          );
        }
        return Promise.resolve({ data: null, error: null, count: 0 }).then(onOk, onErr);
      },
    };
    return builder;
  }
  return { supabase: { from }, isSupabaseConfigured: true };
});

vi.mock("../../db/db", () => {
  const BACKUP_TABLES = [
    "exercises",
    "workoutTemplates",
    "templateExercises",
    "workoutSessions",
    "setEntries",
    "cardioLogs",
    "bodyMetrics",
    "readinessLogs",
    "settings",
    "aiReports",
    "volumeTargets",
    "progressionRules",
    "weeklySchedule",
    "programMeta",
  ];
  const REFERENCE_TABLES = [
    "exercises",
    "workoutTemplates",
    "templateExercises",
    "volumeTargets",
    "progressionRules",
    "weeklySchedule",
    "programMeta",
  ];
  const LOG_TABLES = BACKUP_TABLES.filter((t) => !REFERENCE_TABLES.includes(t));
  const table = (name: string) => ({
    hook: (event: string, fn: Hook) => {
      fake.hooks.set(name, { ...fake.hooks.get(name), [event]: fn });
    },
    bulkGet: async (ids: string[]) => ids.map((id) => rows(name).get(id)),
    toArray: async () => [...rows(name).values()],
    toCollection: () => ({ primaryKeys: async () => [...rows(name).keys()] }),
    bulkPut: async (list: Row[]) => list.forEach((r) => rows(name).set(r.id, r)),
    clear: async () => {
      // Dexie runs the deleting hook for every row a clear() removes.
      for (const id of [...rows(name).keys()]) fake.hooks.get(name)?.deleting?.(id);
      rows(name).clear();
    },
  });
  const db = { tables: [], table, transaction: async (_m: string, _t: unknown, fn: () => Promise<void>) => fn() };
  return { db, BACKUP_TABLES, REFERENCE_TABLES, LOG_TABLES };
});

vi.mock("../../db/seedRunner", () => ({
  SEED_VERSION: "test",
  ensureSeeded: async () => {},
  reseedProgramData: async () => {},
  repairData: async () => ({ normalizedExercises: 0, removedOrphanExercises: 0, closedStaleSessions: 0 }),
}));

vi.mock("../../db/snapshot", () => ({
  takeSnapshot: async () => {
    if (fake.snapshotGate) await fake.snapshotGate;
  },
}));

let sync: typeof import("../supabaseSync");

beforeEach(async () => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
  fake.tables.clear();
  fake.hooks.clear();
  fake.uploads.length = 0;
  fake.holdDeletes = false;
  fake.heldDeletes.length = 0;
  fake.snapshotGate = null;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.resetModules(); // fresh sync + tombstone state per test
  sync = await import("../supabaseSync");
});

afterEach(() => {
  sync.stopSync();
  vi.useRealTimers();
});

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

// Past the flush debounce, then let the flush finish.
async function flush() {
  await vi.advanceTimersByTimeAsync(1500);
  await settle();
}

// The held cloud deletes come back successful.
async function landDeletes() {
  fake.heldDeletes.splice(0).forEach((resolve) => resolve());
  await settle();
}

function localDelete(table: string, id: string) {
  fake.hooks.get(table)?.deleting?.(id);
  rows(table).delete(id);
}

function localCreate(table: string, row: Row) {
  rows(table).set(row.id, row);
  fake.hooks.get(table)?.creating?.(row.id);
}

// Signed in as user A, set-1 deleted (its cloud delete held in flight) and
// re-created, and the re-upload already sent — ahead of the delete.
async function recreatedWhileDeleteInFlight() {
  rows("setEntries").set("set-1", { id: "set-1" });
  await sync.startSync("user-a");
  fake.holdDeletes = true;
  localDelete("setEntries", "set-1");
  localCreate("setEntries", { id: "set-1" });
  await flush();
  expect(fake.uploads.at(-1)).toEqual({ table: "set_entries", userId: "user-a", id: "set-1" });
  fake.uploads.length = 0;
}

describe("a cloud delete that lands after its row was re-created", () => {
  it("uploads the row again, so the cloud doesn't lose it", async () => {
    await recreatedWhileDeleteInFlight();
    await landDeletes();
    await flush();
    expect(fake.uploads).toEqual([{ table: "set_entries", userId: "user-a", id: "set-1" }]);
  });

  it("REGRESSION: queues nothing once another account has started syncing", async () => {
    await recreatedWhileDeleteInFlight();
    sync.stopSync(); // A signs out with the delete still in flight
    let openSnapshot!: () => void;
    fake.snapshotGate = new Promise<void>((resolve) => (openSnapshot = resolve));
    const startB = sync.startSync("user-b"); // B signs in; A's cache isn't cleared yet
    await landDeletes();
    await flush();
    expect(fake.uploads).toEqual([]);

    openSnapshot();
    await startB;
    await flush();
    expect(fake.uploads.filter((u) => u.id === "set-1")).toEqual([]);
  });

  it("REGRESSION: queues nothing when the sender is back but the local data is still another account's", async () => {
    await recreatedWhileDeleteInFlight();
    sync.stopSync();
    await sync.startSync("user-b"); // B signs in and syncs: A's data cleared, B owns the cache
    localCreate("setEntries", { id: "set-1" }); // B holds a row with the same id (same backup imported)
    await flush();
    sync.stopSync();
    let openSnapshot!: () => void;
    fake.snapshotGate = new Promise<void>((resolve) => (openSnapshot = resolve));
    const startA = sync.startSync("user-a"); // A is back; B's data isn't cleared yet
    fake.uploads.length = 0;
    await landDeletes(); // A's delete from before both switches lands only now
    await flush();
    expect(fake.uploads).toEqual([]);

    openSnapshot();
    await startA;
  });
});
