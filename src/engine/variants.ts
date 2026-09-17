import type { Exercise, TemplateExercise } from "../types";

/**
 * Which slot variants a new session starts on: for slots that declare
 * alternatives, whatever was used the last time this workout was completed.
 * Ordinary swaps (a machine was taken) are not carried — only a program-declared
 * alternative, so a one-off substitution never becomes the new default.
 */
export function carryVariantSwaps(
  slots: TemplateExercise[],
  lastSwaps: Record<string, string> | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!lastSwaps) return out;
  for (const slot of slots) {
    const used = lastSwaps[slot.id];
    if (used && slot.alternativeExerciseIds?.includes(used)) out[slot.id] = used;
  }
  return out;
}

/**
 * A slot swapped to another exercise keeps its prescription (sets/reps/rest/
 * RIR — the training intent), while identity, history, and the progression
 * rule follow the substituted exercise.
 */
export function swappedSlot(slot: TemplateExercise, exercise: Exercise): TemplateExercise {
  return {
    ...slot,
    exerciseId: exercise.id,
    progressionRule: exercise.progressionRule,
    exerciseType: exercise.type,
    perSide: exercise.perSide,
  };
}

/**
 * The slot each exercise in a session was logged under, so a finished session
 * is graded the way the logger prescribed it: Cable Fly swapped into Upper A's
 * fly slot is judged against that slot's sets and reps, not its own defaults.
 * A default exercise keeps its slot even when swapped away (sets logged before
 * the toggle).
 */
export function slotsByExercise(
  slots: { templateExercise: TemplateExercise; exercise: Exercise }[],
  swaps: Record<string, string> | undefined,
  exercisesById: Map<string, Exercise>
): Map<string, TemplateExercise> {
  const out = new Map(slots.map((s) => [s.exercise.id, s.templateExercise]));
  for (const { templateExercise } of slots) {
    const swapId = swaps?.[templateExercise.id];
    const swapped = swapId ? exercisesById.get(swapId) : undefined;
    if (swapped && !out.has(swapped.id)) out.set(swapped.id, swappedSlot(templateExercise, swapped));
  }
  return out;
}
