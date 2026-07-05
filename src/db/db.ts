import Dexie, { type Table } from "dexie";
import type {
  Exercise,
  WorkoutTemplate,
  TemplateExercise,
  WorkoutSession,
  SetEntry,
  CardioLog,
  BodyMetric,
  ReadinessLog,
  Settings,
  AiReport,
  VolumeTarget,
  ProgressionRuleInfo,
  WeeklyScheduleDay,
  ProgramMeta,
} from "../types";

// All app state lives in this single local IndexedDB database (no backend).
export class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;
  workoutTemplates!: Table<WorkoutTemplate, string>;
  templateExercises!: Table<TemplateExercise, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  setEntries!: Table<SetEntry, string>;
  cardioLogs!: Table<CardioLog, string>;
  bodyMetrics!: Table<BodyMetric, string>;
  readinessLogs!: Table<ReadinessLog, string>;
  settings!: Table<Settings, string>;
  aiReports!: Table<AiReport, string>;
  volumeTargets!: Table<VolumeTarget, string>;
  progressionRules!: Table<ProgressionRuleInfo, string>;
  weeklySchedule!: Table<WeeklyScheduleDay, string>;
  programMeta!: Table<ProgramMeta, string>;

  constructor() {
    super("gym-tracker");
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

    // v2: Max Productive split — new program tables + cardio logging.
    this.version(2).stores({
      exercises: "id, type, movementPattern, progressionRule",
      workoutTemplates: "id, sequenceOrder",
      templateExercises: "id, templateId, exerciseId, order",
      workoutSessions: "id, templateId, date, startedAt, endedAt",
      setEntries: "id, sessionId, exerciseId, createdAt, [exerciseId+createdAt]",
      cardioLogs: "id, date, createdAt",
      bodyMetrics: "id, date",
      readinessLogs: "id, date",
      personalNotes: "id, date, exerciseId, sessionId",
      settings: "id",
      aiReports: "id, sessionId, createdAt",
      swapGroups: "id, baseExercise, swapGroup",
      volumeTargets: "muscle",
      progressionRules: "rule",
      weeklySchedule: "id, dayIndex, templateId",
      programMeta: "id",
    });

    // v3: drop zombie tables. swapGroups (v1 concept) was superseded by
    // per-session swaps stored on workoutSessions; personalNotes never had UI.
    this.version(3).stores({
      swapGroups: null,
      personalNotes: null,
    });
  }
}

export const db = new GymDB();

// Tables included in JSON backup export/import and cloud sync. Adding a table
// here keeps backups + sync complete.
export const BACKUP_TABLES = [
  "exercises",
  "workoutTemplates",
  "templateExercises",
  "workoutSessions",
  "setEntries",
  "cardioLogs",
  "bodyMetrics",
  "readinessLogs",
  "settings",
  "aiReports",
  "volumeTargets",
  "progressionRules",
  "weeklySchedule",
  "programMeta",
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

// Program REFERENCE data: owned by the seeded program. Wiped + reseeded on a
// program version bump. Never contains user history.
export const REFERENCE_TABLES: BackupTableName[] = [
  "exercises",
  "workoutTemplates",
  "templateExercises",
  "volumeTargets",
  "progressionRules",
  "weeklySchedule",
  "programMeta",
];

// User LOG data: history, metrics, notes, preferences. NEVER wiped by a program
// upgrade — old sessions may reference retired exercises, which the UI tolerates.
export const LOG_TABLES: BackupTableName[] = BACKUP_TABLES.filter(
  (t) => !REFERENCE_TABLES.includes(t)
);
