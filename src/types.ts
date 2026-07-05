// Core domain types for the gym tracker (v2: Max Productive Upper/Lower split).
// The seed is generated from program/max_volume_upper_lower_program.md.

export type Unit = "lb" | "kg";

export type ProgressionRuleName =
  | "Double Progression"
  | "Rep Progression"
  | "Conservative Progression";

export type TemplateType = "Upper" | "Lower";

export type ExerciseType = "compound" | "isolation";

// ---------------------------------------------------------------------------
// Library / template data (seeded from the program, editable later)
// ---------------------------------------------------------------------------

export interface Exercise {
  id: string; // slug, e.g. "incline-dumbbell-press"
  name: string;
  type: ExerciseType;
  primaryMuscles: string[]; // raw, for display (e.g. ["quads","glutes"])
  secondaryMuscles: string[];
  // Canonical weekly-volume target keys this exercise's working sets count toward.
  volumeMuscles: string[];
  // Targets that earn HALF credit per set (program counts some secondary work,
  // e.g. glutes on hinges/squats).
  secondaryVolumeMuscles: string[];
  movementPattern: string; // "Press" | "Hinge" | "Squat/Knee" | "Row/Pull" | "Isolation/Core"
  defaultRepMin: number;
  defaultRepMax: number;
  perSide: boolean; // "each leg/side"
  defaultRestMin: number;
  defaultRestMax: number;
  rirTarget: string; // e.g. "1-2"
  defaultWarmupSets: number;
  progressionRule: ProgressionRuleName;
  equipment?: string;
  note?: string;
}

export interface WorkoutTemplate {
  id: string; // e.g. "upper-a"
  name: string; // "Upper A"
  type: TemplateType;
  sequenceOrder: number; // 1..N rotation position
  color: string; // hex, for calendar / theming
  estMinMinutes: number;
  estMaxMinutes: number;
}

export interface TemplateExercise {
  id: string; // `${templateId}:${order}`
  templateId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  perSide: boolean;
  restMin: number;
  restMax: number;
  rirTarget: string;
  warmupSets: number; // suggested uncounted ramp sets
  countsTowardVolume: boolean;
  progressionRule: ProgressionRuleName;
  exerciseType: ExerciseType;
  isMainLift: boolean;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Schedule + program meta
// ---------------------------------------------------------------------------

export type DayType = "workout" | "cardio" | "rest" | "cardio_or_rest";

export interface WeeklyScheduleDay {
  id: string; // weekday name lowercased
  dayIndex: number; // 0 = Monday ... 6 = Sunday
  day: string; // "Monday"
  type: DayType;
  templateId?: string; // for workout days
  label: string;
  cardioMinMinutes?: number;
  cardioMaxMinutes?: number;
  note?: string;
}

export interface DeloadConfig {
  triggers: string[];
  reduceMinPercent: number;
  reduceMaxPercent: number;
  durationWeeks: number;
  keepMovementPatterns: boolean;
  avoidFailure: boolean;
}

export interface ProgramMeta {
  id: "program";
  name: string;
  version: string;
  seedVersion: string;
  experienceLevel: string;
  goal: string;
  philosophy: {
    compoundRIR: string;
    isolationRIR: string;
    avoidTrueFailureOn: string[];
    warmupsCountTowardVolume: boolean;
  };
  deload: DeloadConfig;
  warmup: {
    firstCompoundRampSets: number;
    firstCompoundRampPercents: number[];
    secondHeavyCompoundRampSets: number;
    lowerDayActivation: string[];
    countsTowardVolume: boolean;
  };
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
  isDeload?: boolean;
}

export interface SetEntry {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number; // reps in reserve
  isWarmup: boolean; // excluded from volume + progression math
  notes?: string;
  createdAt: string; // ISO timestamp
}

export interface CardioLog {
  id: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  kind: string; // e.g. "Zone 2"
  notes?: string;
  createdAt: string;
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
  weightIncrementUpper: number;
  weightIncrementLower: number;
  restTimerAutoStart: boolean;
  coachProvider: string;
}

export interface AiReport {
  id: string;
  sessionId?: string;
  createdAt: string;
  provider: string;
  context: unknown;
  headline: string;
  summary: string;
  bullets: string[];
}

// ---------------------------------------------------------------------------
// Reference seed data
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
  muscle: string; // canonical key e.g. "back_lats_upper_back"
  label: string; // display, e.g. "Back / Lats"
  targetSets: number; // weekly prescribed target
  minSets: number; // in-range band floor
  maxSets: number; // in-range band ceiling
  note?: string;
}

export interface ProgressionRuleInfo {
  rule: string;
  usedFor: string;
  trigger: string;
  suggestion: string;
  notes: string;
}
