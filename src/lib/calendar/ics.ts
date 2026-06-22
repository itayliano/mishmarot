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

/** RFC 5545 alarm trigger, e.g. 60 -> "-PT1H", 1440 -> "-P1D", 0 -> "PT0S". */
function triggerFor(minutes: number): string {
  if (minutes <= 0) return "TRIGGER:PT0S";
  if (minutes % 1440 === 0) return `TRIGGER:-P${minutes / 1440}D`;
  if (minutes % 60 === 0) return `TRIGGER:-PT${minutes / 60}H`;
  return `TRIGGER:-PT${minutes}M`;
}

/**
 * Build an importable .ics file (floating local time) from selected shifts.
 * `reminderMinutes` adds a VALARM that many minutes before each event
 * (null = no reminder). Defaults to 60 (one hour before).
 */
export function buildICS(shifts: Shift[], reminderMinutes: number | null = 60): string {
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
    if (reminderMinutes != null) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(fold(`DESCRIPTION:${esc(ev.title)}`));
      lines.push(triggerFor(reminderMinutes));
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Trigger a browser download of the .ics file. */
export function downloadICS(
  shifts: Shift[],
  reminderMinutes: number | null = 60,
  filename = "mishmarot.ics",
): void {
  const blob = new Blob([buildICS(shifts, reminderMinutes)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
