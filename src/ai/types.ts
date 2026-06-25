import type { Unit } from "../types";
import type { Trend } from "../engine/comparison";

// ===========================================================================
// AI coach layer — type definitions.
//
// Design contract (do not violate when adding a real provider):
//   1. The deterministic training engine computes ALL facts/numbers first.
//   2. The AI only explains/summarizes the facts in `CoachContext`.
//   3. The AI must never invent workout numbers.
//   4. We never send the whole database — only this compact `CoachContext`.
// ===========================================================================

export interface CoachExerciseFact {
  name: string;
  primaryMuscle: string;
  rule: string; // progression rule name
  trend: Trend; // improved | matched | regressed | new
  today: {
    workingSets: number;
    totalReps: number;
    topWeight: number;
    totalVolume: number;
    bestSet: string | null; // e.g. "70 lb x 9"
  };
  previous: {
    totalReps: number;
    topWeight: number;
    totalVolume: number;
  } | null;
  // The deterministic suggestion for next time (engine output, verbatim).
  suggestion: {
    kind: string;
    action: string;
    detail: string;
    suggestedWeight: number | null;
    targetReps: string; // e.g. "6–10"
  };
}

export interface CoachVolumeFact {
  muscle: string;
  hardSets: number;
  min: number | null;
  max: number | null;
  status: string; // low | in-range | high | no-target
}

export interface CoachBodyweightTrend {
  latest: number;
  unit: Unit;
  weeklyAvg: number | null;
  deltaFromPrevious: number | null;
}

export interface CoachReadiness {
  sleep?: number;
  energy?: number;
  soreness?: number;
  stress?: number;
  notes?: string;
}

export interface CoachFlag {
  kind: string;
  message: string;
}

// The compact, structured snapshot handed to a provider. This is the ONLY data
// that leaves the deterministic engine for the AI to talk about.
export interface CoachContext {
  generatedAt: string;
  unit: Unit;
  workoutName: string;
  date: string;
  totals: {
    workingSets: number;
    totalReps: number;
    totalVolume: number;
    durationMin: number | null;
  };
  exercises: CoachExerciseFact[];
  improvements: string[]; // exercise names that improved vs last time
  regressions: string[]; // exercise names that regressed
  weeklyVolume: CoachVolumeFact[];
  bodyweight: CoachBodyweightTrend | null;
  readiness: CoachReadiness | null;
  flags: CoachFlag[];
}

// What every provider returns. Stored as an AiReport.
export interface CoachReport {
  provider: string;
  headline: string;
  summary: string; // 1–3 short paragraphs
  bullets: string[]; // concrete takeaways
}

// Rendered prompt pair for real LLM providers (the mock ignores these).
export interface CoachPrompts {
  system: string;
  user: string;
}

export interface CoachProvider {
  readonly name: string;
  generateSummary(context: CoachContext, prompts: CoachPrompts): Promise<CoachReport>;
}
