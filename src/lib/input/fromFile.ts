import {
  extractLines,
  groupIntoLines,
  type ExtractProgress,
  type ExtractResult,
} from "../pdf/extract";
import { ocrImage } from "../pdf/ocr";
import type { Line, Token } from "../parse/types";

export type InputKind = "pdf" | "image" | "excel" | "csv" | "word" | "text";

export interface FileResult extends ExtractResult {
  kind: InputKind;
}

export interface FromFileOptions {
  onProgress?: (p: ExtractProgress) => void;
}

const extOf = (name: string) => name.toLowerCase().split(".").pop() || "";
const textLen = (lines: Line[]) =>
  lines.reduce((n, l) => n + l.tokens.reduce((m, t) => m + t.text.length, 0), 0);

/** Tabular data (Excel/CSV): one token per cell, x = column, y = inverted row. */
function rowsToLines(rows: string[][]): Line[] {
  const tokens: Token[] = [];
  const n = rows.length;
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      const text = (cell ?? "").toString().trim();
      if (!text) return;
      tokens.push({ text, x: c * 100, y: (n - r) * 40, width: text.length * 6, height: 20, page: 1 });
    });
  });
  return groupIntoLines(tokens);
}

/** Plain text: one line per row, tokens positioned by character offset. */
function textToLines(text: string): Line[] {
  const tokens: Token[] = [];
  text.split(/\r?\n/).forEach((ln, r) => {
    const y = 100000 - r * 20;
    let offset = 0;
    for (const part of ln.split(/(\s+)/)) {
      if (part.trim()) {
        tokens.push({ text: part, x: offset * 6, y, width: part.length * 6, height: 12, page: 1 });
      }
      offset += part.length;
    }
  });
  return groupIntoLines(tokens);
}

function parseCsv(text: string): string[][] {
  return text.split(/\r?\n/).map((ln) => ln.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
}

async function fromExcel(file: File): Promise<Line[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as string[][];
  return rowsToLines(rows);
}

async function fromWord(file: File): Promise<Line[]> {
  const mammoth: any = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return textToLines(value as string);
}

/**
 * Detect the file type and produce positioned lines for the shift parser.
 * Supports PDF (text + OCR), images (OCR), Excel, CSV, Word, and plain text —
 * Hebrew and English alike.
 */
export async function extractFromFile(
  file: File,
  opts: FromFileOptions = {},
): Promise<FileResult> {
  const e = extOf(file.name);
  const type = file.type;

  if (type === "application/pdf" || e === "pdf") {
    return { ...(await extractLines(await file.arrayBuffer(), opts)), kind: "pdf" };
  }

  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(e)) {
    const tokens = await ocrImage(file, (p) => opts.onProgress?.({ phase: "ocr", ...p }));
    const lines = groupIntoLines(tokens);
    return { lines, textLength: textLen(lines), pages: 1, usedOcr: true, kind: "image" };
  }

  if (["xlsx", "xls", "xlsm"].includes(e) || type.includes("spreadsheet") || type.includes("excel")) {
    const lines = await fromExcel(file);
    return { lines, textLength: textLen(lines), pages: 1, usedOcr: false, kind: "excel" };
  }

  if (e === "csv" || type === "text/csv") {
    const lines = rowsToLines(parseCsv(await file.text()));
    return { lines, textLength: textLen(lines), pages: 1, usedOcr: false, kind: "csv" };
  }

  if (e === "docx" || type.includes("wordprocessing") || type.includes("msword")) {
    const lines = await fromWord(file);
    return { lines, textLength: textLen(lines), pages: 1, usedOcr: false, kind: "word" };
  }

  const lines = textToLines(await file.text());
  return { lines, textLength: textLen(lines), pages: 1, usedOcr: false, kind: "text" };
}
