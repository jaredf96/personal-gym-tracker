import type {
  Exercise,
  SetEntry,
  TemplateExercise,
  WorkoutSession,
  WorkoutTemplate,
} from "../types";
import {
  getExercisesById,
  getExerciseSessionHistory,
  getPreviousExerciseSets,
  getSetsForSession,
  getSettings,
  getTemplateExerciseViews,
} from "../db/repo";
import { db } from "../db/db";
import { computeSetStats, type SetStats } from "./stats";
import { compareExercise, type ExerciseComparison, type Trend } from "./comparison";
import { suggestProgression, type ProgressionSuggestion } from "./progression";
import {
  detectFatigue,
  painFlag,
  readyToProgressFlags,
  type EngineFlag,
} from "./flags";

// Builds a synthetic TemplateExercise from an exercise's defaults, for the case
// where an exercise has history but isn't in the current template.
function fallbackTemplateExercise(ex: Exercise): TemplateExercise {
  return {
    id: `adhoc:${ex.id}`,
    templateId: "adhoc",
    exerciseId: ex.id,
    order: 0,
    targetSets: 3,
    repMin: ex.defaultRepMin,
    repMax: ex.defaultRepMax,
    perSide: ex.perSide,
    restMin: ex.defaultRestMin,
    restMax: ex.defaultRestMax,
    rirTarget: ex.rirTarget,
    warmupSets: ex.defaultWarmupSets,
    countsTowardVolume: true,
    progressionRule: ex.progressionRule,
    exerciseType: ex.type,
    isMainLift: false,
  };
}

// ---------------------------------------------------------------------------
// Upcoming plan: what to do in the next/active workout, with suggestions based
// on the last time each exercise was performed.
// ---------------------------------------------------------------------------

export interface PlanItem {
  templateExercise: TemplateExercise;
  exercise: Exercise;
  previousSets: SetEntry[] | null;
  previousStats: SetStats | null;
  suggestion: ProgressionSuggestion;
}

export interface UpcomingPlan {
  template: WorkoutTemplate;
  items: PlanItem[];
}

export async function getUpcomingPlan(
  template: WorkoutTemplate,
  activeSessionId?: string
): Promise<UpcomingPlan> {
  const [views, settings] = await Promise.all([
    getTemplateExerciseViews(template.id),
    getSettings(),
  ]);

  const items: PlanItem[] = [];
  for (const { templateExercise, exercise } of views) {
    const previousSets = await getPreviousExerciseSets(exercise.id, activeSessionId);
    const suggestion = suggestProgression(templateExercise, exercise, previousSets, settings);
    items.push({
      templateExercise,
      exercise,
      previousSets,
      previousStats: previousSets ? computeSetStats(previousSets) : null,
      suggestion,
    });
  }
  return { template, items };
}

// ---------------------------------------------------------------------------
// Post-session analysis: compare each exercise to the previous time, compute the
// suggestion for NEXT time, and gather rule-engine flags.
// ---------------------------------------------------------------------------

export interface ExercisePerf {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  comparison: ExerciseComparison;
  suggestion: ProgressionSuggestion;
}

export interface SessionTotals {
  workingSets: number;
  totalReps: number;
  totalVolume: number;
  durationMin: number | null;
}

export interface SessionAnalysis {
  session: WorkoutSession;
  template: WorkoutTemplate | null;
  exercises: ExercisePerf[];
  flags: EngineFlag[];
  totals: SessionTotals;
}

export async function analyzeSession(sessionId: string): Promise<SessionAnalysis | null> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session) return null;

  const [sets, settings, exercisesById, template] = await Promise.all([
    getSetsForSession(sessionId),
    getSettings(),
    getExercisesById(),
    db.workoutTemplates.get(session.templateId),
  ]);

  const templateViews = await getTemplateExerciseViews(session.templateId);
  const teByExercise = new Map(templateViews.map((v) => [v.exercise.id, v.templateExercise]));

  // Group this session's sets by exercise, preserving log order.
  const byExercise = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const list = byExercise.get(s.exerciseId) ?? [];
    list.push(s);
    byExercise.set(s.exerciseId, list);
  }

  const exercises: ExercisePerf[] = [];
  const flags: EngineFlag[] = [];

  for (const [exerciseId, todaySets] of byExercise) {
    const exercise = exercisesById.get(exerciseId);
    if (!exercise) continue;
    const te = teByExercise.get(exerciseId) ?? fallbackTemplateExercise(exercise);

    const previousSets = await getPreviousExerciseSets(exerciseId, sessionId);
    const comparison = compareExercise(exerciseId, todaySets, previousSets);
    // Suggestion for NEXT time is based on what was just performed.
    const suggestion = suggestProgression(te, exercise, todaySets, settings);

    exercises.push({
      exerciseId,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscles[0] ?? exercise.name,
      comparison,
      suggestion,
    });

    // Fatigue: look at this exercise's recent sessions oldest -> newest.
    const history = await getExerciseSessionHistory(exerciseId);
    const oldToNew = history.map((h) => h.sets).reverse();
    const fatigue = detectFatigue(exerciseId, exercise.name, oldToNew);
    if (fatigue) flags.push(fatigue);
    const pain = painFlag(exerciseId, exercise.name, todaySets);
    if (pain) flags.push(pain);
  }

  flags.push(
    ...readyToProgressFlags(
      exercises.map((e) => ({ suggestion: e.suggestion, label: e.name }))
    )
  );

  const working = sets.filter((s) => !s.isWarmup);
  const totals: SessionTotals = {
    workingSets: working.length,
    totalReps: working.reduce((a, s) => a + s.reps, 0),
    totalVolume: working.reduce((a, s) => a + s.weight * s.reps, 0),
    durationMin:
      session.endedAt && session.startedAt
        ? Math.max(
            0,
            Math.round(
              (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) /
                60000
            )
          )
        : null,
  };

  return { session, template: template ?? null, exercises, flags, totals };
}

// ---------------------------------------------------------------------------
// Exercise history with PR indicators (for the History screen)
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  session: WorkoutSession;
  stats: SetStats;
  trendVsPrev: Trend;
  isWeightPR: boolean;
  isVolumePR: boolean;
  isEst1rmPR: boolean;
}

export interface ExerciseHistory {
  exercise: Exercise;
  entries: HistoryEntry[]; // newest first
}

export async function getExerciseHistoryWithPRs(
  exerciseId: string
): Promise<ExerciseHistory | null> {
  const exercise = await db.exercises.get(exerciseId);
  if (!exercise) return null;

  const history = await getExerciseSessionHistory(exerciseId); // newest first
  const oldToNew = [...history].reverse();

  // Walk oldest -> newest tracking running bests; a session is a PR if it sets a
  // new all-time best for that metric.
  let bestWeight = 0;
  let bestVolume = 0;
  let bestEst1rm = 0;
  let prev: { volume: number; reps: number; topWeight: number } | null = null;

  const flagged = oldToNew.map(({ session, sets }) => {
    const stats = computeSetStats(sets);
    const isWeightPR = stats.topWeight > bestWeight;
    const isVolumePR = stats.totalVolume > bestVolume;
    const isEst1rmPR = stats.bestEst1rm > bestEst1rm;
    bestWeight = Math.max(bestWeight, stats.topWeight);
    bestVolume = Math.max(bestVolume, stats.totalVolume);
    bestEst1rm = Math.max(bestEst1rm, stats.bestEst1rm);

    let trend: Trend = "new";
    if (prev !== null) {
      // Volume first, then reps, then top weight — so bodyweight (0-load)
      // exercises still register progress via reps.
      const delta =
        stats.totalVolume - prev.volume ||
        stats.totalReps - prev.reps ||
        stats.topWeight - prev.topWeight;
      trend = delta > 0 ? "improved" : delta < 0 ? "regressed" : "matched";
    }
    prev = { volume: stats.totalVolume, reps: stats.totalReps, topWeight: stats.topWeight };

    return { session, stats, trendVsPrev: trend, isWeightPR, isVolumePR, isEst1rmPR };
  });

  return { exercise, entries: flagged.reverse() };
}
