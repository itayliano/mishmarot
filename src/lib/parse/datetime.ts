import type { DateOrder } from "./types";
import { monthFromWord, weekdayFromWord } from "./locale";

export interface DateMatch {
  year: number | null;
  month: number; // 1-12
  day: number; // 1-31
  index: number;
  length: number;
  raw: string;
}

export interface TimeMatch {
  start: string; // "HH:MM"
  end: string | null; // "HH:MM" or null
  index: number;
  length: number;
  raw: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function validDMY(day: number, month: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function normYear(y: number | null): number | null {
  if (y == null) return null;
  if (y < 100) return y >= 70 ? 1900 + y : 2000 + y;
  return y;
}

/**
 * Picks a concrete year for a date that had none, assuming schedules describe
 * upcoming dates: use the reference year, but if that date is well in the past,
 * roll forward a year.
 */
export function resolveYear(
  month: number,
  day: number,
  ref: Date = new Date(),
): number {
  const y = ref.getFullYear();
  const candidate = new Date(y, month - 1, day);
  const cutoff = new Date(ref.getTime() - 60 * 24 * 60 * 60 * 1000); // ~2 months back
  return candidate < cutoff ? y + 1 : y;
}

/**
 * Finds all dates in a line. Order ("DMY"/"MDY") disambiguates numeric dates;
 * a component > 12 always overrides the order. Returns matches with positions
 * so callers can mask them before scanning for times.
 */
export function findDates(text: string, order: DateOrder): DateMatch[] {
  const out: DateMatch[] = [];

  // ISO: yyyy-mm-dd (highest priority, unambiguous)
  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
  for (const m of text.matchAll(iso)) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (validDMY(day, month)) {
      out.push({ year, month, day, index: m.index!, length: m[0].length, raw: m[0] });
    }
  }

  // Numeric: d/m, d.m, d-m, with optional year.
  const num = /\b(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?\b/g;
  for (const m of text.matchAll(num)) {
    if (overlaps(out, m.index!, m[0].length)) continue;
    let a = Number(m[1]);
    let b = Number(m[2]);
    const year = normYear(m[3] != null ? Number(m[3]) : null);
    let day: number, month: number;
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a <= 12) {
      day = b;
      month = a;
    } else {
      [day, month] = order === "MDY" ? [b, a] : [a, b];
    }
    if (validDMY(day, month)) {
      out.push({ year, month, day, index: m.index!, length: m[0].length, raw: m[0] });
    }
  }

  // Textual: "22 [ב]יוני [2025]" / "22 June 2025"
  const dMonth = /\b(\d{1,2})\s+ב?([A-Za-z֐-׿]{3,9})\.?(?:\s+(\d{4}))?\b/g;
  for (const m of text.matchAll(dMonth)) {
    if (overlaps(out, m.index!, m[0].length)) continue;
    const month = monthFromWord(m[2]) + 1;
    const day = Number(m[1]);
    if (month >= 1 && validDMY(day, month)) {
      const year = m[3] ? Number(m[3]) : null;
      out.push({ year, month, day, index: m.index!, length: m[0].length, raw: m[0] });
    }
  }

  // Textual: "June 22[, 2025]"
  const monthD = /\b([A-Za-z֐-׿]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/g;
  for (const m of text.matchAll(monthD)) {
    if (overlaps(out, m.index!, m[0].length)) continue;
    const month = monthFromWord(m[1]) + 1;
    const day = Number(m[2]);
    if (month >= 1 && validDMY(day, month)) {
      const year = m[3] ? Number(m[3]) : null;
      out.push({ year, month, day, index: m.index!, length: m[0].length, raw: m[0] });
    }
  }

  return out.sort((p, q) => p.index - q.index);
}

function overlaps(matches: { index: number; length: number }[], i: number, len: number) {
  return matches.some((m) => i < m.index + m.length && m.index < i + len);
}

/** Replaces matched spans with spaces so a later scan won't re-read them. */
export function maskSpans(text: string, spans: { index: number; length: number }[]): string {
  const chars = text.split("");
  for (const s of spans) {
    for (let i = s.index; i < s.index + s.length && i < chars.length; i++) chars[i] = " ";
  }
  return chars.join("");
}

const RANGE_SEP = "(?:\\s*(?:[-–—~]|עד|to|until|–)\\s*)";
const TIME = "(\\d{1,2})[:.](\\d{2})";

function clampTime(h: number, m: number): string | null {
  if (h > 24 || m > 59) return null;
  if (h === 24 && m !== 0) return null;
  return `${pad(h % 24)}:${pad(m)}`;
}

/**
 * Finds time ranges ("07:00-15:00", "07:00 עד 15:00") and standalone times.
 * Run on text whose dates have already been masked, so "07.06.2025" is not
 * mistaken for a time.
 */
export function findTimes(text: string): TimeMatch[] {
  const out: TimeMatch[] = [];

  const range = new RegExp(`${TIME}${RANGE_SEP}${TIME}`, "g");
  for (const m of text.matchAll(range)) {
    const start = clampTime(Number(m[1]), Number(m[2]));
    const end = clampTime(Number(m[3]), Number(m[4]));
    if (start && end) {
      out.push({ start, end, index: m.index!, length: m[0].length, raw: m[0] });
    }
  }

  const single = new RegExp(TIME, "g");
  for (const m of text.matchAll(single)) {
    if (overlaps(out, m.index!, m[0].length)) continue;
    const start = clampTime(Number(m[1]), Number(m[2]));
    if (start) {
      out.push({ start, end: null, index: m.index!, length: m[0].length, raw: m[0] });
    }
  }

  return out.sort((p, q) => p.index - q.index);
}

/** Finds the first weekday word in a line (Sun=0..Sat=6), or -1. */
export function findWeekday(text: string): number {
  for (const word of text.split(/[\s,]+/)) {
    const wd = weekdayFromWord(word);
    if (wd >= 0) return wd;
  }
  return -1;
}

/** "HH:MM" string < other, treating equal as not-less. */
export function timeLess(a: string, b: string): boolean {
  return a.localeCompare(b) < 0;
}
