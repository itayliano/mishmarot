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

/** Join a line's tokens (in x order) into one string for regex scanning. */
function buildLineText(tokens: Token[]): string {
  return tokens.map((t) => t.text).join(" ");
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
    const text = buildLineText(line.tokens);
    const dates = findDates(text, options.order);
    const masked = maskSpans(text, dates);
    const times = findTimes(masked);
    return { line, text, dates, times };
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

  // --- Grid pass (token level) ---
  // Person rosters are transposed: columns are dates, rows are people, the name
  // sits in its own column. Working at the token level (not lines) survives the
  // row-splitting that dense tables cause: each time cell is matched to a date
  // column by x and to a person by the nearest name row in y.
  const allTokens = scanned.flatMap((s) => s.line.tokens);

  const dated = allTokens
    .map((t) => {
      const ds = findDates(t.text, options.order);
      return ds.length === 1 ? { t, date: applyYear(ds[0]) } : null;
    })
    .filter((v): v is { t: Token; date: DateMatch } => v !== null);

  const header = bestDateRow(dated);
  if (header) {
    const cols = header.map((d) => ({ x: d.t.x, date: d.date })).sort((a, b) => a.x - b.x);
    const xs = cols.map((c) => c.x);
    let minGap = Infinity;
    for (let i = 1; i < xs.length; i++) minGap = Math.min(minGap, xs[i] - xs[i - 1]);
    const colTol = Number.isFinite(minGap) ? Math.max(8, minGap * 0.4) : 40;
    const page = header[0].t.page;
    const headerY = header[0].t.y;

    const nameToks = allTokens.filter(
      (t) =>
        t.page === page &&
        t.y < headerY - 1 &&
        t.text.trim().length >= 2 &&
        /[A-Za-z֐-׿]/.test(t.text) &&
        !/\d/.test(t.text) &&
        cols.every((c) => Math.abs(c.x - t.x) > colTol),
    );
    const rows = clusterRows(nameToks);
    const rowYs = rows.map((r) => r.y).sort((a, b) => a - b);
    let minRowGap = Infinity;
    for (let i = 1; i < rowYs.length; i++) minRowGap = Math.min(minRowGap, rowYs[i] - rowYs[i - 1]);
    const yTol = Number.isFinite(minRowGap) ? Math.max(6, minRowGap * 0.75) : 24;

    for (const t of allTokens) {
      if (t.page !== page || t.y >= headerY - 1) continue;
      const times = findTimes(maskSpans(t.text, findDates(t.text, options.order)));
      if (!times.length) continue;

      let col = cols[0];
      for (const c of cols) if (Math.abs(c.x - t.x) < Math.abs(col.x - t.x)) col = c;

      let label: string | undefined;
      let best = Infinity;
      for (const r of rows) {
        const dy = Math.abs(r.y - t.y);
        if (dy < best) ((best = dy), (label = r.name));
      }
      if (best > yTol) label = undefined;

      for (const tm of times) {
        shifts.push(makeShift(col.date, tm, options, t.text, tm.end ? 0.7 : 0.45, label));
      }
    }
  }

  return dedupe(shifts);
}

/** Cluster date tokens into rows by y; return the largest row (the header). */
function bestDateRow(
  dated: { t: Token; date: DateMatch }[],
): { t: Token; date: DateMatch }[] | null {
  const tol = 6;
  const used = new Array(dated.length).fill(false);
  let best: { t: Token; date: DateMatch }[] = [];
  for (let i = 0; i < dated.length; i++) {
    if (used[i]) continue;
    const group = [dated[i]];
    used[i] = true;
    for (let j = i + 1; j < dated.length; j++) {
      if (used[j]) continue;
      if (dated[j].t.page === dated[i].t.page && Math.abs(dated[j].t.y - dated[i].t.y) <= tol) {
        group.push(dated[j]);
        used[j] = true;
      }
    }
    if (group.length > best.length) best = group;
  }
  return best.length >= 2 ? best : null;
}

/** Cluster name tokens into person rows by y; join each row's tokens by x. */
function clusterRows(toks: Token[]): { y: number; name: string }[] {
  const sorted = [...toks].sort((a, b) => b.y - a.y);
  const rows: { refY: number; toks: Token[] }[] = [];
  for (const t of sorted) {
    const tol = Math.max(6, t.height * 0.8);
    const row = rows.find((r) => Math.abs(r.refY - t.y) <= tol);
    if (row) row.toks.push(t);
    else rows.push({ refY: t.y, toks: [t] });
  }
  return rows.map((r) => ({
    y: r.toks.reduce((a, b) => a + b.y, 0) / r.toks.length,
    name: [...r.toks].sort((a, b) => a.x - b.x).map((t) => t.text).join(" ").trim(),
  }));
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
