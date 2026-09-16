import { describe, it, expect, beforeEach } from "vitest";
import {
  addTombstone,
  clearAllTombstones,
  clearTombstone,
  confirmTombstones,
  hasTombstone,
  hasUnconfirmedTombstones,
  pruneTombstones,
  resetTombstoneCache,
  tombstonedIds,
  tombstoneCount,
  unconfirmedTombstoneIds,
} from "../tombstones";

const KEY = "gym-tracker.tombstones";

// Minimal localStorage for the node test environment.
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
  resetTombstoneCache();
});

// Writes are coalesced into a microtask; let it run before reading storage.
const flushWrites = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("tombstones", () => {
  it("records, reports, and clears deletions", () => {
    addTombstone("workoutSessions", "s1");
    expect(hasTombstone("workoutSessions", "s1")).toBe(true);
    expect(tombstonedIds("workoutSessions")).toEqual(new Set(["s1"]));
    expect(hasTombstone("setEntries", "s1")).toBe(false); // namespaced per table
    clearTombstone("workoutSessions", "s1");
    expect(hasTombstone("workoutSessions", "s1")).toBe(false);
    expect(tombstoneCount()).toBe(0);
  });

  it("survives ids containing separators", () => {
    addTombstone("setEntries", "set-abc:123");
    expect(tombstonedIds("setEntries").has("set-abc:123")).toBe(true);
  });

  it("a confirmed cloud delete keeps the record but stops the retries", () => {
    addTombstone("workoutSessions", "s1");
    expect(unconfirmedTombstoneIds("workoutSessions")).toEqual(new Set(["s1"]));
    expect(hasUnconfirmedTombstones()).toBe(true);

    confirmTombstones("workoutSessions", ["s1"]);
    expect(tombstonedIds("workoutSessions")).toEqual(new Set(["s1"])); // still blocks restores
    expect(unconfirmedTombstoneIds("workoutSessions").size).toBe(0);
    expect(hasUnconfirmedTombstones()).toBe(false);
  });

  it("persists confirmation across a reload", async () => {
    addTombstone("workoutSessions", "s1");
    confirmTombstones("workoutSessions", ["s1"]);
    await flushWrites();
    resetTombstoneCache(); // what a page reload does to the in-memory copy
    expect(hasTombstone("workoutSessions", "s1")).toBe(true);
    expect(hasUnconfirmedTombstones()).toBe(false);
  });

  it("reads stores written before confirmation existed as unconfirmed", () => {
    localStorage.setItem(KEY, JSON.stringify({ "workoutSessions:s625": "2026-09-01T12:00:00.000Z" }));
    resetTombstoneCache();
    expect(tombstonedIds("workoutSessions")).toEqual(new Set(["s625"]));
    expect(unconfirmedTombstoneIds("workoutSessions")).toEqual(new Set(["s625"]));
  });

  it("prunes tombstones past the 90-day window only", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        "workoutSessions:old": { at: "2026-05-01T12:00:00.000Z", confirmed: true },
        "workoutSessions:recent": { at: "2026-09-01T12:00:00.000Z", confirmed: true },
      })
    );
    resetTombstoneCache();
    pruneTombstones(new Date("2026-09-16T12:00:00.000Z").getTime());
    expect(tombstonedIds("workoutSessions")).toEqual(new Set(["recent"]));
  });

  it("clearAllTombstones forgets everything", async () => {
    addTombstone("workoutSessions", "s1");
    addTombstone("setEntries", "x1");
    clearAllTombstones();
    await flushWrites();
    resetTombstoneCache();
    expect(tombstoneCount()).toBe(0);
  });
});

// The exact failure the user reported: a session deleted locally reappeared
// because the remote delete was dropped and the pull is additive.
describe("additive pull + tombstones", () => {
  const cloudRows = [{ id: "s1" }, { id: "s2" }];

  function pull(local: { id: string }[], cloud: { id: string }[], table: string) {
    const deleted = tombstonedIds(table);
    const byId = new Map(local.map((r) => [r.id, r]));
    for (const c of cloud) {
      if (deleted.has(c.id)) continue; // tombstoned — must not come back
      byId.set(c.id, c);
    }
    return [...byId.values()];
  }

  it("REGRESSION: without a tombstone the deleted row is resurrected", () => {
    const local = [{ id: "s2" }]; // s1 deleted locally, remote delete lost
    expect(pull(local, cloudRows, "workoutSessions").map((r) => r.id)).toEqual(["s2", "s1"]);
  });

  it("FIX: a tombstoned row stays deleted across pulls", () => {
    addTombstone("workoutSessions", "s1");
    const local = [{ id: "s2" }];
    expect(pull(local, cloudRows, "workoutSessions").map((r) => r.id)).toEqual(["s2"]);
  });

  it("rows that were never deleted still sync down normally", () => {
    const local: { id: string }[] = [];
    expect(pull(local, cloudRows, "workoutSessions").map((r) => r.id)).toEqual(["s1", "s2"]);
  });
});
