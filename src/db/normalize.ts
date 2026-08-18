import type { Exercise } from "../types";

// ---------------------------------------------------------------------------
// Legacy row normalization.
//
// v1 exercises had `primaryMuscle: string` and no `volumeMuscles` / `type`.
// Those rows can still exist locally or in the cloud (they use different ids
// than the v2 program — e.g. "incline-db-press" vs "incline-dumbbell-press" —
// so the v2 seed upsert never overwrites them), and any screen that iterates
// the whole library or the user's logged exercises would throw on the missing
// arrays and render a blank page.
//
// Rather than dropping them (their logged sets are real history), we migrate
// them to the current shape on read and repair them in place at startup.
// ---------------------------------------------------------------------------

// Same mapping the program generator uses, so legacy rows land in the right
// weekly-volume buckets.
const MUSCLE_TO_TARGET: Record<string, string> = {
  chest: "chest",
  back: "back_lats_upper_back",
  lats: "back_lats_upper_back",
  "upper back": "back_lats_upper_back",
  "side delts": "side_delts",
  "rear delts": "rear_delts",
  "front delts": "front_delts",
  shoulders: "front_delts",
  biceps: "biceps",
  triceps: "triceps",
  quads: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  calves: "calves",
  abs: "abs_core",
  core: "abs_core",
  obliques: "abs_core",
};

function toVolumeMuscles(muscles: string[]): string[] {
  const out: string[] = [];
  for (const m of muscles) {
    const key = MUSCLE_TO_TARGET[m.trim().toLowerCase()];
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}

/** True when a stored row is missing any field the current UI dereferences. */
export function isLegacyExercise(raw: unknown): boolean {
  const r = raw as Record<string, unknown> | null;
  if (!r) return true;
  return (
    !Array.isArray(r.primaryMuscles) ||
    !Array.isArray(r.volumeMuscles) ||
    !Array.isArray(r.secondaryMuscles) ||
    typeof r.type !== "string"
  );
}

/**
 * Coerce any stored exercise row into the current `Exercise` shape.
 * Total function: never throws, always returns something renderable.
 */
export function normalizeExercise(raw: unknown): Exercise {
  const r = (raw ?? {}) as Record<string, unknown>;

  const primaryMuscles = Array.isArray(r.primaryMuscles)
    ? (r.primaryMuscles as string[])
    : typeof r.primaryMuscle === "string" && r.primaryMuscle
    ? [r.primaryMuscle as string]
    : [];

  const secondaryMuscles = Array.isArray(r.secondaryMuscles)
    ? (r.secondaryMuscles as string[])
    : [];

  const volumeMuscles = Array.isArray(r.volumeMuscles)
    ? (r.volumeMuscles as string[])
    : toVolumeMuscles(primaryMuscles);

  const repMin = typeof r.defaultRepMin === "number" ? r.defaultRepMin : 8;
  const repMax = typeof r.defaultRepMax === "number" ? r.defaultRepMax : 12;
  // v1 stored a single defaultRestSeconds.
  const legacyRest = typeof r.defaultRestSeconds === "number" ? r.defaultRestSeconds : 90;
  const restMin = typeof r.defaultRestMin === "number" ? r.defaultRestMin : legacyRest;
  const restMax = typeof r.defaultRestMax === "number" ? r.defaultRestMax : legacyRest;

  const rule = r.progressionRule;
  const progressionRule =
    rule === "Double Progression" || rule === "Rep Progression" || rule === "Conservative Progression"
      ? rule
      : "Rep Progression";

  const pattern = typeof r.movementPattern === "string" ? r.movementPattern : "Isolation/Core";
  const type =
    r.type === "compound" || r.type === "isolation"
      ? r.type
      : progressionRule === "Rep Progression"
      ? "isolation"
      : "compound";

  return {
    id: typeof r.id === "string" ? r.id : "unknown-exercise",
    name: typeof r.name === "string" ? r.name : "Unknown exercise",
    type,
    primaryMuscles,
    secondaryMuscles,
    volumeMuscles,
    secondaryVolumeMuscles: Array.isArray(r.secondaryVolumeMuscles)
      ? (r.secondaryVolumeMuscles as string[])
      : [],
    movementPattern: pattern,
    defaultRepMin: repMin,
    defaultRepMax: repMax,
    perSide: typeof r.perSide === "boolean" ? r.perSide : false,
    defaultRestMin: restMin,
    defaultRestMax: restMax,
    rirTarget: typeof r.rirTarget === "string" ? r.rirTarget : "1-2",
    defaultWarmupSets: typeof r.defaultWarmupSets === "number" ? r.defaultWarmupSets : 0,
    progressionRule,
    equipment: typeof r.equipment === "string" ? r.equipment : undefined,
    note: typeof r.note === "string" ? r.note : undefined,
  };
}

/** Display helper — safe even if a row somehow escaped normalization. */
export function muscleLabel(e: Pick<Exercise, "primaryMuscles" | "name">): string {
  const list = Array.isArray(e.primaryMuscles) ? e.primaryMuscles : [];
  return list.length ? list.join(" / ") : "—";
}
