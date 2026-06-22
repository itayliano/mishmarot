import type { Shift } from "../parse/types";
import { resolveEvent } from "./event";

/**
 * Optional one-click sync via Google Calendar API, using Google Identity
 * Services (token client) entirely in the browser. Requires a Google OAuth
 * Client ID in VITE_GOOGLE_CLIENT_ID. Without it the app falls back to
 * per-shift template links and .ics download.
 */

const SCOPE =
  "https://www.googleapis.com/auth/calendar.events " +
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly";
const GIS_SRC = "https://accounts.google.com/gsi/client";

const LS_CLIENT_ID = "mishmarot_google_client_id";

/** Client ID resolved from the in-app setting (localStorage) or build-time env. */
export function getGoogleClientId(): string {
  try {
    const v = localStorage.getItem(LS_CLIENT_ID);
    if (v && v.trim()) return v.trim();
  } catch {
    /* localStorage unavailable */
  }
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
}

/** Persist a Client ID entered in the app (empty string clears it). */
export function setGoogleClientId(id: string): void {
  try {
    const v = id.trim();
    if (v) localStorage.setItem(LS_CLIENT_ID, v);
    else localStorage.removeItem(LS_CLIENT_ID);
  } catch {
    /* ignore */
  }
}

export const isGoogleConfigured = (): boolean => getGoogleClientId().length > 0;

// Minimal typings for the GIS global we use.
interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
  callback: (resp: TokenResponse) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return gisPromise;
}

/** Open the Google consent popup and resolve with an access token. */
export async function connectGoogle(): Promise<string> {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error("Google Client ID not configured");
  await loadGis();
  const oauth2 = window.google!.accounts.oauth2;
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.access_token) resolve(resp.access_token);
        else reject(new Error(resp.error || "Authorization failed"));
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

function tz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export interface CalendarItem {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
}

/** Fetch the user's writable calendars (primary first). */
export async function listCalendars(token: string): Promise<CalendarItem[]> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Failed to list calendars (${res.status})`);
  const data = await res.json();
  const items: CalendarItem[] = (data.items ?? []).map((c: Record<string, unknown>) => ({
    id: String(c.id),
    summary: String(c.summaryOverride || c.summary || c.id),
    primary: !!c.primary,
    accessRole: String(c.accessRole ?? ""),
  }));
  items.sort(
    (a, b) => Number(b.primary) - Number(a.primary) || a.summary.localeCompare(b.summary),
  );
  return items;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
function rfc3339(p: { year: number; month: number; day: number; hour: number; minute: number }) {
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}:00`;
}
function dateOnly(p: { year: number; month: number; day: number }) {
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

export interface InsertProgress {
  done: number;
  total: number;
  failed: number;
}

/** Insert all shifts into the user's primary calendar. Reports progress. */
export async function insertEvents(
  shifts: Shift[],
  token: string,
  reminderMinutes: number | null = 60,
  calendarId = "primary",
  onProgress?: (p: InsertProgress) => void,
): Promise<{ done: number; failed: number }> {
  const timeZone = tz();
  const reminders =
    reminderMinutes != null
      ? { useDefault: false, overrides: [{ method: "popup", minutes: reminderMinutes }] }
      : { useDefault: false, overrides: [] as { method: string; minutes: number }[] };
  let done = 0;
  let failed = 0;

  for (const shift of shifts) {
    const ev = resolveEvent(shift);
    const body = ev.allDay
      ? {
          summary: ev.title,
          description: ev.description || undefined,
          start: { date: dateOnly(ev.start) },
          end: { date: dateOnly(ev.end) },
          reminders,
        }
      : {
          summary: ev.title,
          description: ev.description || undefined,
          start: { dateTime: rfc3339(ev.start), timeZone },
          end: { dateTime: rfc3339(ev.end), timeZone },
          reminders,
        };

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) done++;
      else failed++;
    } catch {
      failed++;
    }
    onProgress?.({ done, total: shifts.length, failed });
  }

  return { done, failed };
}
