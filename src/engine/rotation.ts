import type { WorkoutTemplate, WorkoutSession } from "../types";

// Sequence-based rotation: Upper A -> Lower A -> Upper B -> Lower B -> repeat.
// The "next" workout is derived from the most recent COMPLETED session, so
// skipping days never breaks the rotation — there is no calendar dependency.

export function sortedBySequence(templates: WorkoutTemplate[]): WorkoutTemplate[] {
  return [...templates].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
}

export function nextTemplate(
  templates: WorkoutTemplate[],
  lastCompleted: WorkoutSession | null
): WorkoutTemplate | null {
  if (templates.length === 0) return null;
  const ordered = sortedBySequence(templates);
  if (!lastCompleted) return ordered[0];

  const last = ordered.find((t) => t.id === lastCompleted.templateId);
  if (!last) return ordered[0];

  // Advance to the next sequence position, wrapping around.
  const idx = ordered.findIndex((t) => t.id === last.id);
  return ordered[(idx + 1) % ordered.length];
}

// The upcoming few workouts, for the "what's next" preview on the Today screen.
export function upcomingTemplates(
  templates: WorkoutTemplate[],
  lastCompleted: WorkoutSession | null,
  count: number
): WorkoutTemplate[] {
  const ordered = sortedBySequence(templates);
  if (ordered.length === 0) return [];
  const next = nextTemplate(templates, lastCompleted);
  if (!next) return [];
  const startIdx = ordered.findIndex((t) => t.id === next.id);
  const out: WorkoutTemplate[] = [];
  for (let i = 0; i < count; i++) {
    out.push(ordered[(startIdx + i) % ordered.length]);
  }
  return out;
}
