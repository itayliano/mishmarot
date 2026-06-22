import type { Shift } from "../lib/parse/types";
import type { Strings } from "../i18n/strings";
import { googleTemplateUrl } from "../lib/calendar/googleUrl";

interface Props {
  rows: Shift[];
  strings: Strings;
  onUpdate: (id: string, patch: Partial<Shift>) => void;
  onDelete: (id: string) => void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const toDateValue = (s: Shift) => `${s.year}-${pad2(s.month)}-${pad2(s.day)}`;

export function ShiftTable({ rows, strings, onUpdate, onDelete }: Props) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{strings.colSelect}</th>
            <th>{strings.colDate}</th>
            <th>{strings.colStart}</th>
            <th>{strings.colEnd}</th>
            <th>{strings.overnight}</th>
            <th>{strings.colTitle}</th>
            <th>{strings.colLabel}</th>
            <th>{strings.colConfidence}</th>
            <th>{strings.colSource}</th>
            <th>{strings.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className={s.confidence < 0.6 ? "low" : undefined}>
              <td>
                <input
                  type="checkbox"
                  checked={s.selected}
                  onChange={(e) => onUpdate(s.id, { selected: e.target.checked })}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={toDateValue(s)}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    if (y && m && d) onUpdate(s.id, { year: y, month: m, day: d });
                  }}
                />
              </td>
              <td>
                <input
                  type="time"
                  value={s.start ?? ""}
                  onChange={(e) => onUpdate(s.id, { start: e.target.value || null })}
                />
              </td>
              <td>
                <input
                  type="time"
                  value={s.end ?? ""}
                  onChange={(e) => onUpdate(s.id, { end: e.target.value || null })}
                />
              </td>
              <td style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={s.endsNextDay}
                  onChange={(e) => onUpdate(s.id, { endsNextDay: e.target.checked })}
                />
              </td>
              <td>
                <input
                  className="title-input"
                  type="text"
                  value={s.title}
                  onChange={(e) => onUpdate(s.id, { title: e.target.value })}
                />
              </td>
              <td>
                <input
                  className="label-input"
                  type="text"
                  value={s.label ?? ""}
                  onChange={(e) => onUpdate(s.id, { label: e.target.value || undefined })}
                />
              </td>
              <td>
                <span
                  className="conf-bar"
                  title={`${Math.round(s.confidence * 100)}%`}
                  style={{ width: `${Math.max(6, Math.round(s.confidence * 40))}px` }}
                />
              </td>
              <td className="source-cell" title={s.raw}>
                {s.raw}
              </td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <a
                    className="button link"
                    href={googleTemplateUrl(s)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {strings.addToGoogle}
                  </a>
                  <button className="link" onClick={() => onDelete(s.id)}>
                    {strings.deleteRow}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
