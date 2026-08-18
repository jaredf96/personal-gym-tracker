import { describe, it, expect } from "vitest";
import { isLegacyExercise, normalizeExercise } from "../normalize";

// Models the actual failure: repair cleans local, then a cloud pull re-imports
// the untouched legacy rows. The fix must ALSO clean the cloud side.
type Row = Record<string, unknown>;

const V1 = (id: string): Row => ({
  id, name: id, primaryMuscle: "Chest", secondaryMuscles: [],
  movementPattern: "Press", defaultRepMin: 6, defaultRepMax: 10,
  defaultRestSeconds: 150, progressionRule: "Double Progression",
});

function repairLocal(local: Row[], loggedIds: Set<string>) {
  const kept: Row[] = [], dropped: string[] = [];
  for (const r of local) {
    if (!isLegacyExercise(r)) { kept.push(r); continue; }
    if (loggedIds.has(r.id as string)) kept.push(normalizeExercise(r) as unknown as Row);
    else dropped.push(r.id as string);
  }
  return { kept, dropped };
}

// pull = cloud wins for rows the local side no longer has
function pull(local: Row[], cloud: Row[]) {
  const byId = new Map(local.map((r) => [r.id, r]));
  for (const c of cloud) byId.set(c.id, c);
  return [...byId.values()];
}

describe("repair survives a cloud round-trip", () => {
  const logged = new Set(["kept-legacy"]);

  it("REGRESSION: local-only repair is undone by the next pull", () => {
    let cloud = [V1("kept-legacy"), V1("orphan-1"), V1("orphan-2")];
    const { kept } = repairLocal([...cloud], logged);
    // cloud untouched -> pull restores every legacy row
    const after = pull(kept, cloud);
    expect(after.filter(isLegacyExercise).length).toBe(3);
  });

  it("FIX: propagating the repair to the cloud makes it stick", () => {
    let cloud = [V1("kept-legacy"), V1("orphan-1"), V1("orphan-2")];
    const { kept, dropped } = repairLocal([...cloud], logged);
    // push normalized rows + prune dropped ids from the cloud
    const keptById = new Map(kept.map((r) => [r.id, r]));
    cloud = cloud
      .filter((c) => !dropped.includes(c.id as string))
      .map((c) => keptById.get(c.id) ?? c);
    const after = pull(kept, cloud);
    expect(after.filter(isLegacyExercise).length).toBe(0);
    expect(after.map((r) => r.id)).toEqual(["kept-legacy"]); // history preserved
  });
});
