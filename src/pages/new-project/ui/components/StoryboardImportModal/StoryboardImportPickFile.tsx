import { Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { classifyImportFile, pickImportFile } from "../ImportPixelateModal/importFile";

type StoryboardImportPickFileProps = {
  onFile: (file: File) => void;
  error: string | null;
  onError: (message: string | null) => void;
};

export function StoryboardImportPickFile({ onFile, error, onError }: StoryboardImportPickFileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropActive, setDropActive] = useState(false);
  const depth = useRef(0);

  const acceptFile = (file: File | null) => {
    const classified = classifyImportFile(file);
    if (!classified.ok) {
      onError(classified.reason);
      return;
    }
    onError(null);
    onFile(classified.file);
  };

  const dragHasFiles = (transfer: DataTransfer | null) =>
    Boolean(transfer?.types.includes("Files"));

  const onDragEnter = (event: DragEvent) => {
    if (!dragHasFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    depth.current += 1;
    setDropActive(true);
  };

  const onDragLeave = () => {
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setDropActive(false);
    }
  };

  const onDragOver = (event: DragEvent) => {
    if (!dragHasFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
  };

  const onDrop = (event: DragEvent) => {
    if (!dragHasFiles(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    depth.current = 0;
    setDropActive(false);
    acceptFile(pickImportFile(event.dataTransfer.files));
  };

  return (
    <div className="storyboard-import__pick">
      <div
        className={`storyboard-import__dropzone${dropActive ? " is-active" : ""}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <Upload size={28} aria-hidden />
        <p>Перетащите изображение сюда</p>
        <p className="import-pixelate__hint">PNG, JPEG, WebP или GIF · один лист с несколькими кадрами</p>
        <button
          type="button"
          className="import-pixelate__btn import-pixelate__btn--primary"
          onClick={() => inputRef.current?.click()}
        >
          Выбрать файл
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            acceptFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p className="import-pixelate__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
