import type { SetEntry } from "../types";
import { computeSetStats, type SetStats } from "./stats";

export type Trend = "improved" | "matched" | "regressed" | "new";

export interface ExerciseComparison {
  exerciseId: string;
  current: SetStats;
  previous: SetStats | null;
  trend: Trend;
  deltaTotalReps: number;
  deltaTotalVolume: number;
  deltaTopWeight: number;
  deltaBestEst1rm: number;
}

// Compare this session's performance of an exercise against the previous time it
// was performed. Volume is the primary signal (matches the workbook's "use total
// reps/volume as the comparison metric"), with reps then top weight as tiebreaks.
export function compareExercise(
  exerciseId: string,
  currentSets: SetEntry[],
  previousSets: SetEntry[] | null
): ExerciseComparison {
  const current = computeSetStats(currentSets);
  const previous = previousSets ? computeSetStats(previousSets) : null;

  if (!previous || previous.setCount === 0) {
    return {
      exerciseId,
      current,
      previous,
      trend: "new",
      deltaTotalReps: 0,
      deltaTotalVolume: 0,
      deltaTopWeight: 0,
      deltaBestEst1rm: 0,
    };
  }

  const deltaTotalVolume = current.totalVolume - previous.totalVolume;
  const deltaTotalReps = current.totalReps - previous.totalReps;
  const deltaTopWeight = current.topWeight - previous.topWeight;
  const deltaBestEst1rm = current.bestEst1rm - previous.bestEst1rm;

  let trend: Trend;
  const primary = deltaTotalVolume || deltaTotalReps || deltaTopWeight;
  if (primary > 0) trend = "improved";
  else if (primary < 0) trend = "regressed";
  else trend = "matched";

  return {
    exerciseId,
    current,
    previous,
    trend,
    deltaTotalReps,
    deltaTotalVolume,
    deltaTopWeight,
    deltaBestEst1rm,
  };
}

export function trendLabel(t: Trend): string {
  switch (t) {
    case "improved":
      return "Improved";
    case "regressed":
      return "Down";
    case "matched":
      return "Matched";
    case "new":
      return "New";
  }
}
