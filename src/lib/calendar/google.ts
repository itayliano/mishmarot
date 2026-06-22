import type { Shift } from "../parse/types";
import { resolveEvent } from "./event";

/**
 * Optional one-click sync via Google Calendar API, using Google Identity
 * Services (token client) entirely in the browser. Requires a Google OAuth
 * Client ID in VITE_GOOGLE_CLIENT_ID. Without it the app falls back to
 * per-shift template links and .ics download.
 */

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GIS_SRC = "https://accounts.google.com/gsi/client";

export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
export const isGoogleConfigured = (): boolean => googleClientId.length > 0;

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
  if (!isGoogleConfigured()) throw new Error("Google Client ID not configured");
  await loadGis();
  const oauth2 = window.google!.accounts.oauth2;
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: googleClientId,
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
  onProgress?: (p: InsertProgress) => void,
): Promise<{ done: number; failed: number }> {
  const timeZone = tz();
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
        }
      : {
          summary: ev.title,
          description: ev.description || undefined,
          start: { dateTime: rfc3339(ev.start), timeZone },
          end: { dateTime: rfc3339(ev.end), timeZone },
        };

    try {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
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
