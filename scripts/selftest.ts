/**
 * Runtime self-test for the parsing + calendar core (no browser needed).
 * Run with: npm run selftest
 */
import { parseShifts } from "../src/lib/parse/parseShifts";
import type { Line, Token } from "../src/lib/parse/types";
import { buildICS } from "../src/lib/calendar/ics";
import { googleTemplateUrl } from "../src/lib/calendar/googleUrl";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}`, extra ?? "");
  }
}

// Build a Line from [text, x] pairs at a given baseline y.
function line(items: [string, number][], y: number, page = 1): Line {
  const tokens: Token[] = items
    .map(([text, x]) => ({ text, x, y, width: text.length * 6, height: 10, page }))
    .sort((a, b) => a.x - b.x);
  return { page, y, tokens, text: tokens.map((t) => t.text).join(" ") };
}

const REF = new Date(2026, 5, 22); // 2026-06-22 for deterministic year resolution

console.log("List mode (Hebrew):");
{
  const lines = [line([["ראשון", 10], ["22/06/2025", 120], ["07:00-15:00", 260], ["בוקר", 380]], 700)];
  const shifts = parseShifts(lines, { order: "DMY", lang: "he", ref: REF });
  check("one shift detected", shifts.length === 1, shifts);
  const s = shifts[0];
  check("date 2025-06-22", s.year === 2025 && s.month === 6 && s.day === 22, s);
  check("time 07:00-15:00", s.start === "07:00" && s.end === "15:00", s);
  check("title mentions בוקר", s.title.includes("בוקר"), s.title);
  check("not overnight", s.endsNextDay === false, s);
}

console.log("List mode (English) + 'to' range:");
{
  const lines = [line([["Monday", 10], ["23.06.2025", 120], ["15:00 to 23:00", 260], ["evening", 420]], 700)];
  const shifts = parseShifts(lines, { order: "DMY", lang: "en", ref: REF });
  check("one shift detected", shifts.length === 1, shifts);
  check("time 15:00-23:00", shifts[0]?.start === "15:00" && shifts[0]?.end === "23:00", shifts[0]);
  check("title Evening shift", shifts[0]?.title === "Evening shift", shifts[0]?.title);
}

console.log("Overnight shift:");
{
  const lines = [line([["24/06/2025", 10], ["23:00-07:00", 160]], 700)];
  const shifts = parseShifts(lines, { order: "DMY", lang: "he", ref: REF });
  check("ends next day", shifts[0]?.endsNextDay === true, shifts[0]);
}

console.log("Date with dots is NOT read as a time:");
{
  // "07.06.2025" must be a date, "08:00-16:00" the time.
  const lines = [line([["07.06.2025", 10], ["08:00-16:00", 160]], 700)];
  const shifts = parseShifts(lines, { order: "DMY", lang: "he", ref: REF });
  check("single shift", shifts.length === 1, shifts);
  check("date June 7", shifts[0]?.month === 6 && shifts[0]?.day === 7, shifts[0]);
  check("start 08:00", shifts[0]?.start === "08:00", shifts[0]);
}

console.log("MDY order:");
{
  const lines = [line([["03/04/2025", 10], ["09:00-17:00", 160]], 700)];
  const shifts = parseShifts(lines, { order: "MDY", lang: "en", ref: REF });
  check("month 3 day 4", shifts[0]?.month === 3 && shifts[0]?.day === 4, shifts[0]);
}

console.log("Grid mode (date header + time cells by column):");
{
  const header = line([["22/06", 100], ["23/06", 220], ["24/06", 340]], 700);
  const row = line([["דנה", 20], ["07:00-15:00", 100], ["15:00-23:00", 220]], 660);
  const shifts = parseShifts([header, row], { order: "DMY", lang: "he", ref: REF });
  check("two shifts from grid", shifts.length === 2, shifts);
  const byDay = Object.fromEntries(shifts.map((s) => [s.day, s]));
  check("col 22 -> 07:00", byDay[22]?.start === "07:00", byDay[22]);
  check("col 23 -> 15:00", byDay[23]?.start === "15:00", byDay[23]);
  check("label captured", shifts.every((s) => s.label === "דנה"), shifts);
  check("year resolved to 2026", shifts.every((s) => s.year === 2026), shifts);
}

console.log("Textual Hebrew date '22 ביוני 2025':");
{
  const lines = [line([["22", 10], ["ביוני", 60], ["2025", 130], ["07:00-15:00", 220]], 700)];
  const shifts = parseShifts(lines, { order: "DMY", lang: "he", ref: REF });
  check("date 2025-06-22", shifts[0]?.year === 2025 && shifts[0]?.month === 6 && shifts[0]?.day === 22, shifts[0]);
}

console.log("ICS + Google URL generation:");
{
  const lines = [line([["24/06/2025", 10], ["23:00-07:00", 160]], 700)];
  const shifts = parseShifts(lines, { order: "DMY", lang: "he", ref: REF });
  const ics = buildICS(shifts);
  check("ICS has VEVENT", ics.includes("BEGIN:VEVENT") && ics.includes("END:VCALENDAR"), ics);
  check("ICS DTSTART 20250624T230000", ics.includes("DTSTART:20250624T230000"), ics);
  check("ICS DTEND next day 20250625T070000", ics.includes("DTEND:20250625T070000"), ics);
  const url = googleTemplateUrl(shifts[0]);
  check("Google URL has TEMPLATE + dates", url.includes("action=TEMPLATE") && url.includes("dates="), url);
  check("Google URL spans to next day", url.includes("20250624T230000") && url.includes("20250625T070000"), url);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
