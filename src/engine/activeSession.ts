import type { WorkoutSession } from "../types";

/**
 * Whether an unfinished session counts as the workout "in progress".
 *
 * Only when it is from today or already has sets. An empty session left open on
 * an earlier day (a backfill that was never filled in, an old tap on Start)
 * stays visible on the calendar, where it can be opened and discarded, but must
 * not take over Today or block starting another workout. It is never deleted
 * automatically: its sets may simply not have synced down yet.
 */
export function isLiveOpenSession(
  session: WorkoutSession,
  setCount: number,
  today: string
): boolean {
  if (session.endedAt) return false;
  return session.date >= today || setCount > 0;
}
