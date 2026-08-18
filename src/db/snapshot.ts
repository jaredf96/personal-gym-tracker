import { db } from "./db";

// Rolling local safety net. Before anything that could reduce data (sync
// reconcile, repair, import), we stash a compact snapshot of the LOG tables in
// localStorage. If workouts ever disappear again, they can be restored from
// here without touching the cloud.
//
// Only log data is snapshotted — program/reference rows are regenerated from
// the seed and would just waste space.

const KEY = "gym-tracker.snapshots";
const MAX_SNAPSHOTS = 5;

export interface Snapshot {
  takenAt: string;
  reason: string;
  sessions: unknown[];
  sets: unknown[];
  cardio: unknown[];
  bodyMetrics: unknown[];
  readiness: unknown[];
}

export interface SnapshotMeta {
  takenAt: string;
  reason: string;
  sessionCount: number;
  setCount: number;
}

function load(): Snapshot[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

function save(list: Snapshot[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SNAPSHOTS)));
  } catch {
    // Quota exceeded — drop the oldest and retry once.
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 2)));
    } catch {
      /* give up silently; snapshots are best-effort */
    }
  }
}

/** Capture a snapshot unless an identical-size one was taken very recently. */
export async function takeSnapshot(reason: string): Promise<void> {
  const [sessions, sets, cardio, bodyMetrics, readiness] = await Promise.all([
    db.workoutSessions.toArray(),
    db.setEntries.toArray(),
    db.cardioLogs.toArray(),
    db.bodyMetrics.toArray(),
    db.readinessLogs.toArray(),
  ]);
  if (sessions.length === 0 && sets.length === 0) return; // nothing worth saving

  const list = load();
  const newest = list[0];
  if (
    newest &&
    newest.sessions.length === sessions.length &&
    newest.sets.length === sets.length &&
    Date.now() - new Date(newest.takenAt).getTime() < 6 * 60 * 60 * 1000
  ) {
    return; // unchanged and recent — don't churn
  }

  list.unshift({
    takenAt: new Date().toISOString(),
    reason,
    sessions,
    sets,
    cardio,
    bodyMetrics,
    readiness,
  });
  save(list);
}

export function listSnapshots(): SnapshotMeta[] {
  return load().map((s) => ({
    takenAt: s.takenAt,
    reason: s.reason,
    sessionCount: s.sessions.length,
    setCount: s.sets.length,
  }));
}

/** Merge a snapshot back in (never deletes anything currently present). */
export async function restoreSnapshot(index: number): Promise<{ sessions: number; sets: number }> {
  const snap = load()[index];
  if (!snap) return { sessions: 0, sets: 0 };
  await db.transaction(
    "rw",
    [db.workoutSessions, db.setEntries, db.cardioLogs, db.bodyMetrics, db.readinessLogs],
    async () => {
      if (snap.sessions.length) await db.workoutSessions.bulkPut(snap.sessions as never[]);
      if (snap.sets.length) await db.setEntries.bulkPut(snap.sets as never[]);
      if (snap.cardio?.length) await db.cardioLogs.bulkPut(snap.cardio as never[]);
      if (snap.bodyMetrics?.length) await db.bodyMetrics.bulkPut(snap.bodyMetrics as never[]);
      if (snap.readiness?.length) await db.readinessLogs.bulkPut(snap.readiness as never[]);
    }
  );
  return { sessions: snap.sessions.length, sets: snap.sets.length };
}
