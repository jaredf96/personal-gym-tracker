// Date helpers. All "dates" stored in the app are YYYY-MM-DD local strings.

export function todayISODate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

// Calendar-safe day offset (DST-proof — never add raw 24h milliseconds).
export function addDaysISO(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return todayISODate(d);
}

// Monday-based start of the week for the given date (local time).
export function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}

export function endOfWeek(d = new Date()): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function isoDateInRange(isoDate: string, start: Date, end: Date): boolean {
  const t = new Date(isoDate + "T12:00:00").getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function daysAgo(isoDate: string, from = new Date()): number {
  const a = new Date(isoDate + "T12:00:00").getTime();
  const b = new Date(todayISODate(from) + "T12:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

export function relativeDay(isoDate: string): string {
  const n = daysAgo(isoDate);
  if (n <= 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n < 7) return `${n} days ago`;
  if (n < 14) return "Last week";
  const weeks = Math.round(n / 7);
  if (n < 56) return `${weeks} weeks ago`;
  return `${Math.round(n / 30)} months ago`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
