import { useEffect, useMemo, useRef, useState } from "react";
import { FileDrop } from "./components/FileDrop";
import { ShiftTable } from "./components/ShiftTable";
import { ExportBar } from "./components/ExportBar";
import { extractLines, type ExtractProgress } from "./lib/pdf/extract";
import { parseShifts } from "./lib/parse/parseShifts";
import type { DateOrder, Lang, Line, Shift } from "./lib/parse/types";
import { STRINGS } from "./i18n/strings";

type Status = "idle" | "parsing" | "ready" | "error";

let blankCounter = 0;

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
  const linesRef = useRef<Line[]>([]);
  const usedOcrRef = useRef(false);

  const s = STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = s.dir;
  }, [lang, s.dir]);

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
      <header className="hero">
        <h1>{s.appTitle}</h1>
        <p>{s.tagline}</p>
      </header>

      <div className="toolbar">
        <label>
          {s.language}
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </label>
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

          <ExportBar selected={selected} strings={s} />
        </>
      )}

      <footer>
        Mishmarot · {lang === "he" ? "הכול רץ בדפדפן — הקבצים לא נשלחים לשרת." : "Everything runs in your browser — files are never uploaded."}
      </footer>
    </div>
  );
}
