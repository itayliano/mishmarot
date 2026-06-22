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
  // Reminders
  reminderLabel: string;
  reminderNone: string;
  reminderAtStart: string;
  reminder10m: string;
  reminder30m: string;
  reminder1h: string;
  reminder2h: string;
  reminder1d: string;
  templateNoReminder: string;
  // Google sign-in
  signIn: string;
  signedIn: string;
  signOut: string;
  clientIdLabel: string;
  clientIdPlaceholder: string;
  save: string;
  change: string;
  setupHow: string;
  googleSetupHelp: string;
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
    "כדי להתחבר ל-Google ולהוסיף את כל המשמרות בלחיצה אחת, הזינו Google Client ID (חד-פעמי, נשמר במכשיר).",
  setupLink: "איך מגדירים?",
  error: "אירעה שגיאה",
  lowConfidenceNote: "שורות בצהוב זוהו בוודאות נמוכה — מומלץ לבדוק.",
  reminderLabel: "תזכורת",
  reminderNone: "ללא",
  reminderAtStart: "בזמן המשמרת",
  reminder10m: "10 דקות לפני",
  reminder30m: "30 דקות לפני",
  reminder1h: "שעה לפני",
  reminder2h: "שעתיים לפני",
  reminder1d: "יום לפני",
  templateNoReminder: "קישורי המשמרת הבודדת אינם כוללים תזכורת (מגבלה של Google).",
  signIn: "התחבר עם Google",
  signedIn: "מחובר ל-Google ✓",
  signOut: "התנתק",
  clientIdLabel: "Google Client ID",
  clientIdPlaceholder: "...apps.googleusercontent.com",
  save: "שמור",
  change: "שנה",
  setupHow: "איך משיגים Client ID?",
  googleSetupHelp:
    "ב-Google Cloud Console: צרו פרויקט, הפעילו Calendar API, צרו OAuth Client ID מסוג Web, והוסיפו את כתובת האתר ל-Authorized JavaScript origins.",
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
    "To sign in with Google and add all shifts in one click, enter a Google Client ID (one-time, stored on your device).",
  setupLink: "How to set up?",
  error: "Something went wrong",
  lowConfidenceNote: "Rows highlighted in yellow were detected with low confidence — please check.",
  reminderLabel: "Reminder",
  reminderNone: "None",
  reminderAtStart: "At start",
  reminder10m: "10 min before",
  reminder30m: "30 min before",
  reminder1h: "1 hour before",
  reminder2h: "2 hours before",
  reminder1d: "1 day before",
  templateNoReminder: "Per-shift links don't include a reminder (Google limitation).",
  signIn: "Sign in with Google",
  signedIn: "Connected to Google ✓",
  signOut: "Sign out",
  clientIdLabel: "Google Client ID",
  clientIdPlaceholder: "...apps.googleusercontent.com",
  save: "Save",
  change: "Change",
  setupHow: "How to get a Client ID?",
  googleSetupHelp:
    "In Google Cloud Console: create a project, enable the Calendar API, create an OAuth Client ID (Web), and add this site's URL to Authorized JavaScript origins.",
};

export const STRINGS: Record<Lang, Strings> = { he, en };
