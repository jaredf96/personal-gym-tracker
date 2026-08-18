import { describe, it, expect } from "vitest";
import { isLegacyExercise, normalizeExercise, muscleLabel } from "../normalize";

// The exact v1 row shape that survived in the wild and crashed the UI.
const V1_ROW = {
  id: "incline-db-press",
  name: "Incline DB Press",
  primaryMuscle: "Chest",
  secondaryMuscles: ["Front delts", "triceps"],
  equipment: "Dumbbell",
  movementPattern: "Press",
  defaultRepMin: 6,
  defaultRepMax: 10,
  defaultRestSeconds: 150,
  progressionRule: "Double Progression",
};

describe("legacy exercise detection", () => {
  it("flags v1 rows and accepts current rows", () => {
    expect(isLegacyExercise(V1_ROW)).toBe(true);
    expect(isLegacyExercise(null)).toBe(true);
    expect(
      isLegacyExercise({
        id: "x",
        name: "X",
        type: "compound",
        primaryMuscles: ["chest"],
        secondaryMuscles: [],
        volumeMuscles: ["chest"],
      })
    ).toBe(false);
  });
});

describe("normalizeExercise", () => {
  it("migrates a v1 row into the current shape", () => {
    const e = normalizeExercise(V1_ROW);
    expect(e.primaryMuscles).toEqual(["Chest"]);
    expect(e.volumeMuscles).toEqual(["chest"]); // mapped to the canonical target key
    expect(e.type).toBe("compound");
    expect(e.defaultRestMin).toBe(150);
    expect(e.defaultRestMax).toBe(150);
    expect(e.perSide).toBe(false);
    expect(Array.isArray(e.secondaryVolumeMuscles)).toBe(true);
  });

  it("never throws on garbage and always yields renderable arrays", () => {
    for (const bad of [null, undefined, {}, { id: 5 }, { primaryMuscles: "chest" }]) {
      const e = normalizeExercise(bad);
      expect(Array.isArray(e.primaryMuscles)).toBe(true);
      expect(Array.isArray(e.volumeMuscles)).toBe(true);
      expect(typeof e.name).toBe("string");
      // These are the exact calls that produced blank screens.
      expect(() => e.primaryMuscles.join("/")).not.toThrow();
      expect(() => e.volumeMuscles.some(() => true)).not.toThrow();
    }
  });

  it("preserves an already-current row unchanged in the fields the UI reads", () => {
    const current = {
      id: "bss",
      name: "Bulgarian Split Squat",
      type: "compound",
      primaryMuscles: ["quads", "glutes"],
      secondaryMuscles: ["hamstrings"],
      volumeMuscles: ["quads", "glutes"],
      secondaryVolumeMuscles: [],
      movementPattern: "Squat/Knee",
      defaultRepMin: 8,
      defaultRepMax: 12,
      perSide: true,
      defaultRestMin: 120,
      defaultRestMax: 180,
      rirTarget: "1-2",
      defaultWarmupSets: 1,
      progressionRule: "Double Progression",
    };
    expect(normalizeExercise(current)).toMatchObject({
      primaryMuscles: ["quads", "glutes"],
      volumeMuscles: ["quads", "glutes"],
      perSide: true,
      type: "compound",
    });
  });
});

describe("muscleLabel", () => {
  it("renders a dash instead of crashing on missing muscles", () => {
    expect(muscleLabel({ name: "X", primaryMuscles: ["chest", "triceps"] })).toBe("chest / triceps");
    expect(muscleLabel({ name: "X" } as never)).toBe("—");
  });
});
