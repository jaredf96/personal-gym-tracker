import { describe, it, expect, beforeEach } from "vitest";
import { ownsLocalCache, planPull, withoutDeleted } from "../syncPlan";
import {
  addTombstone,
  clearTombstone,
  confirmTombstones,
  resetTombstoneCache,
  tombstonedIds,
} from "../../db/tombstones";

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

type Row = { id: string };
const idOf = (r: Row) => r.id;
const T = "workoutSessions";

function pull(cloud: Row[], local: string[], touched: string[] = []) {
  return planPull(cloud, idOf, {
    tombstoned: tombstonedIds(T),
    localIds: new Set(local),
    touchedSincePull: (id) => touched.includes(id),
  });
}

describe("pull planning", () => {
  it("REGRESSION (the Jun 25 session): a confirmed delete stays deleted when the cloud gets the row back", () => {
    // Discarded on this device; the cloud delete succeeded.
    addTombstone(T, "s625");
    confirmTombstones(T, ["s625"]);
    // A push that raced the delete, or another device, re-uploaded it.
    const plan = pull([{ id: "s625" }, { id: "s2" }], ["s2"]);
    expect(plan.toPut.map(idOf)).toEqual(["s2"]);
    expect(plan.redelete).toEqual(["s625"]);
  });

  it("why the tombstone must outlive the cloud delete: once cleared, the row is restored", () => {
    addTombstone(T, "s625");
    clearTombstone(T, "s625"); // the old behavior on a successful remote delete
    const plan = pull([{ id: "s625" }], []);
    expect(plan.toPut.map(idOf)).toEqual(["s625"]);
    expect(plan.redelete).toEqual([]);
  });

  it("a stale tombstone never deletes a row that exists locally", () => {
    addTombstone(T, "s3");
    const plan = pull([{ id: "s3" }], ["s3"]);
    expect(plan.toPut).toEqual([]);
    expect(plan.redelete).toEqual([]);
  });

  it("rows written locally while the pull was in flight keep the local version", () => {
    const plan = pull([{ id: "s4" }, { id: "s5" }], ["s4"], ["s4"]);
    expect(plan.toPut.map(idOf)).toEqual(["s5"]);
  });

  it("never-deleted rows sync down normally", () => {
    const plan = pull([{ id: "a" }, { id: "b" }], []);
    expect(plan.toPut.map(idOf)).toEqual(["a", "b"]);
    expect(plan.redelete).toEqual([]);
  });
});

describe("push filtering", () => {
  it("drops a row deleted after the table was read, keeps the rest", () => {
    const readBeforeDelete = [{ id: "s625" }, { id: "s2" }];
    addTombstone(T, "s625");
    expect(withoutDeleted(readBeforeDelete, idOf, tombstonedIds(T)).map(idOf)).toEqual(["s2"]);
  });

  it("a row re-created locally (import, restore) uploads again", () => {
    addTombstone(T, "s7");
    clearTombstone(T, "s7"); // what the creating hook does
    expect(withoutDeleted([{ id: "s7" }], idOf, tombstonedIds(T)).map(idOf)).toEqual(["s7"]);
    expect(pull([{ id: "s7" }], []).toPut.map(idOf)).toEqual(["s7"]);
  });
});

describe("local cache ownership", () => {
  it("REGRESSION: another account's cache (and its unsent deletes) is not this user's", () => {
    expect(ownsLocalCache("user-a", "user-b")).toBe(false);
  });

  it("the same account, or data from before any sign-in, is", () => {
    expect(ownsLocalCache("user-b", "user-b")).toBe(true);
    expect(ownsLocalCache(null, "user-b")).toBe(true);
  });
});
