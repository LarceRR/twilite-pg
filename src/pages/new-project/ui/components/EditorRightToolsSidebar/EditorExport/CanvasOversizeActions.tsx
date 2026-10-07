type CanvasOversizeActionsProps = {
  reason: string;
  busy: boolean;
  onDownscale: () => void;
  onCenterCrop: () => void;
};

export function CanvasOversizeActions({
  reason,
  busy,
  onDownscale,
  onCenterCrop,
}: CanvasOversizeActionsProps) {
  return (
    <div className="editor-export__oversize" role="group" aria-label="Превышение лимита холста">
      <p className="editor-export__hint editor-export__hint--block">{reason}</p>
      <div className="editor-export__oversize-actions">
        <button
          type="button"
          className="editor-export__segment"
          disabled={busy}
          onClick={onDownscale}
        >
          Уменьшить (nearest)
        </button>
        <button
          type="button"
          className="editor-export__segment"
          disabled={busy}
          onClick={onCenterCrop}
        >
          Обрезать по центру
        </button>
      </div>
    </div>
  );
}
