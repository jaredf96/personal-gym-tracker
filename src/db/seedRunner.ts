import { db, REFERENCE_TABLES } from "./db";
import {
  SEED_VERSION,
  seedExercises,
  seedTemplates,
  seedTemplateExercises,
  seedVolumeTargets,
  seedWeeklySchedule,
  seedProgramMeta,
  seedProgressionRules,
} from "./seed";
import type { ProgramMeta, Settings, WeeklyScheduleDay } from "../types";
import { isLegacyExercise, normalizeExercise } from "./normalize";
import { todayISODate } from "../lib/dates";
import { takeSnapshot } from "./snapshot";

export interface RepairReport {
  normalizedExercises: number;
  removedOrphanExercises: number; // always 0 — kept for API compatibility
  closedStaleSessions: number;
}

/**
 * Heals data that predates the current model. STRICTLY NON-DESTRUCTIVE — it
 * only ever rewrites rows, never deletes them.
 *
 * (History: an earlier version deleted "empty" stale sessions and unused
 * legacy exercises. Because this runs at boot — BEFORE the first cloud pull —
 * a session whose sets had not downloaded yet looked empty and was deleted,
 * and the deletion then propagated to the cloud. Repair must never remove user
 * data to fix a rendering problem.)
 *
 *  - v1 exercise rows (primaryMuscle: string, no volumeMuscles/type) are
 *    rewritten to the current shape. Left raw they crash any screen that
 *    iterates the library or logged exercises (blank page). Unused legacy rows
 *    are normalized and kept; they are harmless once well-formed.
 *  - Sessions left open on a previous day that HAVE logged sets are finished
 *    at the last set, so a forgotten workout lands in history. Open sessions
 *    with no sets are left untouched — they show as in-progress on the
 *    calendar and can be discarded by hand.
 */
export async function repairData(): Promise<RepairReport> {
  await db.open();
  await takeSnapshot("before repair");
  const report: RepairReport = {
    normalizedExercises: 0,
    removedOrphanExercises: 0,
    closedStaleSessions: 0,
  };

  await db.transaction("rw", [db.exercises, db.setEntries, db.workoutSessions], async () => {
    const legacy = (await db.exercises.toArray()).filter(isLegacyExercise);
    if (legacy.length) {
      await db.exercises.bulkPut(legacy.map(normalizeExercise) as never[]);
      report.normalizedExercises = legacy.length;
    }

    // Finish sessions left open on an earlier day (only when sets exist).
    const today = todayISODate();
    const stale = (await db.workoutSessions.toArray()).filter((s) => !s.endedAt && s.date < today);
    for (const s of stale) {
      const sets = await db.setEntries.where("sessionId").equals(s.id).toArray();
      if (sets.length === 0) continue; // never delete — the sets may not be synced yet
      const lastAt = sets
        .map((x) => x.createdAt)
        .sort()
        .slice(-1)[0];
      await db.workoutSessions.put({
        ...s,
        endedAt: lastAt,
        notes: s.notes ?? "Auto-finished (left open overnight).",
      });
      report.closedStaleSessions += 1;
    }
  });

  return report;
}

export const SEED_VERSION_KEY = "gym-tracker.seedVersion";
export { SEED_VERSION };

export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  unit: "lb",
  weightIncrementUpper: 5,
  weightIncrementLower: 10,
  restTimerAutoStart: true,
  coachProvider: "mock",
};

// Writes the program reference data. When `wipeReference` is set, reference
// tables are cleared first so retired exercises/templates don't linger. User
// LOG tables (sessions, sets, cardio, metrics, notes, settings) are NEVER
// touched here — a program upgrade must not cost history.
async function seedReferenceData(wipeReference: boolean): Promise<void> {
  await db.open();
  await db.transaction("rw", db.tables, async () => {
    if (wipeReference) {
      for (const t of REFERENCE_TABLES) await db.table(t).clear();
    }
    await db.exercises.bulkPut(seedExercises);
    await db.workoutTemplates.bulkPut(seedTemplates);
    await db.templateExercises.bulkPut(seedTemplateExercises);
    await db.volumeTargets.bulkPut(seedVolumeTargets);
    await db.weeklySchedule.bulkPut(seedWeeklySchedule);
    await db.programMeta.put(seedProgramMeta);
    await db.progressionRules.bulkPut(seedProgressionRules);

    const existingSettings = await db.settings.get("app");
    if (!existingSettings) await db.settings.put(DEFAULT_SETTINGS);
  });
}

// Single-flight guard: main.tsx fires this without awaiting and the sync layer
// awaits it before reconciling — both must share one seeding pass, never two
// concurrent transactions.
let seedPromise: Promise<void> | null = null;

// Idempotent program seeding.
//  - Fresh install (no stored version): seed reference data. NOT an upgrade —
//    a device with empty localStorage must never trigger destructive paths.
//  - Stored version differs from SEED_VERSION: real program upgrade — wipe and
//    reseed REFERENCE tables only; logs are preserved.
//  - Same version: refresh reference rows in place (bulkPut upsert).
export function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const storedVersion = localStorage.getItem(SEED_VERSION_KEY);
    const isUpgrade = storedVersion !== null && storedVersion !== SEED_VERSION;
    await seedReferenceData(isUpgrade);
    // Heal legacy rows + forgotten sessions on every launch (cheap, idempotent).
    await repairData();
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
  })().catch((err) => {
    seedPromise = null; // don't cache a failure — the next caller retries
    throw err;
  });
  return seedPromise;
}

// Explicit re-seed (Settings "Refresh program data" button). Bypasses the
// single-flight cache and force-wipes reference tables before reseeding.
// NOTE for signed-in use: run inside withSyncPaused() and reconcile after —
// otherwise the reference-table clear() fires a per-row remote delete storm.
export async function reseedProgramData(): Promise<void> {
  await (seedPromise ?? Promise.resolve()).catch(() => {}); // a failed prior seed shouldn't block a reseed
  const p = seedReferenceData(true)
    .then(() => {
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    })
    .catch((err) => {
      seedPromise = null;
      throw err;
    });
  seedPromise = p;
  return p;
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("app");
  return s ?? DEFAULT_SETTINGS;
}

export async function getProgramMeta(): Promise<ProgramMeta | undefined> {
  return db.programMeta.get("program");
}

export async function getWeeklySchedule(): Promise<WeeklyScheduleDay[]> {
  return (await db.weeklySchedule.toArray()).sort((a, b) => a.dayIndex - b.dayIndex);
}
