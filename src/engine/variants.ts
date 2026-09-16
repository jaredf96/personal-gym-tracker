import type { TemplateExercise } from "../types";

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
