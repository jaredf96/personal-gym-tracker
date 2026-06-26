import { db, PROGRAM_DATA_TABLES } from "./db";
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

export const SEED_VERSION_KEY = "gym-tracker.seedVersion";

export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  unit: "lb",
  weightIncrementUpper: 5,
  weightIncrementLower: 10,
  restTimerAutoStart: true,
  coachProvider: "mock",
};

// Returns true when this launch performed a program upgrade (wipe + reseed).
// The sync layer uses this to know it must reset the cloud copy too.
export function didUpgradeProgram(): boolean {
  return upgradedThisLaunch;
}
let upgradedThisLaunch = false;

// Loads the program seed into IndexedDB. On a program version change it wipes
// all program/log data (keeping user preferences) and reseeds — the clean
// migration path the user approved. On normal launches it just keeps reference
// data current (idempotent) and never touches logged data.
export async function ensureSeeded(): Promise<void> {
  await db.open();

  const storedVersion = localStorage.getItem(SEED_VERSION_KEY);
  const upgrade = storedVersion !== SEED_VERSION;
  upgradedThisLaunch = upgrade;

  await db.transaction("rw", db.tables, async () => {
    if (upgrade) {
      // Wipe everything except settings, then reseed the new program.
      for (const t of PROGRAM_DATA_TABLES) await db.table(t).clear();
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

  if (upgrade) localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
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
