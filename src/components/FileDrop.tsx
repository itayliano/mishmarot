import { useRef, useState, type DragEvent } from "react";
import type { Strings } from "../i18n/strings";

interface Props {
  onFile: (file: File) => void;
  strings: Strings;
  fileName?: string;
  disabled?: boolean;
}

export function FileDrop({ onFile, strings, fileName, disabled }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file); // type is detected in the input pipeline
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) pick(e.dataTransfer.files);
  };

  return (
    <div
      className={`dropzone${over ? " over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <h2>{strings.dropTitle}</h2>
      <p>{strings.dropHint}</p>
      <button className="primary" onClick={() => inputRef.current?.click()} disabled={disabled}>
        {strings.chooseFile}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.xlsx,.xls,.xlsm,.csv,.docx,.txt,application/pdf,image/*"
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      {fileName && <div className="filename">📄 {fileName}</div>}
    </div>
  );
}
