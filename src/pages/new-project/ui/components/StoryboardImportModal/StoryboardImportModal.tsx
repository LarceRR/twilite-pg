import { Grid2x2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useEscapeKey } from "@/shared/hooks/useEscapeKey";
import { classifyImportFile, type ImportPixelateRequest } from "../ImportPixelateModal/importFile";
import "../ImportPixelateModal/ImportPixelateModal.scss";
import { StoryboardImportModalFlow } from "./StoryboardImportModalFlow";
import { StoryboardImportPickFile } from "./StoryboardImportPickFile";
import "./StoryboardImportModal.scss";

type StoryboardImportModalProps = {
  onClose: () => void;
};

type GatePhase = "intro" | "pick";

export function StoryboardImportModal({ onClose }: StoryboardImportModalProps) {
  const [phase, setPhase] = useState<GatePhase>("intro");
  const [fileRequest, setFileRequest] = useState<ImportPixelateRequest | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [phase, fileRequest]);

  useEscapeKey(true, () => {
    onClose();
  });

  if (fileRequest) {
    return <StoryboardImportModalFlow request={fileRequest} onClose={onClose} />;
  }

  const title = phase === "intro" ? "Импорт раскадровки" : "Загрузите лист";

  const shell = (body: ReactNode, footer: ReactNode) => (
    <div
      className="import-pixelate"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="import-pixelate__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="storyboard-gate-title"
        tabIndex={-1}
      >
        <header className="import-pixelate__header">
          <h2 id="storyboard-gate-title">{title}</h2>
          <button type="button" className="import-pixelate__close" aria-label="Закрыть" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="import-pixelate__body">{body}</div>
        <footer className="import-pixelate__footer">{footer}</footer>
      </div>
    </div>
  );

  if (phase === "intro") {
    return shell(
      <div className="storyboard-import__promo">
        <div className="storyboard-import__promo-icon" aria-hidden>
          <Grid2x2 size={32} />
        </div>
        <p className="storyboard-import__promo-lead">
          Загрузите одно изображение, где несколько кадров уже собраны в ряд или сетку — как sheet из нейросети.
        </p>
        <ul className="storyboard-import__promo-list">
          <li>Сначала пикселизация, как при обычном импорте</li>
          <li>Обведите каждый кадр рамкой; калька помогает совместить позиции</li>
          <li>До 64 кадров в один слой «Раскадровка»</li>
        </ul>
      </div>,
      <>
        <button type="button" className="import-pixelate__btn" onClick={onClose}>
          Закрыть
        </button>
        <button
          type="button"
          className="import-pixelate__btn import-pixelate__btn--primary"
          onClick={() => setPhase("pick")}
        >
          Приступить
        </button>
      </>,
    );
  }

  return shell(
    <StoryboardImportPickFile
      onFile={(file) => {
        const classified = classifyImportFile(file);
        setFileRequest(
          classified.ok
            ? { kind: "file", file: classified.file }
            : { kind: "rejected", reason: classified.reason },
        );
      }}
    />,
    <>
      <button type="button" className="import-pixelate__btn" onClick={() => setPhase("intro")}>
        Назад
      </button>
      <button type="button" className="import-pixelate__btn" onClick={onClose}>
        Закрыть
      </button>
    </>,
  );
}
