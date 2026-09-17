import { describe, it, expect } from "vitest";
import { carryVariantSwaps, slotsByExercise } from "../variants";
import type { Exercise, TemplateExercise } from "../../types";

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

function exercise(id: string, name: string, defaultRepMin: number, defaultRepMax: number): Exercise {
  return {
    id,
    name,
    type: "isolation",
    primaryMuscles: ["chest"],
    secondaryMuscles: [],
    volumeMuscles: ["chest"],
    secondaryVolumeMuscles: [],
    movementPattern: "Isolation/Core",
    defaultRepMin,
    defaultRepMax,
    perSide: false,
    defaultRestMin: 75,
    defaultRestMax: 90,
    rirTarget: "0-1",
    defaultWarmupSets: 0,
    progressionRule: "Rep Progression",
  };
}

// Mirrors the seeded library: the Upper A fly slot is 4 × 10–15; Cable Fly's
// own defaults are 12–20.
const INCLINE = exercise("incline-dumbbell-press", "Incline Dumbbell Press", 6, 10);
const PEC_DECK = exercise("pec-deck-or-cable-fly", "Pec Deck", 10, 15);
const CABLE_FLY = exercise("cable-fly-or-pec-deck", "Cable Fly", 12, 20);
const VIEWS = [
  { templateExercise: SLOTS[0], exercise: INCLINE },
  { templateExercise: SLOTS[1], exercise: PEC_DECK },
];
const BY_ID = new Map([INCLINE, PEC_DECK, CABLE_FLY].map((e) => [e.id, e]));

describe("slotsByExercise", () => {
  it("REGRESSION: Cable Fly swapped into Upper A's fly slot is graded as that slot, 4 × 10–15", () => {
    const te = slotsByExercise(VIEWS, { "upper-a:5": CABLE_FLY.id }, BY_ID).get(CABLE_FLY.id);
    expect(te).toMatchObject({
      id: "upper-a:5",
      exerciseId: CABLE_FLY.id,
      targetSets: 4,
      repMin: 10,
      repMax: 15,
    });
  });

  it("a default exercise keeps its slot, swapped away or not", () => {
    const swapped = slotsByExercise(VIEWS, { "upper-a:5": CABLE_FLY.id }, BY_ID);
    expect(swapped.get(PEC_DECK.id)?.id).toBe("upper-a:5");
    expect(swapped.get(INCLINE.id)?.id).toBe("upper-a:1");
  });

  it("an exercise the session didn't swap in has no slot (falls back to its defaults)", () => {
    expect(slotsByExercise(VIEWS, undefined, BY_ID).get(CABLE_FLY.id)).toBeUndefined();
  });
});
