import { describe, it, expect, beforeEach } from "vitest";
import {
  addTombstone,
  clearTombstone,
  hasTombstone,
  tombstonedIds,
  tombstoneCount,
} from "../tombstones";

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
});

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
