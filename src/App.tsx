import { useEffect, useMemo, useRef, useState } from "react";
import { FileDrop } from "./components/FileDrop";
import { ShiftTable } from "./components/ShiftTable";
import { ExportBar } from "./components/ExportBar";
import { GoogleMenu } from "./components/GoogleMenu";
import { extractLines, type ExtractProgress } from "./lib/pdf/extract";
import { parseShifts } from "./lib/parse/parseShifts";
import { connectGoogle, listCalendars, type CalendarItem } from "./lib/calendar/google";
import type { DateOrder, Lang, Line, Shift } from "./lib/parse/types";
import { STRINGS } from "./i18n/strings";

type Status = "idle" | "parsing" | "ready" | "error";
type Theme = "dark" | "light";

let blankCounter = 0;

const readTheme = (): Theme => {
  try {
    return localStorage.getItem("mishmarot_theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

export function App() {
  const [lang, setLang] = useState<Lang>("he");
  const [order, setOrder] = useState<DateOrder>("DMY");
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string>();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filter, setFilter] = useState("");
  const [warning, setWarning] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [usedOcr, setUsedOcr] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [gToken, setGToken] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [calendarId, setCalendarId] = useState("primary");
  const [gBusy, setGBusy] = useState(false);
  const [gError, setGError] = useState("");
  const linesRef = useRef<Line[]>([]);
  const usedOcrRef = useRef(false);

  const s = STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = s.dir;
  }, [lang, s.dir]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("mishmarot_theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const connectGoogleAccount = async (): Promise<string | null> => {
    try {
      setGBusy(true);
      setGError("");
      const t = await connectGoogle();
      setGToken(t);
      try {
        const cals = await listCalendars(t);
        setCalendars(cals);
        setCalendarId(cals.find((c) => c.primary)?.id ?? "primary");
      } catch {
        /* listing is best-effort; primary still works for writing */
      }
      return t;
    } catch (e) {
      setGError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setGBusy(false);
    }
  };

  const signOutGoogle = () => {
    setGToken(null);
    setCalendars([]);
    setCalendarId("primary");
    setGError("");
  };

  const runParse = (lines: Line[], ord: DateOrder, lng: Lang, ocr: boolean) => {
    let result = parseShifts(lines, { order: ord, lang: lng });
    // OCR output is less reliable — damp confidence so rows flag for review.
    if (ocr) result = result.map((x) => ({ ...x, confidence: x.confidence * 0.75 }));
    setShifts(result);
    setWarning(result.length === 0 ? s.noShifts : "");
  };

  const handleFile = async (file: File) => {
    setStatus("parsing");
    setFileName(file.name);
    setErrorMsg("");
    setWarning("");
    setProgressMsg("");
    setUsedOcr(false);
    try {
      const buf = await file.arrayBuffer();
      const onProgress = (p: ExtractProgress) => {
        if (p.phase === "ocr") {
          setProgressMsg(STRINGS[lang].ocrProgress(p.page, p.pages, Math.round(p.progress * 100)));
        } else {
          setProgressMsg("");
        }
      };
      const { lines, textLength, usedOcr: ocr } = await extractLines(buf, { onProgress });
      linesRef.current = lines;
      usedOcrRef.current = ocr;
      setUsedOcr(ocr);
      if (textLength < 10) {
        setWarning(STRINGS[lang].noText);
        setShifts([]);
      } else {
        runParse(lines, order, lang, ocr);
      }
      setStatus("ready");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setProgressMsg("");
    }
  };

  // Re-parse cached lines when the date-order interpretation changes.
  useEffect(() => {
    if (status === "ready" && linesRef.current.length) {
      runParse(linesRef.current, order, lang, usedOcrRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  const updateShift = (id: string, patch: Partial<Shift>) =>
    setShifts((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const deleteShift = (id: string) => setShifts((prev) => prev.filter((x) => x.id !== id));

  const addRow = () => {
    const now = new Date();
    setShifts((prev) => [
      ...prev,
      {
        id: `blank-${blankCounter++}`,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        start: "09:00",
        end: "17:00",
        endsNextDay: false,
        title: lang === "he" ? "משמרת" : "Shift",
        confidence: 1,
        raw: "",
        selected: true,
      },
    ]);
  };

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return shifts;
    return shifts.filter((x) =>
      [x.title, x.label ?? "", x.raw].some((t) => t.toLowerCase().includes(q)),
    );
  }, [shifts, filter]);

  const selected = useMemo(() => shifts.filter((x) => x.selected), [shifts]);

  const setAllVisible = (value: boolean) => {
    const ids = new Set(visible.map((x) => x.id));
    setShifts((prev) => prev.map((x) => (ids.has(x.id) ? { ...x, selected: value } : x)));
  };

  const hasLowConfidence = shifts.some((x) => x.confidence < 0.6);

  return (
    <div className="app">
      <div className="topbar">
        <div className="controls">
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? s.toLight : s.toDark}
            aria-label={theme === "dark" ? s.toLight : s.toDark}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <select
            className="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            aria-label={s.language}
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
          <GoogleMenu
            strings={s}
            connected={!!gToken}
            busy={gBusy}
            error={gError}
            onConnect={connectGoogleAccount}
            onSignOut={signOutGoogle}
          />
        </div>
      </div>

      <header className="hero">
        <h1>{s.appTitle}</h1>
        <p>{s.tagline}</p>
      </header>

      <div className="toolbar">
        <label>
          {s.dateOrder}
          <select value={order} onChange={(e) => setOrder(e.target.value as DateOrder)}>
            <option value="DMY">{s.dmy}</option>
            <option value="MDY">{s.mdy}</option>
          </select>
        </label>
      </div>

      <FileDrop
        onFile={handleFile}
        strings={s}
        fileName={fileName}
        disabled={status === "parsing"}
      />

      {status === "parsing" && (
        <div className="notice info">{progressMsg || s.parsing}</div>
      )}
      {status === "error" && (
        <div className="notice error">
          {s.error}: {errorMsg}
        </div>
      )}
      {status === "ready" && usedOcr && <div className="notice warn">{s.usedOcrNote}</div>}
      {warning && <div className="notice warn">{warning}</div>}
      {status === "ready" && shifts.length > 0 && (
        <div className="notice info">{s.found(shifts.length)}</div>
      )}

      {(shifts.length > 0 || status === "ready") && (
        <>
          <div className="table-actions">
            <button onClick={addRow}>{s.addRow}</button>
            <button className="ghost" onClick={() => setAllVisible(true)}>
              {s.selectAll}
            </button>
            <button className="ghost" onClick={() => setAllVisible(false)}>
              {s.selectNone}
            </button>
            <label>
              {s.filterLabel}
              <input
                type="text"
                value={filter}
                placeholder={s.filterPlaceholder}
                onChange={(e) => setFilter(e.target.value)}
              />
            </label>
            {filter && (
              <button className="link" onClick={() => setFilter("")}>
                {s.clearFilter}
              </button>
            )}
          </div>

          {hasLowConfidence && <div className="muted">{s.lowConfidenceNote}</div>}

          <ShiftTable rows={visible} strings={s} onUpdate={updateShift} onDelete={deleteShift} />

          <ExportBar
            selected={selected}
            strings={s}
            token={gToken}
            busy={gBusy}
            calendars={calendars}
            calendarId={calendarId}
            onCalendarChange={setCalendarId}
            onConnect={connectGoogleAccount}
          />
        </>
      )}

      <footer>
        Mishmarot · {lang === "he" ? "הכול רץ בדפדפן — הקבצים לא נשלחים לשרת." : "Everything runs in your browser — files are never uploaded."}
      </footer>
    </div>
  );
}
