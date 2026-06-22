import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import type { Token } from "../parse/types";

export interface OcrProgress {
  page: number;
  pages: number;
  progress: number; // 0..1 within the current page
}

/** Languages passed to Tesseract: Hebrew + English. */
const LANGS = "heb+eng";
/** Render scale — higher gives better OCR accuracy at the cost of speed. */
const SCALE = 2;

async function renderToCanvas(page: PDFPageProxy, scale: number): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** Flatten Tesseract's blocks → paragraphs → lines → words. */
function collectWords(data: { blocks?: unknown[] | null }): OcrWord[] {
  const out: OcrWord[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node.words)) out.push(...node.words);
    for (const key of ["blocks", "paragraphs", "lines"] as const) {
      if (Array.isArray(node[key])) node[key].forEach(walk);
    }
  };
  for (const block of (data.blocks as any[]) ?? []) walk(block);
  return out;
}

/**
 * Run OCR over every page of an already-loaded PDF and return positioned
 * tokens. Tesseract.js is imported dynamically so it (and the ~10MB Hebrew
 * language data) only load when a scanned PDF is encountered.
 */
export async function ocrDocument(
  doc: PDFDocumentProxy,
  onProgress?: (p: OcrProgress) => void,
): Promise<Token[]> {
  const mod: any = await import("tesseract.js");
  const createWorker = mod.createWorker ?? mod.default?.createWorker;
  let currentPage = 1;

  const worker = await createWorker(LANGS, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") {
        onProgress?.({ page: currentPage, pages: doc.numPages, progress: m.progress ?? 0 });
      }
    },
  });

  const tokens: Token[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      currentPage = p;
      const page = await doc.getPage(p);
      const canvas = await renderToCanvas(page, SCALE);
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      const h = canvas.height;
      for (const w of collectWords(data)) {
        const text = (w.text ?? "").trim();
        if (!text || !w.bbox) continue;
        tokens.push({
          text,
          x: w.bbox.x0,
          y: h - w.bbox.y0, // flip to bottom-left origin, matching PDF.js
          width: w.bbox.x1 - w.bbox.x0,
          height: Math.max(1, w.bbox.y1 - w.bbox.y0),
          page: p,
        });
      }
      // Release the (large) canvas before the next page.
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }
  return tokens;
}
