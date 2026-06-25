import { db } from "./db";
import {
  seedExercises,
  seedTemplates,
  seedTemplateExercises,
  seedSwapGroups,
  seedVolumeTargets,
  seedProgressionRules,
  seedSampleSession,
  seedSampleSets,
} from "./seed";
import type { Settings, WorkoutSession, SetEntry } from "../types";
import { todayISODate } from "../lib/dates";

// The workbook sample log is dated "today"; anchor it a few days in the past with
// proper UTC timestamps so it reads as a genuine previous session and sorts
// correctly against anything the user logs today.
function sampleInThePast(daysAgo = 3): { session: WorkoutSession; sets: SetEntry[] } {
  const base = new Date();
  base.setDate(base.getDate() - daysAgo);
  base.setHours(18, 0, 0, 0);
  const session: WorkoutSession = {
    ...seedSampleSession,
    date: todayISODate(base),
    startedAt: base.toISOString(),
    endedAt: new Date(base.getTime() + 42 * 60_000).toISOString(),
  };
  const sets = seedSampleSets.map((s, i) => ({
    ...s,
    createdAt: new Date(base.getTime() + i * 2 * 60_000).toISOString(),
  }));
  return { session, sets };
}

export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  unit: "lb",
  weightIncrementUpper: 5, // smallest practical jump for upper-body / isolation
  weightIncrementLower: 10, // heavier compounds can take a bigger jump
  restTimerAutoStart: true,
  coachProvider: "mock",
};

// Loads workbook-derived seed data into IndexedDB exactly once.
// Reference tables (library/templates/targets) are kept in sync on every launch
// so editing the workbook + regenerating is reflected, but user-logged data is
// never touched. The one-time sample session only loads on a truly fresh DB.
export async function ensureSeeded(): Promise<void> {
  await db.open();

  const exerciseCount = await db.exercises.count();
  const freshInstall = exerciseCount === 0;

  await db.transaction(
    "rw",
    [
      db.exercises,
      db.workoutTemplates,
      db.templateExercises,
      db.swapGroups,
      db.volumeTargets,
      db.progressionRules,
      db.settings,
      db.workoutSessions,
      db.setEntries,
    ],
    async () => {
      // bulkPut = upsert: keeps reference data current without clobbering logs.
      await db.exercises.bulkPut(seedExercises);
      await db.workoutTemplates.bulkPut(seedTemplates);
      await db.templateExercises.bulkPut(seedTemplateExercises);
      await db.swapGroups.bulkPut(seedSwapGroups);
      await db.volumeTargets.bulkPut(seedVolumeTargets);
      await db.progressionRules.bulkPut(seedProgressionRules);

      const existingSettings = await db.settings.get("app");
      if (!existingSettings) {
        await db.settings.put(DEFAULT_SETTINGS);
      }

      if (freshInstall) {
        const sample = sampleInThePast(3);
        await db.workoutSessions.put(sample.session);
        await db.setEntries.bulkPut(sample.sets);
      }
    }
  );
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("app");
  return s ?? DEFAULT_SETTINGS;
}
