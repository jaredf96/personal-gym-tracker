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
  PersonalNote,
  Settings,
  AiReport,
  SwapGroup,
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
  personalNotes!: Table<PersonalNote, string>;
  settings!: Table<Settings, string>;
  aiReports!: Table<AiReport, string>;
  swapGroups!: Table<SwapGroup, string>;
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
  "personalNotes",
  "settings",
  "aiReports",
  "swapGroups",
  "volumeTargets",
  "progressionRules",
  "weeklySchedule",
  "programMeta",
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

// Tables wiped on a program version change (everything except user preferences).
export const PROGRAM_DATA_TABLES = BACKUP_TABLES.filter((t) => t !== "settings");
