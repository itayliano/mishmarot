/* Validate the parser against a real PDF: `tsx scripts/realtest.ts <file.pdf>` */
import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseShifts } from "../src/lib/parse/parseShifts";
import type { Line, Token } from "../src/lib/parse/types";

const path = process.argv[2];
if (!path) throw new Error("usage: tsx scripts/realtest.ts <file.pdf>");

const data = new Uint8Array(fs.readFileSync(path));
const doc = await getDocument({ data, useSystemFonts: true }).promise;

const tokens: Token[] = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  for (const it of content.items as any[]) {
    const text = (it.str || "").trim();
    if (!text) continue;
    const [, , , , x, y] = it.transform as number[];
    tokens.push({ text, x, y, width: it.width, height: it.height || 10, page: p });
  }
}

// Inline copy of groupIntoLines (extract.ts can't be imported under Node).
const sorted = [...tokens].sort((a, b) => {
  if (a.page !== b.page) return a.page - b.page;
  if (Math.abs(a.y - b.y) > 0.5) return b.y - a.y;
  return a.x - b.x;
});
const lines: Line[] = [];
let cur: Token[] = [];
const flush = () => {
  if (!cur.length) return;
  const ordered = [...cur].sort((a, b) => a.x - b.x);
  lines.push({ page: ordered[0].page, y: ordered[0].y, tokens: ordered, text: ordered.map((t) => t.text).join(" ") });
  cur = [];
};
for (const t of sorted) {
  if (!cur.length) { cur.push(t); continue; }
  const prev = cur[cur.length - 1];
  const tol = Math.max(2, Math.min(prev.height, t.height) * 0.6);
  if (t.page === prev.page && Math.abs(t.y - prev.y) <= tol) cur.push(t);
  else { flush(); cur.push(t); }
}
flush();

const shifts = parseShifts(lines, { order: "DMY", lang: "he" });
const people = [...new Set(shifts.map((s) => s.label).filter(Boolean))];

console.log(`pages=${doc.numPages} tokens=${tokens.length} lines=${lines.length}`);
console.log(`detected shifts: ${shifts.length}`);
console.log(`detected people (${people.length}):`);
console.log("  " + people.join(" | "));
console.log("\nsample shifts:");
for (const s of shifts.slice(0, 16)) {
  console.log(`  ${s.label ?? "—"} :: ${s.day}/${s.month}/${s.year} ${s.start ?? ""}-${s.end ?? ""}${s.endsNextDay ? "(+1)" : ""}`);
}
