import type { Shift } from "../parse/types";
import { basicDate, basicDateTime, resolveEvent } from "./event";

/** The browser's IANA timezone, so Google places times correctly. */
function tz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Build a "render?action=TEMPLATE" URL that opens Google Calendar with the
 * event pre-filled. No login to our app required — uses the user's own
 * Google session. One event per URL (Google's limitation).
 */
export function googleTemplateUrl(shift: Shift): string {
  const ev = resolveEvent(shift);
  const dates = ev.allDay
    ? `${basicDate(ev.start)}/${basicDate(ev.end)}`
    : `${basicDateTime(ev.start)}/${basicDateTime(ev.end)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates,
  });
  if (ev.description) params.set("details", ev.description);
  if (!ev.allDay) params.set("ctz", tz());

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
