import { describe, it, expect } from "vitest";
import { SEED_VERSION, seedExercises, seedProgramMeta, seedTemplateExercises } from "../seed";

// Guards the generated program data (rewritten by scripts/gen_program.py) where
// getting it wrong would silently detach logged history from an exercise.

const byId = new Map(seedExercises.map((e) => [e.id, e]));
const slot = (id: string) => seedTemplateExercises.find((t) => t.id === id);

describe("the split squat slots", () => {
  it("keep each slot's exercise id, so its logged history follows it", () => {
    expect(byId.get("hack-squat-or-high-bar-squat")?.name).toBe("High-Bar Squat");
    expect(byId.get("squat-hack-squat-or-leg-press")?.name).toBe("Leg Press (Heavy)");
    expect(byId.get("hack-squat")?.name).toBe("Hack Squat"); // new variant, no history
    expect(byId.get("leg-press")?.name).toBe("Leg Press"); // Lower A's lighter slot, untouched
  });

  it("offer the other variants, and only those", () => {
    expect(slot("lower-a:1")?.exerciseId).toBe("hack-squat-or-high-bar-squat");
    expect(slot("lower-a:1")?.alternativeExerciseIds).toEqual(["hack-squat"]);
    expect(slot("lower-b:1")?.exerciseId).toBe("squat-hack-squat-or-leg-press");
    expect(slot("lower-b:1")?.alternativeExerciseIds).toEqual([
      "hack-squat-or-high-bar-squat",
      "hack-squat",
    ]);
  });
});

describe("the generated program", () => {
  it("names only exercises that exist as slot alternatives", () => {
    for (const te of seedTemplateExercises) {
      for (const id of te.alternativeExerciseIds ?? []) {
        expect(byId.has(id), `${te.id} lists a missing exercise: ${id}`).toBe(true);
      }
    }
  });

  it("changes the program revision without bumping SEED_VERSION, which would wipe local data", () => {
    expect(seedProgramMeta.version).toBe("2026-09-17-rev4");
    expect(SEED_VERSION).toBe("v2-maxvol-2026-06-26");
  });
});
