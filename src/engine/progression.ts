import type { Exercise, SetEntry, Settings, TemplateExercise } from "../types";
import { computeSetStats, hasPainNote, type SetStats } from "./stats";
import { fmtWeight, repRange } from "../lib/format";

// Deterministic, rule-based progressive-overload engine.
// IMPORTANT: this is the source of truth for what to do next. The AI coach only
// explains these facts — it never invents numbers (see src/ai/*).

export type SuggestionKind =
  | "establish" // no history yet
  | "add-reps" // stay at weight, chase more reps
  | "increase-weight" // bump load next session
  | "small-increase" // optional small bump (isolation / conservative)
  | "repeat"; // hold the line (conservative / regressed)

export interface ProgressionSuggestion {
  exerciseId: string;
  rule: TemplateExercise["progressionRule"];
  kind: SuggestionKind;
  /** Short label for the card, e.g. "Add 5 lb" or "Add reps". */
  action: string;
  /** One-line explanation in plain language. */
  detail: string;
  /** Concrete numbers when applicable. */
  suggestedWeight?: number;
  targetRepLow: number;
  targetRepHigh: number;
  /** True when the previous session topped out the range (ready to load up). */
  readyToProgress: boolean;
}

// "Smallest practical jump." Heavy lower-body compounds tolerate a bigger step.
function incrementFor(exercise: Exercise, settings: Settings): number {
  const heavy =
    exercise.movementPattern === "Squat/Knee" || exercise.movementPattern === "Hinge";
  return heavy ? settings.weightIncrementLower : settings.weightIncrementUpper;
}

// All target working sets reached the top of the rep range.
function allSetsAtTop(stats: SetStats, te: TemplateExercise): boolean {
  return (
    stats.setCount >= te.targetSets &&
    stats.minReps >= te.repMax &&
    stats.workingSets.every((s) => s.reps >= te.repMax)
  );
}

export function suggestProgression(
  te: TemplateExercise,
  exercise: Exercise,
  previousSets: SetEntry[] | null,
  settings: Settings
): ProgressionSuggestion {
  const base = {
    exerciseId: te.exerciseId,
    rule: te.progressionRule,
    targetRepLow: te.repMin,
    targetRepHigh: te.repMax,
    readyToProgress: false,
  };

  const range = repRange(te.repMin, te.repMax);

  if (!previousSets || previousSets.filter((s) => !s.isWarmup).length === 0) {
    return {
      ...base,
      kind: "establish",
      action: "Set a baseline",
      detail: `First logged time. Pick a weight you can keep for ${te.targetSets} sets in the ${range} range.`,
    };
  }

  const stats = computeSetStats(previousSets);
  const atTop = allSetsAtTop(stats, te);
  const inc = incrementFor(exercise, settings);
  const weight = stats.baseWeight; // the load all working sets were performed at
  const w = (n: number) => fmtWeight(n, settings.unit);

  switch (te.progressionRule) {
    // ---- Double progression: hold weight until every set hits the top, then load up.
    case "Double Progression": {
      if (atTop) {
        return {
          ...base,
          kind: "increase-weight",
          readyToProgress: true,
          action: `Add ${w(inc)}`,
          suggestedWeight: weight + inc,
          detail: `Last time you hit ${te.repMax} on all ${stats.setCount} sets at ${w(
            weight
          )}. Move to ${w(weight + inc)} and rebuild toward ${range}.`,
        };
      }
      return {
        ...base,
        kind: "add-reps",
        action: "Add reps",
        suggestedWeight: weight,
        detail: `Stay at ${w(weight)}. Last set ${stats.totalReps} total reps — beat that, aiming for ${te.repMax} on every set before adding load.`,
      };
    }

    // ---- Rep progression (isolation): build clean reps first, then a small bump.
    case "Rep Progression": {
      if (atTop) {
        return {
          ...base,
          kind: "small-increase",
          readyToProgress: true,
          action: `Small +${w(inc)}`,
          suggestedWeight: weight + inc,
          detail: `Clean reps at the top of ${range}. Add a small ${w(
            inc
          )} (or a harder variation) and rebuild reps.`,
        };
      }
      return {
        ...base,
        kind: "add-reps",
        action: "Add reps",
        suggestedWeight: weight,
        detail: `Keep ${w(weight)} and add reps toward ${te.repMax}. Don't increase load too early — build clean reps first.`,
      };
    }

    // ---- Conservative (heavy hinge/deadlift): never auto-jump aggressively.
    case "Conservative Progression": {
      const painy = hasPainNote(stats.workingSets.map((s) => s.notes));
      const hadReserve = stats.avgRir === null || stats.avgRir >= 1;
      if (atTop && hadReserve && !painy) {
        return {
          ...base,
          kind: "small-increase",
          readyToProgress: true,
          action: `Repeat or +${w(inc)}`,
          suggestedWeight: weight + inc,
          detail: `Reps topped out at ${w(weight)} with reps in reserve. Optional small +${w(
            inc
          )}, or repeat to bank another clean session — your call.`,
        };
      }
      return {
        ...base,
        kind: "repeat",
        action: "Repeat weight",
        suggestedWeight: weight,
        detail: painy
          ? `Repeat ${w(weight)}. Notes mention fatigue/discomfort — prioritize clean form over load.`
          : `Repeat ${w(weight)}. Keep RIR 1–3 and only nudge up when it feels easy and pain-free.`,
      };
    }
  }
}
