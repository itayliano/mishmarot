import type { DateOrder, Lang, Line, Shift, Token } from "./types";
import {
  findDates,
  findTimes,
  maskSpans,
  resolveYear,
  timeLess,
  type DateMatch,
  type TimeMatch,
} from "./datetime";
import { shiftTitle } from "./locale";

export interface ParseOptions {
  order: DateOrder;
  lang: Lang;
  /** Reference date for resolving years on dates that omit them. */
  ref?: Date;
}

let idCounter = 0;
function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s${Date.now()}_${idCounter++}`;
}

/** Join tokens into one string and record where each token starts in it. */
function buildLineText(tokens: Token[]): { text: string; offsets: number[] } {
  let text = "";
  const offsets: number[] = [];
  tokens.forEach((t, i) => {
    if (i > 0) text += " ";
    offsets.push(text.length);
    text += t.text;
  });
  return { text, offsets };
}

/** Map a character index in the joined line text back to a token's x position. */
function xAtIndex(tokens: Token[], offsets: number[], index: number): number {
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (index >= offsets[i]) return tokens[i].x;
  }
  return tokens[0]?.x ?? 0;
}

/** First token that is plain text (not a number/time/date fragment). */
function rowLabel(tokens: Token[]): string | undefined {
  for (const t of tokens) {
    const s = t.text.trim();
    if (s.length >= 2 && /[A-Za-z֐-׿]/.test(s) && !/^\d/.test(s)) {
      return s;
    }
  }
  return undefined;
}

function makeShift(
  date: { year: number | null; month: number; day: number },
  time: TimeMatch | null,
  opts: ParseOptions,
  raw: string,
  confidence: number,
  label?: string,
): Shift {
  const year = date.year ?? resolveYear(date.month, date.day, opts.ref);
  const endsNextDay = !!(time?.end && !timeLess(time.start, time.end) && time.start !== time.end);
  return {
    id: newId(),
    year,
    month: date.month,
    day: date.day,
    start: time?.start ?? null,
    end: time?.end ?? null,
    endsNextDay,
    title: shiftTitle(raw, opts.lang),
    label,
    confidence,
    raw: raw.trim(),
    selected: true,
  };
}

/** Most frequent explicit 4-digit year across all dates, if any. */
function dominantYear(allDates: DateMatch[]): number | null {
  const counts = new Map<number, number>();
  for (const d of allDates) if (d.year != null) counts.set(d.year, (counts.get(d.year) ?? 0) + 1);
  let best: number | null = null;
  let bestN = 0;
  for (const [y, n] of counts) if (n > bestN) ((best = y), (bestN = n));
  return best;
}

/**
 * Main entry: turn positioned PDF lines into detected shifts.
 * Combines a same-line "list" pass with an x-aligned "grid" pass.
 */
export function parseShifts(lines: Line[], opts: ParseOptions): Shift[] {
  const ref = opts.ref ?? new Date();
  const options = { ...opts, ref };

  // First pass: collect per-line dates/times so we can compute a document year.
  const scanned = lines.map((line) => {
    const { text, offsets } = buildLineText(line.tokens);
    const dates = findDates(text, options.order);
    const masked = maskSpans(text, dates);
    const times = findTimes(masked);
    return { line, text, offsets, dates, times };
  });

  const docYear = dominantYear(scanned.flatMap((s) => s.dates));
  const applyYear = (d: DateMatch): DateMatch =>
    d.year == null && docYear != null ? { ...d, year: docYear } : d;

  const shifts: Shift[] = [];

  // --- List pass: dates and times on the same line ---
  for (const s of scanned) {
    const dates = s.dates.map(applyYear);
    const ranges = s.times.filter((t) => t.end != null);
    const singles = s.times.filter((t) => t.end == null);
    const times = ranges.length ? ranges : singles;
    if (!dates.length || !times.length) continue;

    if (dates.length === 1) {
      for (const t of times) {
        shifts.push(makeShift(dates[0], t, options, s.text, t.end ? 0.9 : 0.6));
      }
    } else if (times.length === 1) {
      for (const d of dates) {
        shifts.push(makeShift(d, times[0], options, s.text, times[0].end ? 0.9 : 0.6));
      }
    } else {
      const n = Math.min(dates.length, times.length);
      for (let i = 0; i < n; i++) {
        shifts.push(makeShift(dates[i], times[i], options, s.text, times[i].end ? 0.85 : 0.55));
      }
    }
  }

  // --- Grid pass: a date header row, then time cells mapped by x position ---
  type Column = { x: number; date: DateMatch };
  let header: { page: number; y: number; cols: Column[] } | null = null;

  for (const s of scanned) {
    const dates = s.dates.map(applyYear);
    // A line with >=2 dates spread horizontally is treated as a column header.
    if (dates.length >= 2) {
      const cols = dates.map((d) => ({
        x: xAtIndex(s.line.tokens, s.offsets, d.index),
        date: d,
      }));
      header = { page: s.line.page, y: s.line.y, cols };
      continue;
    }
    if (!header || s.line.page !== header.page || s.line.y >= header.y) continue;
    if (!s.times.length || s.dates.length) continue; // own-date lines handled above

    const label = rowLabel(s.line.tokens);
    for (const t of s.times) {
      const tx = xAtIndex(s.line.tokens, s.offsets, t.index);
      let nearest = header.cols[0];
      for (const c of header.cols) {
        if (Math.abs(c.x - tx) < Math.abs(nearest.x - tx)) nearest = c;
      }
      shifts.push(makeShift(nearest.date, t, options, s.text, t.end ? 0.7 : 0.45, label));
    }
  }

  return dedupe(shifts);
}

function dedupe(shifts: Shift[]): Shift[] {
  const seen = new Set<string>();
  const out: Shift[] = [];
  for (const s of shifts) {
    const key = `${s.year}-${s.month}-${s.day}|${s.start}|${s.end}|${s.label ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    if (a.day !== b.day) return a.day - b.day;
    return (a.start ?? "").localeCompare(b.start ?? "");
  });
}
