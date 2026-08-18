import type { WorkoutTemplate, WorkoutSession } from "../types";
import { daysAgo } from "../lib/dates";

// Sequence-based rotation: Upper A -> Lower A -> Upper B -> Lower B -> repeat.
// "Next" is derived from the most recent COMPLETED session, so skipping days
// never breaks the rotation — there is no calendar dependency.
//
// Recency rule: after a long gap the old position stops being meaningful. If
// nothing has been logged for more than a week, the cycle restarts at the
// first workout rather than resuming mid-rotation.

/** Days of inactivity after which the cycle restarts from the beginning. */
export const ROTATION_RESET_DAYS = 7;

export interface RotationOptions {
  /** Injectable "today" for deterministic tests. */
  now?: Date;
  resetAfterDays?: number;
}

export type RotationReason =
  | "first" // nothing logged yet
  | "advance" // continuing the cycle from the last session
  | "reset"; // long gap — restarting the cycle

export interface RotationResult {
  template: WorkoutTemplate | null;
  reason: RotationReason;
  daysSinceLast: number | null;
  lastTemplate: WorkoutTemplate | null;
}

export function sortedBySequence(templates: WorkoutTemplate[]): WorkoutTemplate[] {
  return [...templates].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
}

/**
 * Where the user is in the cycle, and why.
 *
 * `lastCompleted` should be the most recent FINISHED session. Its date (not its
 * position alone) decides the outcome: a stale session restarts the cycle.
 */
export function resolveRotation(
  templates: WorkoutTemplate[],
  lastCompleted: WorkoutSession | null,
  opts: RotationOptions = {}
): RotationResult {
  const ordered = sortedBySequence(templates);
  if (ordered.length === 0) {
    return { template: null, reason: "first", daysSinceLast: null, lastTemplate: null };
  }

  if (!lastCompleted) {
    return { template: ordered[0], reason: "first", daysSinceLast: null, lastTemplate: null };
  }

  const gap = daysAgo(lastCompleted.date, opts.now ?? new Date());
  const resetAfter = opts.resetAfterDays ?? ROTATION_RESET_DAYS;
  const last = ordered.find((t) => t.id === lastCompleted.templateId) ?? null;

  // Long gap (or an unrecognized template) — start the cycle over.
  if (gap > resetAfter || !last) {
    return { template: ordered[0], reason: "reset", daysSinceLast: gap, lastTemplate: last };
  }

  const idx = ordered.findIndex((t) => t.id === last.id);
  return {
    template: ordered[(idx + 1) % ordered.length],
    reason: "advance",
    daysSinceLast: gap,
    lastTemplate: last,
  };
}

export function nextTemplate(
  templates: WorkoutTemplate[],
  lastCompleted: WorkoutSession | null,
  opts: RotationOptions = {}
): WorkoutTemplate | null {
  return resolveRotation(templates, lastCompleted, opts).template;
}

// The upcoming few workouts, for the "what's next" preview on the Today screen.
export function upcomingTemplates(
  templates: WorkoutTemplate[],
  lastCompleted: WorkoutSession | null,
  count: number,
  opts: RotationOptions = {}
): WorkoutTemplate[] {
  const ordered = sortedBySequence(templates);
  if (ordered.length === 0) return [];
  const next = nextTemplate(templates, lastCompleted, opts);
  if (!next) return [];
  const startIdx = ordered.findIndex((t) => t.id === next.id);
  const out: WorkoutTemplate[] = [];
  for (let i = 0; i < count; i++) {
    out.push(ordered[(startIdx + i) % ordered.length]);
  }
  return out;
}
