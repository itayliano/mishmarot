import { useState } from "react";
import type { Shift } from "../lib/parse/types";
import type { Strings } from "../i18n/strings";
import { downloadICS } from "../lib/calendar/ics";
import {
  connectGoogle,
  insertEvents,
  isGoogleConfigured,
  getGoogleClientId,
  setGoogleClientId,
} from "../lib/calendar/google";

interface Props {
  selected: Shift[];
  strings: Strings;
}

type Phase = "idle" | "connecting" | "adding" | "done" | "error";

export function ExportBar({ selected, strings }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [message, setMessage] = useState<string>("");
  const [reminder, setReminder] = useState<number | null>(60);
  const [token, setToken] = useState<string | null>(null);
  const [configured, setConfigured] = useState(isGoogleConfigured());
  const [editingId, setEditingId] = useState(!isGoogleConfigured());
  const [draftId, setDraftId] = useState(getGoogleClientId());

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

  const saveClientId = () => {
    setGoogleClientId(draftId);
    setConfigured(isGoogleConfigured());
    setEditingId(false);
    setMessage("");
    setPhase("idle");
  };

  const signIn = async () => {
    try {
      setPhase("connecting");
      setMessage("");
      const t = await connectGoogle();
      setToken(t);
      setPhase("idle");
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const addAll = async () => {
    try {
      let t = token;
      if (!t) {
        setPhase("connecting");
        setMessage("");
        t = await connectGoogle();
        setToken(t);
      }
      setPhase("adding");
      setProgress({ done: 0, total: selected.length, failed: 0 });
      const { done, failed } = await insertEvents(selected, t, reminder, setProgress);
      setPhase("done");
      setMessage(failed ? strings.addedPartial(done, failed) : strings.addedOk(done));
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const busy = phase === "connecting" || phase === "adding";

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

          {!configured || editingId ? (
            <div className="clientid">
              <label>{strings.clientIdLabel}</label>
              <input
                type="text"
                value={draftId}
                placeholder={strings.clientIdPlaceholder}
                onChange={(e) => setDraftId(e.target.value)}
                spellCheck={false}
              />
              <div className="row">
                <button className="primary" onClick={saveClientId} disabled={!draftId.trim()}>
                  {strings.save}
                </button>
                <a
                  className="link"
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {strings.setupHow}
                </a>
              </div>
              <p className="muted">{strings.googleSetupHelp}</p>
            </div>
          ) : (
            <div className="google-actions">
              {token ? (
                <span className="badge ok">{strings.signedIn}</span>
              ) : (
                <button className="google" onClick={signIn} disabled={busy}>
                  {phase === "connecting" ? strings.connecting : strings.signIn}
                </button>
              )}
              <button className="primary" onClick={addAll} disabled={disabled || busy}>
                {phase === "adding"
                  ? strings.adding(progress.done, progress.total)
                  : strings.addAllGoogle}
              </button>
              <button className="link" onClick={() => setEditingId(true)}>
                {strings.change}
              </button>
            </div>
          )}
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
