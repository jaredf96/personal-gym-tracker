// Core domain types for the gym tracker.
// These mirror the "Suggested App Seed Data" sheet in the workbook and are the
// single source of truth for both the Dexie schema and the training engine.

export type Unit = "lb" | "kg";

export type ProgressionRuleName =
  | "Double Progression"
  | "Rep Progression"
  | "Conservative Progression";

export type TemplateType = "Upper" | "Lower";

// ---------------------------------------------------------------------------
// Library / template data (seeded from the workbook, editable later)
// ---------------------------------------------------------------------------

export interface Exercise {
  id: string; // slug, e.g. "incline-db-press"
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  movementPattern: string; // "Press" | "Hinge" | "Squat/Knee" | "Row/Pull" | "Isolation/Core"
  defaultRepMin: number;
  defaultRepMax: number;
  defaultRestSeconds: number;
  progressionRule: ProgressionRuleName;
}

export interface WorkoutTemplate {
  id: string; // e.g. "upper-a"
  name: string; // "Upper A"
  type: TemplateType;
  sequenceOrder: number; // 1..N rotation position
}

export interface TemplateExercise {
  id: string; // `${templateId}:${order}`
  templateId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  progressionRule: ProgressionRuleName;
  isMainLift: boolean; // workbook "Main Beat Target?"
  notes?: string;
}

// ---------------------------------------------------------------------------
// Logged data (created by the user in the app)
// ---------------------------------------------------------------------------

export interface WorkoutSession {
  id: string;
  templateId: string;
  date: string; // YYYY-MM-DD
  startedAt: string; // ISO timestamp
  endedAt?: string; // ISO timestamp; presence => session completed
  notes?: string;
}

export interface SetEntry {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number; // reps in reserve
  isWarmup: boolean;
  notes?: string;
  createdAt: string; // ISO timestamp
}

export interface BodyMetric {
  id: string;
  date: string; // YYYY-MM-DD
  bodyweight?: number;
  waist?: number;
  notes?: string;
}

export interface ReadinessLog {
  id: string;
  date: string; // YYYY-MM-DD
  sleep?: number; // 1-5
  energy?: number; // 1-5
  soreness?: number; // 1-5
  stress?: number; // 1-5
  alcoholYesterday?: boolean;
  notes?: string;
}

export interface PersonalNote {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  exerciseId?: string;
  sessionId?: string;
}

export interface Settings {
  id: "app";
  unit: Unit;
  // "smallest practical jump" used by the progression engine.
  weightIncrementUpper: number;
  weightIncrementLower: number;
  restTimerAutoStart: boolean;
  coachProvider: string; // 'mock' for now
}

export interface AiReport {
  id: string;
  sessionId?: string;
  createdAt: string; // ISO timestamp
  provider: string;
  context: unknown; // CoachContext snapshot (see src/ai/types.ts)
  headline: string;
  summary: string;
  bullets: string[];
}

// ---------------------------------------------------------------------------
// Reference seed data (workbook sheets kept as editable tables)
// ---------------------------------------------------------------------------

export interface SwapGroup {
  id: string;
  baseExercise: string;
  swapOption: string;
  swapGroup: string;
  countsToward: string;
  comparisonRule: string;
  notes?: string;
}

export interface VolumeTarget {
  muscle: string; // primary key
  minSets: number;
  maxSets: number;
  directPrimarySets: number; // baseline from the workbook
  notes?: string;
}

export interface ProgressionRuleInfo {
  rule: string; // primary key
  usedFor: string;
  trigger: string;
  suggestion: string;
  notes: string;
}
