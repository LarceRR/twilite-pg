import { LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePixelateImportPipeline } from "./usePixelateImportPipeline";
import { ImportPixelateSettingsFields } from "./ImportPixelateSettingsFields";
import {
  ImportPixelatePreviewPane,
  ImportPixelateSplitLayout,
} from "./ImportPixelateSplitLayout";
import { PixelGridPreview } from "./PixelGridPreview";
import { useEscapeKey } from "@/shared/hooks/useEscapeKey";
import { hasPermission, TPG_PERMISSIONS } from "@/shared/lib/rbac";
import { MAX_LAYERS, estimateNativeSize, useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { useSessionStore } from "@/shared/store/session";
import { commitNativeImport } from "./commitNativeImport";
import {
  formatByteSize,
  type ImagePreview,
  type ImportPixelateRequest,
} from "./importFile";
import { toast } from "@/shared/ui/Toast";
import "./ImportPixelateModal.scss";

export type { ImportPixelateRequest } from "./importFile";

type ImportStep = "loading" | "source" | "settings" | "processing" | "result" | "error";

type ImportPixelateModalProps = {
  request: ImportPixelateRequest;
  onClose: () => void;
};

const NO_PERMISSIONS: readonly string[] = [];

export function ImportPixelateModal({ request, onClose }: ImportPixelateModalProps) {
  const permissions = useSessionStore((state) => state.user?.permissions ?? NO_PERMISSIONS);
  const canPixelate = hasPermission(permissions, TPG_PERMISSIONS.PIXELATE_USE);
  const atLayerLimit = useEditorCanvasStore((state) => state.layers.length >= MAX_LAYERS);
  const documentWidth = useEditorCanvasStore((state) => state.width);
  const documentHeight = useEditorCanvasStore((state) => state.height);
  const hasPixels = useEditorCanvasStore((state) => state.hasOpaqueDocument());
  const activeBlockReason = useEditorCanvasStore((state) =>
    activeLayerBlockReason(state.layers, state.activeLayerId),
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const [ontoActive, setOntoActive] = useState(false);

  const pipeline = usePixelateImportPipeline({ request, canPixelate, resultStep: "result" });
  const {
    step: pipelineStep,
    setStep,
    preview,
    pixelSize,
    setPixelSize,
    paletteSize,
    setPaletteSize,
    algorithm,
    setAlgorithm,
    sourceMode,
    setSourceMode,
    pixelateResult,
    nativePixels,
    isPreviewing,
    previewStale,
    gridScale,
    cancelProcessing,
  } = pipeline;
  const step = pipelineStep as ImportStep;

  const file = request.kind === "file" ? request.file : null;
  const showForbidden = !canPixelate && file !== null && step !== "error";
  const isSettingsLayout = !showForbidden && step === "settings";

  useEffect(() => {
    setOntoActive(false);
  }, [request]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [step, showForbidden]);

  useEscapeKey(true, () => {
    if (step === "processing") {
      cancelProcessing();
      return;
    }
    onClose();
  });

  const estimate =
    preview === null ? null : estimateNativeSize(preview.width, preview.height, pixelSize);
  const adoptsNewSize =
    pixelateResult !== null &&
    (pixelateResult.nativeWidth !== documentWidth || pixelateResult.nativeHeight !== documentHeight);

  const addBlockReason = ontoActive
    ? activeBlockReason
    : atLayerLimit
      ? `Максимум ${MAX_LAYERS} слоёв — включите «На активный слой» или удалите слой`
      : null;

  const addToLayer = () => {
    if (!nativePixels || !pixelateResult || previewStale || isPreviewing) {
      return;
    }
    const result = commitNativeImport({
      native: nativePixels,
      nativeWidth: pixelateResult.nativeWidth,
      nativeHeight: pixelateResult.nativeHeight,
      ontoActive,
    });
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    onClose();
  };

  const title = showForbidden ? "Нет прав на импорт" : STEP_TITLES[step as ImportStep];
  const canCommit =
    nativePixels !== null &&
    pixelateResult !== null &&
    addBlockReason === null &&
    !isPreviewing &&
    !previewStale;

  return (
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
        className={`import-pixelate__dialog${isSettingsLayout ? " import-pixelate__dialog--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-pixelate-title"
        tabIndex={-1}
      >
        <header className="import-pixelate__header">
          <h2 id="import-pixelate-title">{title}</h2>
          <button type="button" className="import-pixelate__close" aria-label="Закрыть" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="import-pixelate__body">
          {showForbidden ? (
            <ForbiddenNotice preview={preview} loading={step === "loading"} />
          ) : null}

          {!showForbidden && step === "loading" ? (
            <p className="import-pixelate__status" role="status">
              <LoaderCircle className="import-pixelate__spin" size={18} aria-hidden="true" />
              Читаем файл
            </p>
          ) : null}

          {!showForbidden && step === "error" ? (
            <p className="import-pixelate__hint" role="status">
              Импорт не выполнен. Подробности — в уведомлении.
            </p>
          ) : null}

          {!showForbidden && preview && step === "source" ? (
            <figure className="import-pixelate__preview">
              <img src={preview.url} alt={preview.name} />
              <figcaption>
                {preview.name} · {preview.mimeType} · {preview.width}×{preview.height} ·{" "}
                {formatByteSize(preview.size)}
              </figcaption>
            </figure>
          ) : null}

          {!showForbidden && step === "settings" && estimate ? (
            <ImportPixelateSplitLayout
              left={
                <>
                  {preview ? (
                    <p className="import-pixelate__hint">
                      {preview.name} · {preview.width}×{preview.height} · {formatByteSize(preview.size)}
                    </p>
                  ) : null}
                  <ImportPixelateSettingsFields
                    sourceMode={sourceMode}
                    pixelSize={pixelSize}
                    paletteSize={paletteSize}
                    algorithm={algorithm}
                    estimate={estimate}
                    sourceWidth={preview?.width ?? estimate.width}
                    sourceHeight={preview?.height ?? estimate.height}
                    onSourceMode={setSourceMode}
                    onPixelSize={setPixelSize}
                    onPaletteSize={setPaletteSize}
                    onAlgorithm={setAlgorithm}
                  />
                  <DocumentSizeFields
                    ontoActive={ontoActive}
                    addBlockReason={addBlockReason}
                    nativeWidth={pixelateResult?.nativeWidth ?? null}
                    nativeHeight={pixelateResult?.nativeHeight ?? null}
                    gridScale={gridScale}
                    reportScale={sourceMode === "original"}
                    replacesPixels={hasPixels && adoptsNewSize}
                    onOntoActive={setOntoActive}
                  />
                </>
              }
              right={
                <ImportPixelatePreviewPane
                  isPreviewing={isPreviewing}
                  previewStale={previewStale}
                  hasPreview={nativePixels !== null && pixelateResult !== null}
                  title="Как выглядит сетка"
                  caption={
                    sourceMode === "original"
                      ? "Файл без пикселизации. Если найдётся шаг сетки, холст станет этой сеткой."
                      : "Сетка всегда на всю область. На холст она ляжет 1:1, и документ станет её размером."
                  }
                >
                  {nativePixels && pixelateResult ? (
                    <PixelGridPreview
                      pixels={nativePixels}
                      width={pixelateResult.nativeWidth}
                      height={pixelateResult.nativeHeight}
                      className="import-pixelate__sheet-fill"
                      label="Предпросмотр сетки"
                    />
                  ) : null}
                </ImportPixelatePreviewPane>
              }
            />
          ) : null}

          {!showForbidden && step === "processing" ? (
            <p className="import-pixelate__status" role="status">
              <LoaderCircle className="import-pixelate__spin" size={18} aria-hidden="true" />
              Пикселизация…
            </p>
          ) : null}
        </div>

        <footer className="import-pixelate__footer">
          {showForbidden ? (
            <button type="button" className="import-pixelate__btn" onClick={onClose}>
              Закрыть
            </button>
          ) : null}

          {!showForbidden && step === "source" ? (
            <button
              type="button"
              className="import-pixelate__btn import-pixelate__btn--primary"
              onClick={() => setStep("settings")}
            >
              Далее
            </button>
          ) : null}

          {!showForbidden && step === "settings" ? (
            <>
              <button type="button" className="import-pixelate__btn" onClick={() => setStep("source")}>
                Назад
              </button>
              <button
                type="button"
                className="import-pixelate__btn import-pixelate__btn--primary"
                disabled={!canCommit}
                onClick={addToLayer}
              >
                Добавить на слой
              </button>
            </>
          ) : null}

          {!showForbidden && step === "processing" ? (
            <button type="button" className="import-pixelate__btn" onClick={cancelProcessing}>
              Отмена
            </button>
          ) : null}

          {!showForbidden && step === "error" ? (
            <>
              {preview ? (
                <button type="button" className="import-pixelate__btn" onClick={() => setStep("settings")}>
                  К настройкам
                </button>
              ) : null}
              <button type="button" className="import-pixelate__btn" onClick={onClose}>
                Закрыть
              </button>
            </>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

const STEP_TITLES: Record<ImportStep, string> = {
  loading: "Импорт изображения",
  source: "Источник",
  settings: "Настройки пикселизации",
  processing: "Пикселизация",
  result: "Размещение на холсте",
  error: "Импорт не выполнен",
};

function ForbiddenNotice({ preview, loading }: { preview: ImagePreview | null; loading: boolean }) {
  return (
    <div className="import-pixelate__forbidden">
      <p role="alert">Недостаточно прав для пикселизации.</p>
      <p className="import-pixelate__hint">Нужно право {TPG_PERMISSIONS.PIXELATE_USE}.</p>
      {loading ? <p role="status">Читаем файл</p> : null}
      {preview ? (
        <p className="import-pixelate__hint">
          {preview.name} · {preview.mimeType} · {preview.width}×{preview.height}
        </p>
      ) : null}
    </div>
  );
}

function DocumentSizeFields({
  ontoActive,
  addBlockReason,
  nativeWidth,
  nativeHeight,
  gridScale,
  reportScale,
  replacesPixels,
  onOntoActive,
}: {
  ontoActive: boolean;
  addBlockReason: string | null;
  nativeWidth: number | null;
  nativeHeight: number | null;
  gridScale: number;
  reportScale: boolean;
  replacesPixels: boolean;
  onOntoActive: (value: boolean) => void;
}) {
  const sizeHint =
    nativeWidth === null || nativeHeight === null
      ? "Холст станет размером сетки, пиксель в пиксель."
      : reportScale && gridScale > 1
        ? `Сетка ${nativeWidth}×${nativeHeight}, шаг ${gridScale}. Холст станет этим размером.`
        : reportScale
          ? `Шаг сетки не найден, холст ${nativeWidth}×${nativeHeight}.`
          : `Холст станет ${nativeWidth}×${nativeHeight}. Один пиксель сетки — один пиксель документа.`;

  return (
    <div className="import-pixelate__result">
      {nativeWidth !== null && nativeHeight !== null ? (
        <p className="import-pixelate__badge">
          Native {nativeWidth}×{nativeHeight}
          {reportScale && gridScale > 1 ? ` · шаг ${gridScale}` : ""}
        </p>
      ) : null}
      <p className="import-pixelate__hint">{sizeHint}</p>
      {replacesPixels ? (
        <p className="import-pixelate__warning" role="status">
          Текущие пиксели будут сброшены: новый холст другого размера.
        </p>
      ) : null}

      <label className="import-pixelate__choice">
        <input
          type="checkbox"
          checked={ontoActive}
          onChange={(event) => onOntoActive(event.target.checked)}
        />
        <span>На активный слой</span>
      </label>

      {addBlockReason ? <p className="import-pixelate__warning">{addBlockReason}</p> : null}
    </div>
  );
}

function activeLayerBlockReason(
  layers: { id: string; locked: boolean; visible: boolean }[],
  activeLayerId: string,
): string | null {
  const active = layers.find((layer) => layer.id === activeLayerId);
  if (!active) {
    return "Слой не найден";
  }
  if (active.locked) {
    return "Слой заблокирован";
  }
  if (!active.visible) {
    return "Слой скрыт";
  }
  return null;
}
