import * as pdfjs from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
// Vite resolves this to a hashed URL for the worker bundle.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Line, Token } from "../parse/types";
import { ocrDocument, type OcrProgress } from "./ocr";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ExtractResult {
  lines: Line[];
  /** Total characters of text found. */
  textLength: number;
  pages: number;
  /** True when the text layer was empty and OCR was used instead. */
  usedOcr: boolean;
}

export type ExtractProgress =
  | { phase: "text" }
  | ({ phase: "ocr" } & OcrProgress);

export interface ExtractOptions {
  onProgress?: (p: ExtractProgress) => void;
  /** Set false to disable the OCR fallback (text layer only). */
  allowOcr?: boolean;
}

/** Below this many characters we treat the PDF as scanned/image-only. */
const MIN_TEXT = 10;

/**
 * Extract positioned text from a PDF. Uses the embedded text layer when
 * present (fast, accurate); falls back to OCR for scanned/image PDFs.
 */
export async function extractLines(
  data: ArrayBuffer,
  opts: ExtractOptions = {},
): Promise<ExtractResult> {
  const { onProgress, allowOcr = true } = opts;
  const doc = await pdfjs.getDocument({ data }).promise;
  try {
    onProgress?.({ phase: "text" });
    const textTokens: Token[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      for (const item of content.items) {
        const t = item as TextItem;
        const text = t.str.trim();
        if (!text) continue;
        const [, , , , x, y] = t.transform as number[];
        textTokens.push({ text, x, y, width: t.width, height: t.height || 10, page: p });
      }
    }
    const textLength = textTokens.reduce((n, t) => n + t.text.length, 0);

    if (textLength >= MIN_TEXT || !allowOcr) {
      return { lines: groupIntoLines(textTokens), textLength, pages: doc.numPages, usedOcr: false };
    }

    // Scanned/image PDF: OCR fallback (lazy-loads tesseract.js + language data).
    const ocrTokens = await ocrDocument(doc, (p: OcrProgress) =>
      onProgress?.({ phase: "ocr", ...p }),
    );
    const ocrLen = ocrTokens.reduce((n, t) => n + t.text.length, 0);
    return {
      lines: groupIntoLines(ocrTokens),
      textLength: ocrLen,
      pages: doc.numPages,
      usedOcr: true,
    };
  } finally {
    await doc.destroy();
  }
}

/** Group tokens that share a page and a similar baseline into one line. */
export function groupIntoLines(tokens: Token[]): Line[] {
  const sorted = [...tokens].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (Math.abs(a.y - b.y) > 0.5) return b.y - a.y; // top to bottom
    return a.x - b.x; // left to right
  });

  const lines: Line[] = [];
  let current: Token[] = [];

  const flush = () => {
    if (!current.length) return;
    const ordered = [...current].sort((a, b) => a.x - b.x);
    lines.push({
      page: ordered[0].page,
      y: ordered[0].y,
      tokens: ordered,
      text: ordered.map((t) => t.text).join(" "),
    });
    current = [];
  };

  for (const t of sorted) {
    if (!current.length) {
      current.push(t);
      continue;
    }
    const prev = current[current.length - 1];
    const tol = Math.max(2, Math.min(prev.height, t.height) * 0.6);
    if (t.page === prev.page && Math.abs(t.y - prev.y) <= tol) {
      current.push(t);
    } else {
      flush();
      current.push(t);
    }
  }
  flush();

  return lines;
}
