import type { Unit } from "../types";

// Trim trailing zeros so 70.0 shows as "70" and 72.5 stays "72.5".
export function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function fmtWeight(n: number, unit: Unit): string {
  return `${fmtNum(n)} ${unit}`;
}

export function repRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min}–${max}`;
}

export function signed(n: number): string {
  if (n > 0) return `+${fmtNum(n)}`;
  return fmtNum(n);
}

// "1 set" / "2 sets"
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
