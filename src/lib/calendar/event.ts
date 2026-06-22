import type { Shift } from "../parse/types";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Add `n` days to a y/m/d triple using local calendar arithmetic. */
function addDays(year: number, month: number, day: number, n: number) {
  const d = new Date(year, month - 1, day + n);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export interface ResolvedEvent {
  allDay: boolean;
  start: { year: number; month: number; day: number; hour: number; minute: number };
  end: { year: number; month: number; day: number; hour: number; minute: number };
  title: string;
  description: string;
}

const parseHM = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return { hour: h, minute: m };
};

/**
 * Resolve a Shift into concrete start/end points, handling:
 *  - all-day shifts (no start time)
 *  - missing end (defaults to +1h)
 *  - overnight shifts (end rolls to the next day)
 */
export function resolveEvent(shift: Shift): ResolvedEvent {
  const { year, month, day } = shift;
  const description = shift.raw ? `מקור / source:\n${shift.raw}` : "";

  if (!shift.start) {
    return {
      allDay: true,
      start: { year, month, day, hour: 0, minute: 0 },
      end: { ...addDays(year, month, day, 1), hour: 0, minute: 0 },
      title: shift.title,
      description,
    };
  }

  const s = parseHM(shift.start);
  let endDate = { year, month, day };
  let e: { hour: number; minute: number };

  if (shift.end) {
    e = parseHM(shift.end);
    if (shift.endsNextDay) endDate = addDays(year, month, day, 1);
  } else {
    e = { hour: (s.hour + 1) % 24, minute: s.minute };
    if (s.hour + 1 >= 24) endDate = addDays(year, month, day, 1);
  }

  return {
    allDay: false,
    start: { year, month, day, hour: s.hour, minute: s.minute },
    end: { ...endDate, hour: e.hour, minute: e.minute },
    title: shift.title,
    description,
  };
}

/** "YYYYMMDD" */
export function basicDate(p: { year: number; month: number; day: number }): string {
  return `${p.year}${pad2(p.month)}${pad2(p.day)}`;
}

/** "YYYYMMDDTHHMMSS" (floating local time — no timezone suffix). */
export function basicDateTime(p: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): string {
  return `${basicDate(p)}T${pad2(p.hour)}${pad2(p.minute)}00`;
}

/** Human label like "ראשון 22/06/2025 07:00–15:00" for the review table. */
export function humanRange(shift: Shift): string {
  const d = `${pad2(shift.day)}/${pad2(shift.month)}/${shift.year}`;
  if (!shift.start) return `${d} · כל היום / all day`;
  const end = shift.end ? `–${shift.end}${shift.endsNextDay ? " (+1)" : ""}` : "";
  return `${d} · ${shift.start}${end}`;
}
