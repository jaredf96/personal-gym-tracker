import type { Exercise, SetEntry, VolumeTarget, WorkoutSession } from "../types";
import { isoDateInRange, startOfWeek, endOfWeek } from "../lib/dates";

export type VolumeStatus = "low" | "in-range" | "high" | "no-target";

export interface MuscleVolume {
  muscle: string;
  hardSets: number; // working (non-warmup) sets this week
  target: VolumeTarget | null;
  status: VolumeStatus;
}

function classify(hardSets: number, target: VolumeTarget | null): VolumeStatus {
  if (!target) return "no-target";
  if (hardSets < target.minSets) return "low";
  if (hardSets > target.maxSets) return "high";
  return "in-range";
}

// Weekly hard sets by primary muscle (workbook: "primary/direct sets only"),
// compared against the min/max target ranges. A "hard set" = one working set.
export function weeklyVolumeByMuscle(
  setEntries: SetEntry[],
  sessions: WorkoutSession[],
  exercisesById: Map<string, Exercise>,
  targets: VolumeTarget[],
  reference = new Date()
): MuscleVolume[] {
  const start = startOfWeek(reference);
  const end = endOfWeek(reference);

  const sessionDate = new Map(sessions.map((s) => [s.id, s.date]));
  const counts = new Map<string, number>();

  for (const set of setEntries) {
    if (set.isWarmup) continue;
    const date = sessionDate.get(set.sessionId);
    if (!date || !isoDateInRange(date, start, end)) continue;
    const ex = exercisesById.get(set.exerciseId);
    if (!ex) continue;
    counts.set(ex.primaryMuscle, (counts.get(ex.primaryMuscle) ?? 0) + 1);
  }

  const targetByMuscle = new Map(targets.map((t) => [t.muscle, t]));
  const muscles = new Set<string>([...counts.keys(), ...targetByMuscle.keys()]);

  const rows: MuscleVolume[] = [];
  for (const muscle of muscles) {
    const hardSets = counts.get(muscle) ?? 0;
    const target = targetByMuscle.get(muscle) ?? null;
    rows.push({ muscle, hardSets, target, status: classify(hardSets, target) });
  }

  // Targeted muscles first (most actionable), then by set count desc.
  return rows.sort((a, b) => {
    if (!!a.target !== !!b.target) return a.target ? -1 : 1;
    return b.hardSets - a.hardSets;
  });
}

export function volumeStatusLabel(s: VolumeStatus): string {
  switch (s) {
    case "low":
      return "Low";
    case "in-range":
      return "In range";
    case "high":
      return "High";
    case "no-target":
      return "No target";
  }
}
