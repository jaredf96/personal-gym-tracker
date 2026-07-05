import type { SetEntry } from "../types";

// Deterministic per-exercise statistics for a single session's sets.
// Warmup sets are excluded from every working metric.

export interface BestSet {
  weight: number;
  reps: number;
  volume: number; // weight * reps
  est1rm: number;
}

export interface SetStats {
  workingSets: SetEntry[];
  setCount: number;
  totalReps: number;
  totalVolume: number; // sum of weight * reps over working sets
  topWeight: number; // heaviest working-set weight
  baseWeight: number; // lightest working-set weight (the load all sets cleared)
  minReps: number;
  maxReps: number;
  avgRir: number | null;
  bestSet: BestSet | null;
  bestEst1rm: number;
}

// Epley estimated 1RM. Used only to rank "best set"; never shown as a prescription.
export function est1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function computeSetStats(sets: SetEntry[]): SetStats {
  const working = sets.filter((s) => !s.isWarmup);
  const empty: SetStats = {
    workingSets: working,
    setCount: 0,
    totalReps: 0,
    totalVolume: 0,
    topWeight: 0,
    baseWeight: 0,
    minReps: 0,
    maxReps: 0,
    avgRir: null,
    bestSet: null,
    bestEst1rm: 0,
  };
  if (working.length === 0) return empty;

  let totalReps = 0;
  let totalVolume = 0;
  let topWeight = -Infinity;
  let baseWeight = Infinity;
  let minReps = Infinity;
  let maxReps = -Infinity;
  let best: BestSet | null = null;
  let rirSum = 0;
  let rirCount = 0;

  for (const s of working) {
    totalReps += s.reps;
    totalVolume += s.weight * s.reps;
    topWeight = Math.max(topWeight, s.weight);
    baseWeight = Math.min(baseWeight, s.weight);
    minReps = Math.min(minReps, s.reps);
    maxReps = Math.max(maxReps, s.reps);
    if (typeof s.rir === "number") {
      rirSum += s.rir;
      rirCount += 1;
    }
    const e = est1rm(s.weight, s.reps);
    if (!best || e > best.est1rm) {
      best = { weight: s.weight, reps: s.reps, volume: s.weight * s.reps, est1rm: e };
    }
  }

  return {
    workingSets: working,
    setCount: working.length,
    totalReps,
    totalVolume,
    topWeight,
    baseWeight,
    minReps,
    maxReps,
    avgRir: rirCount > 0 ? rirSum / rirCount : null,
    bestSet: best,
    bestEst1rm: best ? best.est1rm : 0,
  };
}

// Heuristic detector for pain / fatigue language in free-text notes.
// Used by the conservative progression rule and the fatigue flag — never to
// diagnose, only to bias toward "repeat / be careful".
// Deliberately matches only pain-adjacent words: bare body parts ("back",
// "knee") appear constantly in benign cues ("keep back tight") and used to
// silently block progression.
const PAIN_RE =
  /\b(pain|painful|hurt|hurts|hurting|tweak|tweaked|twinge|strain|strained|ache|aching|achy|sore|soreness|pinch|pinching|sharp)\b/i;
export function hasPainNote(notes: (string | undefined)[]): boolean {
  return notes.some((n) => !!n && PAIN_RE.test(n));
}
