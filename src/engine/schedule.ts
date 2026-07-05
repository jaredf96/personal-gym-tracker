import type {
  CardioLog,
  DayType,
  WeeklyScheduleDay,
  WorkoutSession,
  WorkoutTemplate,
} from "../types";
import { nextTemplate, sortedBySequence } from "./rotation";
import { todayISODate } from "../lib/dates";

// Hybrid scheduling: a fixed weekly *rhythm* (which weekdays are lift / cardio /
// rest) provides structure, but WHICH lift lands on a workout-day comes from the
// flexible training sequence (next = advance from last completed). So the plan
// re-aligns automatically when a day is missed or shifted.

// 0 = Monday ... 6 = Sunday (matches startOfWeek being Monday-based).
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function scheduleForDate(
  schedule: WeeklyScheduleDay[],
  date: Date
): WeeklyScheduleDay | undefined {
  const idx = mondayIndex(date);
  return schedule.find((s) => s.dayIndex === idx);
}

function parseISO(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

export function mostRecentCompleted(sessions: WorkoutSession[]): WorkoutSession | null {
  const done = sessions.filter((s) => s.endedAt);
  done.sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));
  return done[0] ?? null;
}

// date(YYYY-MM-DD) -> the completed session on that date (latest if several).
export function completedByDate(sessions: WorkoutSession[]): Map<string, WorkoutSession> {
  const map = new Map<string, WorkoutSession>();
  for (const s of sessions) {
    if (!s.endedAt) continue;
    const existing = map.get(s.date);
    if (!existing || (s.endedAt ?? "") > (existing.endedAt ?? "")) map.set(s.date, s);
  }
  return map;
}

// Projects which lift lands on each future workout-day, starting today. Cardio /
// rest days don't consume the sequence. Already-completed workout-days are
// skipped (they're shown as completed). Returns date -> template.
export function projectLifts(
  fromDate: Date,
  days: number,
  schedule: WeeklyScheduleDay[],
  templates: WorkoutTemplate[],
  sessions: WorkoutSession[]
): Map<string, WorkoutTemplate> {
  const ordered = sortedBySequence(templates);
  const out = new Map<string, WorkoutTemplate>();
  if (ordered.length === 0) return out;

  const doneByDate = completedByDate(sessions);
  const last = mostRecentCompleted(sessions);
  const next = nextTemplate(templates, last);
  let pointer = next ? ordered.findIndex((t) => t.id === next.id) : 0;

  for (let i = 0; i < days; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const iso = todayISODate(d);
    const sched = scheduleForDate(schedule, d);
    if (!sched || sched.type !== "workout") continue;
    if (doneByDate.has(iso)) continue; // already trained that day
    out.set(iso, ordered[pointer % ordered.length]);
    pointer = (pointer + 1) % ordered.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Single-day descriptor (Today / tomorrow banner)
// ---------------------------------------------------------------------------

export interface DayDescriptor {
  date: string;
  scheduleType: DayType;
  scheduleLabel: string;
  isWorkoutDay: boolean;
  isRestDay: boolean;
  isCardioDay: boolean;
  completed: WorkoutSession | null;
  completedTemplate: WorkoutTemplate | null;
  plannedTemplate: WorkoutTemplate | null; // the lift suggested if you train
  cardioMinMinutes?: number;
  cardioMaxMinutes?: number;
  note?: string;
}

export function describeDate(
  dateStr: string,
  schedule: WeeklyScheduleDay[],
  templates: WorkoutTemplate[],
  sessions: WorkoutSession[]
): DayDescriptor {
  const date = parseISO(dateStr);
  const sched = scheduleForDate(schedule, date);
  const templatesById = new Map(templates.map((t) => [t.id, t]));
  const done = completedByDate(sessions).get(dateStr) ?? null;

  // Project far enough to cover this date.
  const today = new Date(todayISODate() + "T12:00:00");
  const span = Math.max(1, Math.round((date.getTime() - today.getTime()) / 86_400_000) + 1);
  const projected = projectLifts(today, Math.max(span, 1), schedule, templates, sessions);

  const type = sched?.type ?? "rest";
  return {
    date: dateStr,
    scheduleType: type,
    scheduleLabel: sched?.label ?? "Rest",
    isWorkoutDay: type === "workout",
    isRestDay: type === "rest",
    isCardioDay: type === "cardio" || type === "cardio_or_rest",
    completed: done,
    completedTemplate: done ? templatesById.get(done.templateId) ?? null : null,
    plannedTemplate: projected.get(dateStr) ?? null,
    cardioMinMinutes: sched?.cardioMinMinutes,
    cardioMaxMinutes: sched?.cardioMaxMinutes,
    note: sched?.note,
  };
}

// ---------------------------------------------------------------------------
// Calendar month grid
// ---------------------------------------------------------------------------

export type DayStatus =
  | "completed"
  | "cardio-done"
  | "planned"
  | "missed"
  | "rest"
  | "cardio";

export interface CalendarDay {
  date: string;
  dayIndex: number; // 0=Mon..6=Sun
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  scheduleType: DayType;
  scheduleLabel: string;
  status: DayStatus;
  template: WorkoutTemplate | null;
  color: string | null;
  sessionId: string | null; // latest completed session (back-compat)
  sessionIds: string[]; // ALL completed sessions that day (multi-session days)
  cardioMinutes: number | null;
}

export function buildCalendarMonth(
  year: number,
  month: number, // 0-11
  schedule: WeeklyScheduleDay[],
  templates: WorkoutTemplate[],
  sessions: WorkoutSession[],
  cardioLogs: CardioLog[]
): CalendarDay[] {
  const templatesById = new Map(templates.map((t) => [t.id, t]));
  const doneByDate = completedByDate(sessions);
  // ALL completed sessions per date (chronological) — a made-up day can hold two.
  const allDoneByDate = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    if (!s.endedAt) continue;
    const list = allDoneByDate.get(s.date) ?? [];
    list.push(s);
    allDoneByDate.set(s.date, list);
  }
  for (const list of allDoneByDate.values()) {
    list.sort((a, b) => (a.endedAt ?? "").localeCompare(b.endedAt ?? ""));
  }
  const cardioByDate = new Map<string, number>();
  for (const c of cardioLogs) {
    cardioByDate.set(c.date, (cardioByDate.get(c.date) ?? 0) + c.minutes);
  }

  // Only flag "missed" after training actually started — days before your first
  // logged activity aren't misses, you just hadn't begun.
  const activityDates = [
    ...sessions.filter((s) => s.endedAt).map((s) => s.date),
    ...cardioLogs.map((c) => c.date),
  ].sort();
  const firstActivity = activityDates[0] ?? null;

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayIndex(first)); // back to Monday
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + (6 - mondayIndex(last))); // forward to Sunday

  // Project lifts from today forward to fill future cells.
  const todayStr = todayISODate();
  const today = new Date(todayStr + "T12:00:00");
  const horizon =
    Math.max(0, Math.round((gridEnd.getTime() - today.getTime()) / 86_400_000)) + 1;
  const projected = projectLifts(today, horizon, schedule, templates, sessions);

  const days: CalendarDay[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    const iso = todayISODate(d);
    const sched = scheduleForDate(schedule, d);
    const type: DayType = sched?.type ?? "rest";
    const isToday = iso === todayStr;
    const isPast = iso < todayStr;

    const completed = doneByDate.get(iso) ?? null;
    const cardioMin = cardioByDate.get(iso) ?? null;

    let status: DayStatus;
    let template: WorkoutTemplate | null = null;

    if (completed) {
      status = "completed";
      template = templatesById.get(completed.templateId) ?? null;
    } else if (cardioMin) {
      status = "cardio-done";
    } else if (type === "workout") {
      if (isPast) {
        status = firstActivity && iso >= firstActivity ? "missed" : "rest";
      } else {
        status = "planned";
        template = projected.get(iso) ?? null;
      }
    } else if (type === "cardio" || type === "cardio_or_rest") {
      if (isPast) {
        // Mandatory cardio ("cardio") skipped after training started = missed;
        // optional ("cardio_or_rest") resolves to rest.
        status =
          type === "cardio" && firstActivity && iso >= firstActivity ? "missed" : "rest";
      } else {
        status = "cardio";
      }
    } else {
      status = "rest";
    }

    days.push({
      date: iso,
      dayIndex: mondayIndex(d),
      inMonth: d.getMonth() === month,
      isToday,
      isPast,
      scheduleType: type,
      scheduleLabel: sched?.label ?? "Rest",
      status,
      template,
      color: template?.color ?? null,
      sessionId: completed?.id ?? null,
      sessionIds: (allDoneByDate.get(iso) ?? []).map((s) => s.id),
      cardioMinutes: cardioMin,
    });
  }
  return days;
}
