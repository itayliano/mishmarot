import type { Lang } from "./types";

/**
 * Hebrew + English vocabulary used to recognize and name shifts.
 * Everything is matched case-insensitively after normalization.
 */

// --- Day names -------------------------------------------------------------

// index 0 = Sunday ... 6 = Saturday (JS getDay order)
export const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const HE_DAY_ABBR = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]; // יום א׳ ...
export const EN_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
export const EN_DAY_ABBR = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// --- Month names (Gregorian) ----------------------------------------------

// index 0 = January ... 11 = December
export const HE_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];
export const EN_MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
export const EN_MONTH_ABBR = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/** Returns a 0-based month index for a month word, or -1. */
export function monthFromWord(word: string): number {
  const w = word.trim().toLowerCase().replace(/[׳'.]/g, "");
  let i = HE_MONTHS.indexOf(w);
  if (i >= 0) return i;
  i = EN_MONTHS.indexOf(w);
  if (i >= 0) return i;
  i = EN_MONTH_ABBR.indexOf(w.slice(0, 3));
  if (i >= 0) return i;
  return -1;
}

/** Returns a 0-based weekday (Sun=0) for a day word, or -1. */
export function weekdayFromWord(word: string): number {
  const w = word.trim().toLowerCase().replace(/^יום\s+/, "").replace(/[׳'."]/g, "");
  let i = HE_DAYS.indexOf(w);
  if (i >= 0) return i;
  i = HE_DAY_ABBR.indexOf(w);
  if (i >= 0) return i;
  i = EN_DAYS.indexOf(w);
  if (i >= 0) return i;
  i = EN_DAY_ABBR.indexOf(w.slice(0, 3));
  if (i >= 0) return i;
  return -1;
}

// --- Shift naming ----------------------------------------------------------

interface ShiftWord {
  he: string;
  en: string;
  /** Match any of these substrings (already lowercased) to apply the name. */
  match: string[];
}

/** Ordered by priority — first match wins when naming a shift. */
export const SHIFT_WORDS: ShiftWord[] = [
  { he: "לילה", en: "Night", match: ["לילה", "night", "לי'", "ל'"] },
  { he: "ערב", en: "Evening", match: ["ערב", "evening", "ער'", "ע'"] },
  { he: "צהריים", en: "Noon", match: ["צהריים", "צהרים", "noon", "afternoon", "צה'"] },
  { he: "בוקר", en: "Morning", match: ["בוקר", "morning", "בו'", "ב'"] },
];

const SHIFT_GENERIC: Record<Lang, string> = { he: "משמרת", en: "Shift" };

/**
 * Builds a shift title from a source line. If a known shift word is present we
 * use it ("Night shift"); otherwise a generic "Shift" / "משמרת".
 */
export function shiftTitle(source: string, lang: Lang): string {
  const lower = source.toLowerCase();
  for (const w of SHIFT_WORDS) {
    if (w.match.some((m) => lower.includes(m))) {
      return lang === "he" ? `משמרת ${w.he}` : `${w.en} shift`;
    }
  }
  return SHIFT_GENERIC[lang];
}
