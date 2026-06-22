/** A single text token extracted from the PDF, with its position on the page. */
export interface Token {
  text: string;
  /** x of the left edge, in PDF user-space units (origin bottom-left). */
  x: number;
  /** y of the baseline. Higher = higher on the page. */
  y: number;
  width: number;
  height: number;
  page: number;
}

/** Tokens grouped into a visual line (same page, similar y). */
export interface Line {
  page: number;
  y: number;
  tokens: Token[];
  /** Tokens joined in reading order, for regex scanning. */
  text: string;
}

/** A detected shift, before it becomes a calendar event. */
export interface Shift {
  /** Stable id for React keys / editing. */
  id: string;
  /** Local calendar date (no timezone math): year/month/day. */
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
  /** "HH:MM" 24h, or null for an all-day / unknown-time shift. */
  start: string | null;
  /** "HH:MM" 24h, or null. */
  end: string | null;
  /** Whether end is on the following day (overnight shift). */
  endsNextDay: boolean;
  /** Human title, e.g. "משמרת בוקר" / "Night shift". */
  title: string;
  /** Optional person/role label found near the shift (for name filtering). */
  label?: string;
  /** 0..1 — how confident the detector is. */
  confidence: number;
  /** The raw source text the shift was parsed from (for review). */
  raw: string;
  /** Whether this row is selected for export. */
  selected: boolean;
}

export type Lang = "he" | "en";

/** Day-first (Israeli/European) vs month-first (US) for ambiguous numeric dates. */
export type DateOrder = "DMY" | "MDY";
