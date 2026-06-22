import { useState } from "react";
import type { Shift } from "../lib/parse/types";
import type { Strings } from "../i18n/strings";
import { downloadICS } from "../lib/calendar/ics";
import { connectGoogle, insertEvents, isGoogleConfigured } from "../lib/calendar/google";

interface Props {
  selected: Shift[];
  strings: Strings;
}

type Phase = "idle" | "connecting" | "adding" | "done" | "error";

export function ExportBar({ selected, strings }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [message, setMessage] = useState<string>("");
  const configured = isGoogleConfigured();
  const disabled = selected.length === 0;

  const addAll = async () => {
    try {
      setPhase("connecting");
      setMessage("");
      const token = await connectGoogle();
      setPhase("adding");
      setProgress({ done: 0, total: selected.length, failed: 0 });
      const { done, failed } = await insertEvents(selected, token, setProgress);
      setPhase("done");
      setMessage(failed ? strings.addedPartial(done, failed) : strings.addedOk(done));
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="export">
      <h3>{strings.exportHeading}</h3>
      <div className="muted">{strings.selectedCount(selected.length)}</div>
      <div className="spacer" />

      <div className="row">
        {configured ? (
          <button
            className="google"
            onClick={addAll}
            disabled={disabled || phase === "connecting" || phase === "adding"}
          >
            {phase === "connecting"
              ? strings.connecting
              : phase === "adding"
                ? strings.adding(progress.done, progress.total)
                : strings.addAllGoogle}
          </button>
        ) : null}

        <button className="ghost" onClick={() => downloadICS(selected)} disabled={disabled}>
          {strings.downloadIcs}
        </button>
      </div>

      {!configured && (
        <>
          <div className="spacer" />
          <div className="muted">{strings.googleNotConfigured}</div>
        </>
      )}

      <div className="spacer" />
      <div className="muted">{strings.perShiftHint}</div>

      {phase === "done" && <div className="notice ok">{message}</div>}
      {phase === "error" && (
        <div className="notice error">
          {strings.error}: {message}
        </div>
      )}
    </div>
  );
}
