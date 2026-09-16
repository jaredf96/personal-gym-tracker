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
import { normalizeExercise } from "../db/normalize";
import { computeSetStats, type SetStats } from "./stats";
import { compareExercise, type ExerciseComparison, type Trend } from "./comparison";
import { suggestProgression, type ProgressionSuggestion } from "./progression";
import {
  detectFatigue,
  painFlag,
  readyToProgressFlags,
  type EngineFlag,
} from "./flags";
import {
  CLEAR_AFTER_CLEAN_SESSIONS,
  PAIN_WINDOW_DAYS,
  activePainAreas,
  adjustmentsForExercises,
  type ActivePainArea,
  type PainAdjustment,
  type PainNoteSource,
  type TrainedSession,
} from "./painNotes";
import { addDaysISO, todayISODate } from "../lib/dates";

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
  exercise: Exercise; // the EFFECTIVE exercise (post-swap)
  swappedFrom: Exercise | null; // original slot exercise when swapped
  // The slot's default exercise followed by its declared alternatives, for the
  // one-tap variant toggle. Empty when the slot has no alternatives.
  variants: Exercise[];
  previousSets: SetEntry[] | null;
  previousStats: SetStats | null;
  suggestion: ProgressionSuggestion;
  // Areas from recent pain notes this lift loads ("left shoulder"). Each lift
  // with any gets one extra warm-up set; empty normally.
  painLabels: string[];
}

export interface UpcomingPlan {
  template: WorkoutTemplate;
  items: PlanItem[];
  pain: PainAdjustment[]; // heads-up for this workout from recent notes
}

/**
 * Pain areas from recent notes that should still shape upcoming workouts: set
 * notes from COMPLETED sessions plus readiness notes, over the last
 * PAIN_WINDOW_DAYS. A workout in progress never adjusts itself from its own notes.
 */
export async function loadActivePainAreas(today = todayISODate()): Promise<ActivePainArea[]> {
  const since = addDaysISO(-PAIN_WINDOW_DAYS, new Date(`${today}T12:00:00`));
  const [sessions, readiness, exercisesById] = await Promise.all([
    db.workoutSessions.where("date").aboveOrEqual(since).filter((s) => !!s.endedAt).toArray(),
    db.readinessLogs.where("date").aboveOrEqual(since).toArray(),
    getExercisesById(),
  ]);

  const notes: PainNoteSource[] = [];
  const trained: TrainedSession[] = [];
  for (const s of sessions) {
    const sets = await db.setEntries.where("sessionId").equals(s.id).toArray();
    trained.push({
      date: s.date,
      endedAt: s.endedAt as string,
      exerciseIds: [...new Set(sets.filter((x) => !x.isWarmup).map((x) => x.exerciseId))],
    });
    for (const set of sets) {
      if (set.notes) notes.push({ text: set.notes, date: s.date, endedAt: s.endedAt });
    }
  }
  for (const r of readiness) {
    if (r.notes) notes.push({ text: r.notes, date: r.date });
  }
  return activePainAreas(notes, trained, exercisesById, today);
}

export async function getUpcomingPlan(
  template: WorkoutTemplate,
  activeSessionId?: string,
  swaps?: Record<string, string>,
  painAreas: ActivePainArea[] = []
): Promise<UpcomingPlan> {
  const [views, settings, exercisesById] = await Promise.all([
    getTemplateExerciseViews(template.id),
    getSettings(),
    getExercisesById(),
  ]);

  const items: PlanItem[] = [];
  for (const view of views) {
    // Apply a per-session swap: the slot keeps its prescription (sets/reps/
    // rest/RIR — the training intent), while identity, history, and the
    // progression rule follow the substituted exercise.
    const swapId = swaps?.[view.templateExercise.id];
    const swapped = swapId ? exercisesById.get(swapId) : undefined;
    const exercise = swapped ?? view.exercise;
    const templateExercise: TemplateExercise = swapped
      ? {
          ...view.templateExercise,
          exerciseId: swapped.id,
          progressionRule: swapped.progressionRule,
          exerciseType: swapped.type,
          perSide: swapped.perSide,
        }
      : view.templateExercise;

    const alternatives = (view.templateExercise.alternativeExerciseIds ?? [])
      .map((id) => exercisesById.get(id))
      .filter((e): e is Exercise => !!e);

    const previousSets = await getPreviousExerciseSets(exercise.id, activeSessionId);
    const suggestion = suggestProgression(templateExercise, exercise, previousSets, settings);
    items.push({
      templateExercise,
      exercise,
      swappedFrom: swapped ? view.exercise : null,
      variants: alternatives.length ? [view.exercise, ...alternatives] : [],
      previousSets,
      previousStats: previousSets ? computeSetStats(previousSets) : null,
      suggestion,
      painLabels: [],
    });
  }

  const pain = adjustmentsForExercises(painAreas, items.map((i) => i.exercise));
  for (const item of items) {
    item.painLabels = pain
      .filter((a) => a.affected.some((e) => e.id === item.exercise.id))
      .map((a) => a.label);
  }
  return { template, items, pain };
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
      primaryMuscle: exercise.primaryMuscles?.[0] ?? exercise.name,
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

  // Pain this session's notes place in an area leads the flags, so the coach
  // mentions what changes next time (warm-ups + stretches; weights untouched).
  const notedAreas = activePainAreas(
    sets
      .filter((s) => !!s.notes)
      .map((s) => ({ text: s.notes as string, date: session.date, endedAt: session.endedAt })),
    [],
    exercisesById,
    session.date
  );
  flags.unshift(
    ...notedAreas.map((a) => ({
      kind: "pain-note" as const,
      severity: "warn" as const,
      ref: a.area,
      refLabel: a.label,
      message: `${a.label.charAt(0).toUpperCase()}${a.label.slice(1)}: you noted pain here. Your next workouts that load it add a warm-up set and a short stretch list until ${CLEAR_AFTER_CLEAN_SESSIONS} pain-free sessions. A cue to adjust, not a diagnosis.`,
    }))
  );

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
  const raw = await db.exercises.get(exerciseId);
  if (!raw) return null;
  const exercise = normalizeExercise(raw); // legacy rows must not crash the screen

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
