import type { Shift } from "../parse/types";
import { basicDate, basicDateTime, resolveEvent } from "./event";

/** Escape per RFC 5545 text rules. */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Fold lines longer than 75 octets (approximate by chars; fine for our text). */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length) {
    parts.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  return parts.join("\r\n");
}

function uid(i: number): string {
  return `mishmarot-${Date.now()}-${i}@local`;
}

/** Build an importable .ics file (floating local time) from selected shifts. */
export function buildICS(shifts: Shift[]): string {
  const stamp = basicDateTime({
    year: new Date().getUTCFullYear(),
    month: new Date().getUTCMonth() + 1,
    day: new Date().getUTCDate(),
    hour: new Date().getUTCHours(),
    minute: new Date().getUTCMinutes(),
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mishmarot//Shifts to Calendar//HE",
    "CALSCALE:GREGORIAN",
  ];

  shifts.forEach((shift, i) => {
    const ev = resolveEvent(shift);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid(i)}`);
    lines.push(`DTSTAMP:${stamp}Z`);
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${basicDate(ev.start)}`);
      lines.push(`DTEND;VALUE=DATE:${basicDate(ev.end)}`);
    } else {
      lines.push(`DTSTART:${basicDateTime(ev.start)}`);
      lines.push(`DTEND:${basicDateTime(ev.end)}`);
    }
    lines.push(fold(`SUMMARY:${esc(ev.title)}`));
    if (ev.description) lines.push(fold(`DESCRIPTION:${esc(ev.description)}`));
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Trigger a browser download of the .ics file. */
export function downloadICS(shifts: Shift[], filename = "mishmarot.ics"): void {
  const blob = new Blob([buildICS(shifts)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
