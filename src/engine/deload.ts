import {
  getLoggedExercises,
  getExerciseSessionHistory,
  listReadiness,
  getProgramMeta,
} from "../db/repo";
import { db } from "../db/db";
import { detectFatigue } from "./flags";
import { hasPainNote } from "./stats";
import { daysAgo } from "../lib/dates";

// Deterministic deload assessment from the program's triggers:
//  - a movement pattern dropping for 2 consecutive exposures
//  - repeated joint pain / soreness logged
//  - poor readiness alongside falling performance
// Prescription comes from the program meta (cut sets X-Y% for a week).

export interface DeloadAssessment {
  recommended: boolean;
  reasons: string[];
  fatiguedLifts: string[];
  prescription: string | null;
}

export async function getDeloadAssessment(): Promise<DeloadAssessment> {
  const [exercises, readiness, meta, sessions] = await Promise.all([
    getLoggedExercises(),
    listReadiness(),
    getProgramMeta(),
    db.workoutSessions.filter((s) => !!s.endedAt).toArray(),
  ]);

  const reasons: string[] = [];

  // Need a couple weeks of data before suggesting a deload.
  if (sessions.length < 4) {
    return { recommended: false, reasons: [], fatiguedLifts: [], prescription: null };
  }

  // 1. Lifts regressing two sessions in a row.
  const fatiguedLifts: string[] = [];
  for (const ex of exercises) {
    const history = await getExerciseSessionHistory(ex.id); // newest first
    const oldToNew = history.map((h) => h.sets).reverse();
    if (detectFatigue(ex.id, ex.name, oldToNew)) fatiguedLifts.push(ex.name);
  }
  if (fatiguedLifts.length >= 2) {
    reasons.push(
      `${fatiguedLifts.length} lifts down 2 sessions running (${fatiguedLifts.slice(0, 3).join(", ")})`
    );
  }

  // 2. Repeated discomfort notes across recent sessions.
  const recent = [...sessions].sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? "")).slice(0, 4);
  let painSessions = 0;
  for (const s of recent) {
    const sets = await db.setEntries.where("sessionId").equals(s.id).toArray();
    if (hasPainNote([...sets.map((x) => x.notes), s.notes])) painSessions += 1;
  }
  if (painSessions >= 2) {
    reasons.push("Discomfort noted in multiple recent sessions");
  }

  // 3. Poor readiness alongside falling performance — within the last 7 DAYS
  // (not the last 7 entries, which could reach weeks into the past).
  const lowReadiness = readiness
    .filter((r) => daysAgo(r.date) <= 7)
    .filter((r) => (r.sleep ?? 5) <= 2 || (r.energy ?? 5) <= 2 || (r.soreness ?? 0) >= 4);
  if (lowReadiness.length >= 2 && fatiguedLifts.length >= 1) {
    reasons.push("Low readiness alongside dropping performance");
  }

  const recommended =
    fatiguedLifts.length >= 2 ||
    painSessions >= 2 ||
    (lowReadiness.length >= 2 && fatiguedLifts.length >= 1);

  const prescription =
    recommended && meta
      ? `Cut working sets ${meta.deload.reduceMinPercent}–${meta.deload.reduceMaxPercent}% for ${meta.deload.durationWeeks} week, keep movement patterns, avoid failure.`
      : null;

  return { recommended, reasons, fatiguedLifts, prescription };
}
