import type { Exercise, SetEntry, VolumeTarget, WorkoutSession } from "../types";
import { isoDateInRange, startOfWeek, endOfWeek } from "../lib/dates";

export type VolumeStatus = "low" | "in-range" | "high" | "no-target";

export interface MuscleVolume {
  muscle: string; // canonical key
  label: string;
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

// Weekly hard sets by muscle, compared against the prescribed target band. A
// "hard set" = one working (non-warmup) set, counted toward EACH muscle the
// exercise trains (e.g. a Bulgarian split squat counts for quads and glutes).
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
    // One set counts once toward each distinct primary muscle it trains, and
    // half toward secondary-credit muscles (e.g. glutes on hinges/squats).
    for (const muscle of new Set(ex.volumeMuscles)) {
      counts.set(muscle, (counts.get(muscle) ?? 0) + 1);
    }
    for (const muscle of new Set(ex.secondaryVolumeMuscles ?? [])) {
      if (ex.volumeMuscles.includes(muscle)) continue;
      counts.set(muscle, (counts.get(muscle) ?? 0) + 0.5);
    }
  }

  const targetByMuscle = new Map(targets.map((t) => [t.muscle, t]));
  const muscles = new Set<string>([...counts.keys(), ...targetByMuscle.keys()]);

  const rows: MuscleVolume[] = [];
  for (const muscle of muscles) {
    const hardSets = counts.get(muscle) ?? 0;
    const target = targetByMuscle.get(muscle) ?? null;
    rows.push({
      muscle,
      label: target?.label ?? muscle,
      hardSets,
      target,
      status: classify(hardSets, target),
    });
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
