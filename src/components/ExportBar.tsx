import { useState } from "react";
import type { Shift } from "../lib/parse/types";
import type { Strings } from "../i18n/strings";
import { downloadICS } from "../lib/calendar/ics";
import { insertEvents, type CalendarItem } from "../lib/calendar/google";

interface Props {
  selected: Shift[];
  strings: Strings;
  token: string | null;
  busy: boolean;
  calendars: CalendarItem[];
  calendarId: string;
  onCalendarChange: (id: string) => void;
  onConnect: () => Promise<string | null>;
}

type Phase = "idle" | "adding" | "done" | "error";

export function ExportBar({
  selected,
  strings,
  token,
  busy,
  calendars,
  calendarId,
  onCalendarChange,
  onConnect,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [message, setMessage] = useState<string>("");
  const [reminder, setReminder] = useState<number | null>(60);

  const disabled = selected.length === 0;

  const reminderOptions: { value: number | null; label: string }[] = [
    { value: null, label: strings.reminderNone },
    { value: 0, label: strings.reminderAtStart },
    { value: 10, label: strings.reminder10m },
    { value: 30, label: strings.reminder30m },
    { value: 60, label: strings.reminder1h },
    { value: 120, label: strings.reminder2h },
    { value: 1440, label: strings.reminder1d },
  ];

  const addAll = async () => {
    try {
      let t = token;
      if (!t) t = await onConnect();
      if (!t) return;
      setPhase("adding");
      setMessage("");
      setProgress({ done: 0, total: selected.length, failed: 0 });
      const { done, failed, firstError } = await insertEvents(
        selected,
        t,
        reminder,
        calendarId,
        setProgress,
      );
      if (done === 0 && failed > 0) {
        setPhase("error");
        setMessage(firstError || strings.addedPartial(done, failed));
      } else {
        setPhase("done");
        setMessage(
          failed ? `${strings.addedPartial(done, failed)} (${firstError})` : strings.addedOk(done),
        );
      }
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const adding = phase === "adding";

  return (
    <section className="export">
      <h3>{strings.exportHeading}</h3>
      <div className="export-meta">
        <span className="badge">{strings.selectedCount(selected.length)}</span>
        <label className="reminder">
          🔔 {strings.reminderLabel}
          <select
            value={reminder == null ? "none" : String(reminder)}
            onChange={(e) =>
              setReminder(e.target.value === "none" ? null : Number(e.target.value))
            }
          >
            {reminderOptions.map((o) => (
              <option key={String(o.value)} value={o.value == null ? "none" : String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="export-grid">
        {/* Google card */}
        <div className="export-card">
          <div className="export-card-title">Google Calendar</div>

          {token && calendars.length > 0 && (
            <label className="reminder calendar-pick">
              🗓️ {strings.targetCalendar}
              <select value={calendarId} onChange={(e) => onCalendarChange(e.target.value)}>
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary}
                    {c.primary ? " ★" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="row">
            <button className="primary" onClick={addAll} disabled={disabled || busy || adding}>
              {adding ? strings.adding(progress.done, progress.total) : strings.addAllGoogle}
            </button>
          </div>
          {!token && <p className="muted">{strings.signInToAdd}</p>}
        </div>

        {/* File card */}
        <div className="export-card">
          <div className="export-card-title">.ics</div>
          <button
            className="ghost"
            onClick={() => downloadICS(selected, reminder)}
            disabled={disabled}
          >
            ⬇️ {strings.downloadIcs}
          </button>
          <p className="muted">{strings.perShiftHint}</p>
          <p className="muted">{strings.templateNoReminder}</p>
        </div>
      </div>

      {phase === "done" && <div className="notice ok">{message}</div>}
      {phase === "error" && (
        <div className="notice error">
          {strings.error}: {message}
        </div>
      )}
    </section>
  );
}
