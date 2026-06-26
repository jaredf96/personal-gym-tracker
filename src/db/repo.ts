import { db } from "./db";
import { getSettings, getProgramMeta, getWeeklySchedule } from "./seedRunner";
import { uid } from "../lib/id";
import { nowISO, todayISODate } from "../lib/dates";
import type {
  BodyMetric,
  CardioLog,
  Exercise,
  PersonalNote,
  ReadinessLog,
  SetEntry,
  TemplateExercise,
  WorkoutSession,
  WorkoutTemplate,
} from "../types";
import { nextTemplate } from "../engine/rotation";
import { weeklyVolumeByMuscle, type MuscleVolume } from "../engine/volume";

export interface TemplateExerciseView {
  templateExercise: TemplateExercise;
  exercise: Exercise;
}

export interface SessionWithSets {
  session: WorkoutSession;
  sets: SetEntry[];
}

// ---------------------------------------------------------------------------
// Templates & exercises
// ---------------------------------------------------------------------------

export async function listTemplates(): Promise<WorkoutTemplate[]> {
  return db.workoutTemplates.orderBy("sequenceOrder").toArray();
}

export async function getExercisesById(): Promise<Map<string, Exercise>> {
  const all = await db.exercises.toArray();
  return new Map(all.map((e) => [e.id, e]));
}

export async function getTemplateExerciseViews(
  templateId: string
): Promise<TemplateExerciseView[]> {
  const tes = await db.templateExercises.where("templateId").equals(templateId).sortBy("order");
  const byId = await getExercisesById();
  return tes
    .map((te) => {
      const exercise = byId.get(te.exerciseId);
      return exercise ? { templateExercise: te, exercise } : null;
    })
    .filter((x): x is TemplateExerciseView => x !== null);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function getActiveSession(): Promise<WorkoutSession | null> {
  // A session with no endedAt is "in progress".
  const open = await db.workoutSessions.filter((s) => !s.endedAt).toArray();
  open.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return open[0] ?? null;
}

export async function getLastCompletedSession(): Promise<WorkoutSession | null> {
  const done = await db.workoutSessions.filter((s) => !!s.endedAt).toArray();
  done.sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));
  return done[0] ?? null;
}

export async function getNextTemplate(): Promise<{
  template: WorkoutTemplate | null;
  lastCompleted: WorkoutSession | null;
}> {
  const [templates, lastCompleted] = await Promise.all([
    listTemplates(),
    getLastCompletedSession(),
  ]);
  return { template: nextTemplate(templates, lastCompleted), lastCompleted };
}

export async function startSession(templateId: string): Promise<WorkoutSession> {
  // Reuse an existing in-progress session for the same template if present.
  const active = await getActiveSession();
  if (active && active.templateId === templateId) return active;

  const session: WorkoutSession = {
    id: uid("session"),
    templateId,
    date: todayISODate(),
    startedAt: nowISO(),
  };
  await db.workoutSessions.put(session);
  return session;
}

export async function finishSession(sessionId: string, notes?: string): Promise<void> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session) return;
  await db.workoutSessions.put({ ...session, endedAt: nowISO(), notes: notes ?? session.notes });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.transaction("rw", [db.workoutSessions, db.setEntries, db.aiReports], async () => {
    await db.setEntries.where("sessionId").equals(sessionId).delete();
    await db.aiReports.where("sessionId").equals(sessionId).delete();
    await db.workoutSessions.delete(sessionId);
  });
}

export async function getSetsForSession(sessionId: string): Promise<SetEntry[]> {
  const sets = await db.setEntries.where("sessionId").equals(sessionId).toArray();
  return sets.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ---------------------------------------------------------------------------
// Set entries
// ---------------------------------------------------------------------------

export async function addSetEntry(
  input: Omit<SetEntry, "id" | "createdAt"> & Partial<Pick<SetEntry, "createdAt">>
): Promise<SetEntry> {
  const entry: SetEntry = { ...input, id: uid("set"), createdAt: input.createdAt ?? nowISO() };
  await db.setEntries.put(entry);
  return entry;
}

export async function updateSetEntry(entry: SetEntry): Promise<void> {
  await db.setEntries.put(entry);
}

export async function deleteSetEntry(id: string): Promise<void> {
  await db.setEntries.delete(id);
}

// ---------------------------------------------------------------------------
// Exercise history helpers (used by history screen, progression, coach)
// ---------------------------------------------------------------------------

// All sessions in which an exercise was performed, newest first, each with the
// sets for that exercise only.
export async function getExerciseSessionHistory(
  exerciseId: string
): Promise<SessionWithSets[]> {
  const sets = await db.setEntries.where("exerciseId").equals(exerciseId).toArray();
  if (sets.length === 0) return [];
  const bySession = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const list = bySession.get(s.sessionId) ?? [];
    list.push(s);
    bySession.set(s.sessionId, list);
  }
  const sessions = await db.workoutSessions.bulkGet([...bySession.keys()]);
  const out: SessionWithSets[] = [];
  for (const session of sessions) {
    if (!session) continue;
    const setList = (bySession.get(session.id) ?? []).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    out.push({ session, sets: setList });
  }
  // newest first by startedAt
  return out.sort((a, b) => b.session.startedAt.localeCompare(a.session.startedAt));
}

// The sets from the previous time this exercise was performed, excluding the
// given session. Used for last-session comparison + progression suggestions.
export async function getPreviousExerciseSets(
  exerciseId: string,
  excludeSessionId?: string
): Promise<SetEntry[] | null> {
  const history = await getExerciseSessionHistory(exerciseId);
  const prior = history.find((h) => h.session.id !== excludeSessionId);
  return prior ? prior.sets : null;
}

// Distinct exercises that have any logged sets (for the history list).
export async function getLoggedExercises(): Promise<Exercise[]> {
  const sets = await db.setEntries.toArray();
  const ids = new Set(sets.map((s) => s.exerciseId));
  const byId = await getExercisesById();
  return [...ids].map((id) => byId.get(id)).filter((e): e is Exercise => !!e);
}

// ---------------------------------------------------------------------------
// Body metrics, readiness, notes
// ---------------------------------------------------------------------------

export async function listBodyMetrics(): Promise<BodyMetric[]> {
  return (await db.bodyMetrics.toArray()).sort((a, b) => b.date.localeCompare(a.date));
}

export async function addBodyMetric(input: Omit<BodyMetric, "id">): Promise<void> {
  await db.bodyMetrics.put({ ...input, id: uid("bm") });
}

export async function deleteBodyMetric(id: string): Promise<void> {
  await db.bodyMetrics.delete(id);
}

export async function listReadiness(): Promise<ReadinessLog[]> {
  return (await db.readinessLogs.toArray()).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getReadinessForDate(date: string): Promise<ReadinessLog | null> {
  const all = await db.readinessLogs.where("date").equals(date).toArray();
  return all[0] ?? null;
}

export async function upsertReadiness(input: Omit<ReadinessLog, "id">): Promise<void> {
  const existing = await getReadinessForDate(input.date);
  await db.readinessLogs.put({ ...input, id: existing?.id ?? uid("rd") });
}

export async function listNotes(): Promise<PersonalNote[]> {
  return (await db.personalNotes.toArray()).sort((a, b) => b.date.localeCompare(a.date));
}

export async function addNote(input: Omit<PersonalNote, "id">): Promise<void> {
  await db.personalNotes.put({ ...input, id: uid("note") });
}

export async function deleteNote(id: string): Promise<void> {
  await db.personalNotes.delete(id);
}

// ---------------------------------------------------------------------------
// Weekly volume (dashboard + coach context)
// ---------------------------------------------------------------------------

export async function getWeeklyVolume(reference = new Date()): Promise<MuscleVolume[]> {
  const [sets, sessions, exercisesById, targets] = await Promise.all([
    db.setEntries.toArray(),
    db.workoutSessions.toArray(),
    getExercisesById(),
    db.volumeTargets.toArray(),
  ]);
  return weeklyVolumeByMuscle(sets, sessions, exercisesById, targets, reference);
}

// ---------------------------------------------------------------------------
// Cardio logs
// ---------------------------------------------------------------------------

export async function listCardioLogs(): Promise<CardioLog[]> {
  return (await db.cardioLogs.toArray()).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getCardioForDate(date: string): Promise<CardioLog[]> {
  return db.cardioLogs.where("date").equals(date).toArray();
}

export async function addCardioLog(
  input: Omit<CardioLog, "id" | "createdAt">
): Promise<CardioLog> {
  const entry: CardioLog = { ...input, id: uid("cardio"), createdAt: nowISO() };
  await db.cardioLogs.put(entry);
  return entry;
}

export async function deleteCardioLog(id: string): Promise<void> {
  await db.cardioLogs.delete(id);
}

export { getSettings, getProgramMeta, getWeeklySchedule };
