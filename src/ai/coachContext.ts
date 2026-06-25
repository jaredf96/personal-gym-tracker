import { analyzeSession } from "../engine/analysis";
import {
  getWeeklyVolume,
  listBodyMetrics,
  getReadinessForDate,
  listReadiness,
  getSettings,
} from "../db/repo";
import { fmtNum } from "../lib/format";
import { daysAgo } from "../lib/dates";
import { volumeStatusLabel } from "../engine/volume";
import { repRange } from "../lib/format";
import type {
  CoachBodyweightTrend,
  CoachContext,
  CoachExerciseFact,
  CoachReadiness,
} from "./types";

// Builds the compact "coach context" for a finished session. This is the bridge
// between the deterministic engine and any AI provider. It deliberately pulls a
// small, structured slice — never the whole database.
export async function buildCoachContext(sessionId: string): Promise<CoachContext | null> {
  const analysis = await analyzeSession(sessionId);
  if (!analysis) return null;
  const settings = await getSettings();

  const exercises: CoachExerciseFact[] = analysis.exercises.map((e) => {
    const cur = e.comparison.current;
    const prev = e.comparison.previous;
    const best = cur.bestSet
      ? `${fmtNum(cur.bestSet.weight)} ${settings.unit} x ${cur.bestSet.reps}`
      : null;
    return {
      name: e.name,
      primaryMuscle: e.primaryMuscle,
      rule: e.suggestion.rule,
      trend: e.comparison.trend,
      today: {
        workingSets: cur.setCount,
        totalReps: cur.totalReps,
        topWeight: cur.topWeight,
        totalVolume: cur.totalVolume,
        bestSet: best,
      },
      previous: prev
        ? {
            totalReps: prev.totalReps,
            topWeight: prev.topWeight,
            totalVolume: prev.totalVolume,
          }
        : null,
      suggestion: {
        kind: e.suggestion.kind,
        action: e.suggestion.action,
        detail: e.suggestion.detail,
        suggestedWeight: e.suggestion.suggestedWeight ?? null,
        targetReps: repRange(e.suggestion.targetRepLow, e.suggestion.targetRepHigh),
      },
    };
  });

  const improvements = analysis.exercises
    .filter((e) => e.comparison.trend === "improved")
    .map((e) => e.name);
  const regressions = analysis.exercises
    .filter((e) => e.comparison.trend === "regressed")
    .map((e) => e.name);

  // Weekly volume for the week containing this session.
  const weekly = await getWeeklyVolume(new Date(analysis.session.date + "T12:00:00"));
  const weeklyVolume = weekly.map((v) => ({
    muscle: v.muscle,
    hardSets: v.hardSets,
    min: v.target?.minSets ?? null,
    max: v.target?.maxSets ?? null,
    status: volumeStatusLabel(v.status),
  }));

  const bodyweight = await buildBodyweightTrend(settings.unit);
  const readiness = await buildReadiness(analysis.session.date);

  return {
    generatedAt: new Date().toISOString(),
    unit: settings.unit,
    workoutName: analysis.template?.name ?? "Workout",
    date: analysis.session.date,
    totals: analysis.totals,
    exercises,
    improvements,
    regressions,
    weeklyVolume,
    bodyweight,
    readiness,
    flags: analysis.flags.map((f) => ({ kind: f.kind, message: f.message })),
  };
}

async function buildBodyweightTrend(
  unit: CoachContext["unit"]
): Promise<CoachBodyweightTrend | null> {
  const metrics = (await listBodyMetrics()).filter((m) => typeof m.bodyweight === "number");
  if (metrics.length === 0) return null;
  const latest = metrics[0].bodyweight!;
  const previous = metrics[1]?.bodyweight ?? null;
  const recent = metrics.filter((m) => daysAgo(m.date) <= 7).map((m) => m.bodyweight!);
  const weeklyAvg =
    recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
  return {
    latest,
    unit,
    weeklyAvg: weeklyAvg !== null ? Math.round(weeklyAvg * 10) / 10 : null,
    deltaFromPrevious: previous !== null ? Math.round((latest - previous) * 10) / 10 : null,
  };
}

async function buildReadiness(date: string): Promise<CoachReadiness | null> {
  const forDate = await getReadinessForDate(date);
  const log = forDate ?? (await listReadiness())[0];
  if (!log) return null;
  return {
    sleep: log.sleep,
    energy: log.energy,
    soreness: log.soreness,
    stress: log.stress,
    notes: log.notes,
  };
}
