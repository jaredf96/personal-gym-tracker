import { describe, it, expect } from "vitest";
import { carryVariantSwaps } from "../variants";
import type { TemplateExercise } from "../../types";

function slot(id: string, exerciseId: string, alternativeExerciseIds?: string[]): TemplateExercise {
  return {
    id,
    templateId: "upper-a",
    exerciseId,
    order: Number(id.split(":")[1]),
    targetSets: 4,
    repMin: 10,
    repMax: 15,
    perSide: false,
    restMin: 75,
    restMax: 90,
    rirTarget: "0-1",
    warmupSets: 0,
    countsTowardVolume: true,
    progressionRule: "Rep Progression",
    exerciseType: "isolation",
    isMainLift: false,
    alternativeExerciseIds,
  };
}

const SLOTS = [
  slot("upper-a:1", "incline-dumbbell-press"),
  slot("upper-a:5", "pec-deck-or-cable-fly", ["cable-fly-or-pec-deck"]),
];

describe("carryVariantSwaps", () => {
  it("opens the fly slot on Cable Fly when that is what was used last time", () => {
    expect(carryVariantSwaps(SLOTS, { "upper-a:5": "cable-fly-or-pec-deck" })).toEqual({
      "upper-a:5": "cable-fly-or-pec-deck",
    });
  });

  it("does not carry an ordinary one-off swap", () => {
    expect(carryVariantSwaps(SLOTS, { "upper-a:1": "flat-bench-press-or-machine-chest-press" })).toEqual({});
  });

  it("does not carry an exercise that is not a declared alternative of that slot", () => {
    expect(carryVariantSwaps(SLOTS, { "upper-a:5": "cable-lateral-raise" })).toEqual({});
  });

  it("starts on the default when last time used the default (no swap recorded)", () => {
    expect(carryVariantSwaps(SLOTS, undefined)).toEqual({});
    expect(carryVariantSwaps(SLOTS, {})).toEqual({});
  });
});
