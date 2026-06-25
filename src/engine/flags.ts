import type { SetEntry } from "../types";
import { computeSetStats, hasPainNote } from "./stats";
import type { MuscleVolume } from "./volume";
import type { ProgressionSuggestion } from "./progression";

// The "rule engine" surface: deterministic warnings/notices derived from data.
// These feed both the UI and the AI coach context (the AI explains them; it does
// not generate them).

export type FlagKind =
  | "fatigue"
  | "volume-low"
  | "volume-high"
  | "ready-to-progress"
  | "pain-note";

export interface EngineFlag {
  kind: FlagKind;
  severity: "info" | "warn";
  message: string;
  ref?: string; // exerciseId or muscle
  refLabel?: string;
}

// Workbook "Fatigue Warning": performance down 2+ sessions in a row.
// Needs at least 3 sessions so we can see two consecutive declines in volume.
export function detectFatigue(
  exerciseId: string,
  label: string,
  sessionsOldToNew: SetEntry[][]
): EngineFlag | null {
  const volumes = sessionsOldToNew.map((sets) => computeSetStats(sets).totalVolume);
  if (volumes.length < 3) return null;
  const n = volumes.length;
  const downOnce = volumes[n - 1] < volumes[n - 2];
  const downTwice = volumes[n - 2] < volumes[n - 3];
  if (downOnce && downTwice) {
    return {
      kind: "fatigue",
      severity: "warn",
      ref: exerciseId,
      refLabel: label,
      message: `${label} has dropped 2 sessions running. Consider longer rest, fewer sets, a deload, or a swap.`,
    };
  }
  return null;
}

export function painFlag(
  exerciseId: string,
  label: string,
  recentSets: SetEntry[]
): EngineFlag | null {
  if (hasPainNote(recentSets.map((s) => s.notes))) {
    return {
      kind: "pain-note",
      severity: "warn",
      ref: exerciseId,
      refLabel: label,
      message: `${label}: a recent note mentions discomfort. Treat as a cue to adjust, not a diagnosis.`,
    };
  }
  return null;
}

export function volumeFlags(rows: MuscleVolume[]): EngineFlag[] {
  const out: EngineFlag[] = [];
  for (const r of rows) {
    if (r.status === "low") {
      out.push({
        kind: "volume-low",
        severity: "info",
        ref: r.muscle,
        refLabel: r.muscle,
        message: `${r.muscle}: ${r.hardSets} hard sets this week, below target ${r.target?.minSets}–${r.target?.maxSets}. Consider adding a set.`,
      });
    } else if (r.status === "high") {
      out.push({
        kind: "volume-high",
        severity: "info",
        ref: r.muscle,
        refLabel: r.muscle,
        message: `${r.muscle}: ${r.hardSets} hard sets this week, above target ${r.target?.minSets}–${r.target?.maxSets}. Fine if recovery is good.`,
      });
    }
  }
  return out;
}

export function readyToProgressFlags(
  suggestions: { suggestion: ProgressionSuggestion; label: string }[]
): EngineFlag[] {
  return suggestions
    .filter((s) => s.suggestion.readyToProgress)
    .map((s) => ({
      kind: "ready-to-progress" as const,
      severity: "info" as const,
      ref: s.suggestion.exerciseId,
      refLabel: s.label,
      message: `${s.label}: ${s.suggestion.action.toLowerCase()} — you topped the rep range last time.`,
    }));
}
