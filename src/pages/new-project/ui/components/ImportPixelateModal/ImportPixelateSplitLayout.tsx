import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

type ImportPixelateSplitLayoutProps = {
  left: ReactNode;
  right: ReactNode;
};

export function ImportPixelateSplitLayout({ left, right }: ImportPixelateSplitLayoutProps) {
  return (
    <div className="import-pixelate__split">
      <div className="import-pixelate__pane import-pixelate__pane--settings">{left}</div>
      <div className="import-pixelate__pane import-pixelate__pane--preview">{right}</div>
    </div>
  );
}

type ImportPixelatePreviewPaneProps = {
  isPreviewing: boolean;
  previewStale: boolean;
  previewError: string | null;
  children: ReactNode;
  title?: string;
  caption?: string;
  emptyHint?: string;
  hasPreview: boolean;
};

export function ImportPixelatePreviewPane({
  isPreviewing,
  previewStale,
  previewError,
  children,
  title = "Предпросмотр",
  caption,
  emptyHint = "Предпросмотр появится здесь",
  hasPreview,
}: ImportPixelatePreviewPaneProps) {
  return (
    <div className="import-pixelate__preview-pane">
      <p className="import-pixelate__preview-title">{title}</p>
      <div className="import-pixelate__preview-stage">
        {hasPreview ? children : <p className="import-pixelate__hint">{emptyHint}</p>}
        {isPreviewing || previewStale ? (
          <div className="import-pixelate__preview-overlay" role="status">
            <LoaderCircle className="import-pixelate__spin" size={20} aria-hidden />
            <span>Обновляем предпросмотр…</span>
          </div>
        ) : null}
      </div>
      {caption ? <p className="import-pixelate__hint">{caption}</p> : null}
      {previewError ? (
        <p className="import-pixelate__error" role="alert">
          {previewError}
        </p>
      ) : null}
    </div>
  );
}
