import Dexie, { type Table } from "dexie";
import type {
  Exercise,
  WorkoutTemplate,
  TemplateExercise,
  WorkoutSession,
  SetEntry,
  BodyMetric,
  ReadinessLog,
  PersonalNote,
  Settings,
  AiReport,
  SwapGroup,
  VolumeTarget,
  ProgressionRuleInfo,
} from "../types";

// All app state lives in this single local IndexedDB database (no backend).
export class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;
  workoutTemplates!: Table<WorkoutTemplate, string>;
  templateExercises!: Table<TemplateExercise, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  setEntries!: Table<SetEntry, string>;
  bodyMetrics!: Table<BodyMetric, string>;
  readinessLogs!: Table<ReadinessLog, string>;
  personalNotes!: Table<PersonalNote, string>;
  settings!: Table<Settings, string>;
  aiReports!: Table<AiReport, string>;
  swapGroups!: Table<SwapGroup, string>;
  volumeTargets!: Table<VolumeTarget, string>;
  progressionRules!: Table<ProgressionRuleInfo, string>;

  constructor() {
    super("gym-tracker");
    // Only fields used in queries need to be indexed. Compound + multi-entry
    // indexes are listed where the engine filters on them.
    this.version(1).stores({
      exercises: "id, primaryMuscle, movementPattern, progressionRule",
      workoutTemplates: "id, sequenceOrder",
      templateExercises: "id, templateId, exerciseId, order",
      workoutSessions: "id, templateId, date, startedAt, endedAt",
      setEntries: "id, sessionId, exerciseId, createdAt, [exerciseId+createdAt]",
      bodyMetrics: "id, date",
      readinessLogs: "id, date",
      personalNotes: "id, date, exerciseId, sessionId",
      settings: "id",
      aiReports: "id, sessionId, createdAt",
      swapGroups: "id, baseExercise, swapGroup",
      volumeTargets: "muscle",
      progressionRules: "rule",
    });
  }
}

export const db = new GymDB();

// Named tables list used by the JSON backup export/import so adding a table in
// one place keeps backups complete.
export const BACKUP_TABLES = [
  "exercises",
  "workoutTemplates",
  "templateExercises",
  "workoutSessions",
  "setEntries",
  "bodyMetrics",
  "readinessLogs",
  "personalNotes",
  "settings",
  "aiReports",
  "swapGroups",
  "volumeTargets",
  "progressionRules",
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];
