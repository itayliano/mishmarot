import type { Lang } from "../lib/parse/types";

export interface Strings {
  dir: "rtl" | "ltr";
  appTitle: string;
  tagline: string;
  dropTitle: string;
  dropHint: string;
  chooseFile: string;
  parsing: string;
  scannedDetected: string;
  ocrProgress: (page: number, pages: number, pct: number) => string;
  usedOcrNote: string;
  reparse: string;
  noText: string;
  noShifts: string;
  found: (n: number) => string;
  dateOrder: string;
  dmy: string;
  mdy: string;
  language: string;
  filterLabel: string;
  filterPlaceholder: string;
  clearFilter: string;
  selectAll: string;
  selectNone: string;
  colSelect: string;
  colDate: string;
  colStart: string;
  colEnd: string;
  colTitle: string;
  colLabel: string;
  colConfidence: string;
  colSource: string;
  colActions: string;
  addRow: string;
  deleteRow: string;
  overnight: string;
  exportHeading: string;
  selectedCount: (n: number) => string;
  addAllGoogle: string;
  connecting: string;
  adding: (done: number, total: number) => string;
  addedOk: (n: number) => string;
  addedPartial: (ok: number, failed: number) => string;
  perShiftHint: string;
  addToGoogle: string;
  downloadIcs: string;
  googleNotConfigured: string;
  setupLink: string;
  error: string;
  lowConfidenceNote: string;
}

const he: Strings = {
  dir: "rtl",
  appTitle: "משמרות → יומן",
  tagline: "העלו PDF של לוח משמרות, נזהה את המשמרות ונוסיף אותן ל-Google Calendar.",
  dropTitle: "גררו לכאן קובץ PDF",
  dropHint: "או בחרו קובץ מהמכשיר / מהמחשב",
  chooseFile: "בחירת קובץ",
  parsing: "מנתח את הקובץ…",
  scannedDetected: "לא נמצא טקסט — מזהה כסריקה ומריץ OCR (טעינה ראשונה עשויה לקחת זמן)…",
  ocrProgress: (page, pages, pct) => `OCR: עמוד ${page}/${pages} · ${pct}%`,
  usedOcrNote:
    "הקובץ זוהה כסריקה והטקסט חולץ ב-OCR — ייתכנו טעויות בזיהוי. בדקו היטב את הטבלה לפני ההוספה ליומן.",
  reparse: "נתח מחדש",
  noText: "לא נמצא טקסט גם אחרי OCR. ייתכן שהאיכות נמוכה מדי. אפשר להוסיף שורות ידנית בטבלה למטה.",
  noShifts: "לא זוהו משמרות אוטומטית. אפשר להוסיף שורות ידנית בטבלה למטה.",
  found: (n) => `זוהו ${n} משמרות. בדקו ותקנו לפני ההוספה ליומן.`,
  dateOrder: "פורמט תאריך",
  dmy: "יום/חודש (DD/MM)",
  mdy: "חודש/יום (MM/DD)",
  language: "שפה",
  filterLabel: "סינון לפי שם / טקסט",
  filterPlaceholder: "למשל: השם שלך",
  clearFilter: "נקה",
  selectAll: "בחר הכל",
  selectNone: "בטל הכל",
  colSelect: "✓",
  colDate: "תאריך",
  colStart: "התחלה",
  colEnd: "סיום",
  colTitle: "כותרת",
  colLabel: "שם/תווית",
  colConfidence: "ודאות",
  colSource: "מקור",
  colActions: "",
  addRow: "הוסף שורה",
  deleteRow: "מחק",
  overnight: "למחרת",
  exportHeading: "הוספה ליומן",
  selectedCount: (n) => `${n} משמרות נבחרו`,
  addAllGoogle: "הוסף הכול ל-Google Calendar",
  connecting: "מתחבר ל-Google…",
  adding: (done, total) => `מוסיף ${done}/${total}…`,
  addedOk: (n) => `נוספו ${n} משמרות ליומן בהצלחה ✓`,
  addedPartial: (ok, failed) => `נוספו ${ok}, נכשלו ${failed}.`,
  perShiftHint: "אפשר גם להוסיף כל משמרת בנפרד (ללא התחברות):",
  addToGoogle: "הוסף ליומן",
  downloadIcs: "הורדת קובץ .ics",
  googleNotConfigured:
    "הוספה אוטומטית של כל המשמרות דורשת הגדרת Google Client ID. בינתיים אפשר להוסיף כל משמרת בקישור, או להוריד קובץ .ics.",
  setupLink: "איך מגדירים?",
  error: "אירעה שגיאה",
  lowConfidenceNote: "שורות בצהוב זוהו בוודאות נמוכה — מומלץ לבדוק.",
};

const en: Strings = {
  dir: "ltr",
  appTitle: "Shifts → Calendar",
  tagline: "Upload a shift-schedule PDF; we detect the shifts and add them to Google Calendar.",
  dropTitle: "Drop a PDF file here",
  dropHint: "or choose a file from your device / computer",
  chooseFile: "Choose file",
  parsing: "Parsing file…",
  scannedDetected: "No text found — detected as scanned, running OCR (first load may take a while)…",
  ocrProgress: (page, pages, pct) => `OCR: page ${page}/${pages} · ${pct}%`,
  usedOcrNote:
    "This file was scanned and read with OCR — recognition may contain errors. Please review the table carefully before adding to your calendar.",
  reparse: "Re-parse",
  noText: "No text found even after OCR. Image quality may be too low. You can add rows manually below.",
  noShifts: "No shifts detected automatically. You can add rows manually in the table below.",
  found: (n) => `Detected ${n} shifts. Review and fix before adding to your calendar.`,
  dateOrder: "Date format",
  dmy: "Day/Month (DD/MM)",
  mdy: "Month/Day (MM/DD)",
  language: "Language",
  filterLabel: "Filter by name / text",
  filterPlaceholder: "e.g. your name",
  clearFilter: "Clear",
  selectAll: "Select all",
  selectNone: "Select none",
  colSelect: "✓",
  colDate: "Date",
  colStart: "Start",
  colEnd: "End",
  colTitle: "Title",
  colLabel: "Name/label",
  colConfidence: "Conf.",
  colSource: "Source",
  colActions: "",
  addRow: "Add row",
  deleteRow: "Delete",
  overnight: "next day",
  exportHeading: "Add to calendar",
  selectedCount: (n) => `${n} shifts selected`,
  addAllGoogle: "Add all to Google Calendar",
  connecting: "Connecting to Google…",
  adding: (done, total) => `Adding ${done}/${total}…`,
  addedOk: (n) => `Added ${n} shifts to your calendar ✓`,
  addedPartial: (ok, failed) => `Added ${ok}, failed ${failed}.`,
  perShiftHint: "Or add each shift individually (no sign-in):",
  addToGoogle: "Add to calendar",
  downloadIcs: "Download .ics file",
  googleNotConfigured:
    "One-click add for all shifts needs a Google Client ID. Meanwhile, add each shift via its link, or download an .ics file.",
  setupLink: "How to set up?",
  error: "Something went wrong",
  lowConfidenceNote: "Rows highlighted in yellow were detected with low confidence — please check.",
};

export const STRINGS: Record<Lang, Strings> = { he, en };
