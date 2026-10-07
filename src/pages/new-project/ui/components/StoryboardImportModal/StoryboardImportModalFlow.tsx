import { LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_FRAME_DURATION_MS,
  MAX_FRAME_DURATION_MS,
  MIN_FRAME_DURATION_MS,
} from "@/shared/pixelObject/constants";
import { useEscapeKey } from "@/shared/hooks/useEscapeKey";
import { hasPermission, TPG_PERMISSIONS } from "@/shared/lib/rbac";
import { MAX_FRAMES, estimateNativeSize, useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { useSessionStore } from "@/shared/store/session";
import { confirm } from "@/shared/ui/Confirm";
import Input from "@/shared/ui/Input/Input";
import { toast } from "@/shared/ui/Toast";
import { formatByteSize, type ImportPixelateRequest } from "../ImportPixelateModal/importFile";
import { usePixelateImportPipeline } from "../ImportPixelateModal/usePixelateImportPipeline";
import { ImportPixelateSettingsFields } from "../ImportPixelateModal/ImportPixelateSettingsFields";
import {
  ImportPixelatePreviewPane,
  ImportPixelateSplitLayout,
} from "../ImportPixelateModal/ImportPixelateSplitLayout";
import { PixelGridPreview } from "../ImportPixelateModal/PixelGridPreview";
import "../ImportPixelateModal/ImportPixelateModal.scss";
import { commitStoryboardImport } from "./commitStoryboardImport";
import { StoryboardFrameThumb } from "./StoryboardFrameThumb";
import { StoryboardSliceViewport } from "./StoryboardSliceViewport";
import { useStoryboardSlice } from "./useStoryboardSlice";
import "./StoryboardImportModal.scss";

type StoryboardStep = "loading" | "source" | "settings" | "processing" | "slicing" | "error";

const NO_PERMISSIONS: readonly string[] = [];

const STEP_TITLES: Record<StoryboardStep, string> = {
  loading: "Импорт раскадровки",
  source: "Источник",
  settings: "Настройки пикселизации",
  processing: "Пикселизация",
  slicing: "Нарезка на кадры",
  error: "Импорт не выполнен",
};

type StoryboardImportModalFlowProps = {
  request: ImportPixelateRequest;
  onClose: () => void;
};

export function StoryboardImportModalFlow({ request, onClose }: StoryboardImportModalFlowProps) {
  const permissions = useSessionStore((state) => state.user?.permissions ?? NO_PERMISSIONS);
  const canPixelate = hasPermission(permissions, TPG_PERMISSIONS.PIXELATE_USE);
  const frameCount = useEditorCanvasStore((state) => state.frames.length);
  const hasContent = useEditorCanvasStore((state) => state.hasOpaqueDocument());

  const dialogRef = useRef<HTMLDivElement>(null);
  const [commitMode, setCommitMode] = useState<"replace" | "append">("replace");
  const [showCommitPanel, setShowCommitPanel] = useState(false);
  const [frameDurationMs, setFrameDurationMs] = useState(DEFAULT_FRAME_DURATION_MS);

  const pipeline = usePixelateImportPipeline({
    request,
    canPixelate,
    resultStep: "slicing",
  });
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
    confirmWithPreview,
  } = pipeline;

  const step = pipelineStep as StoryboardStep;
  const nativeWidth = pixelateResult?.nativeWidth ?? 0;
  const nativeHeight = pixelateResult?.nativeHeight ?? 0;

  const slice = useStoryboardSlice(nativeWidth, nativeHeight);

  const file = request.kind === "file" ? request.file : null;
  const showForbidden = !canPixelate && file !== null && step !== "error";
  const needsCommitChoice = frameCount > 1 || hasContent;

  useEffect(() => {
    setShowCommitPanel(false);
    setCommitMode("replace");
    setFrameDurationMs(DEFAULT_FRAME_DURATION_MS);
  }, [request]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [step, showForbidden]);

  const tryClose = async () => {
    if (step === "slicing" && slice.confirmedRects.length > 0) {
      const ok = await confirm({
        title: "Отменить нарезку?",
        description: "Выбранные кадры не сохранятся.",
        confirmLabel: "Отменить",
        danger: true,
      });
      if (!ok) {
        return;
      }
    }
    onClose();
  };

  useEscapeKey(true, () => {
    if (step === "processing") {
      cancelProcessing();
      return;
    }
    tryClose();
  });

  const estimate =
    preview === null ? null : estimateNativeSize(preview.width, preview.height, pixelSize);

  const appendRoom = MAX_FRAMES - frameCount;
  const atFrameCap = slice.confirmedRects.length >= MAX_FRAMES;
  const appendBlocked =
    commitMode === "append" && slice.confirmedRects.length > appendRoom;

  const canPickNext =
    nativePixels !== null &&
    !atFrameCap &&
    (commitMode !== "append" || slice.confirmedRects.length < appendRoom);

  const handleConfirmFrame = () => {
    if (!canPickNext) {
      return;
    }
    slice.confirmCurrent();
    setShowCommitPanel(false);
  };

  const handleFinish = () => {
    if (!nativePixels || slice.confirmedRects.length < 1) {
      return;
    }
    if (needsCommitChoice && !showCommitPanel) {
      setShowCommitPanel(true);
      return;
    }
    if (appendBlocked) {
      return;
    }
    const mode = needsCommitChoice ? commitMode : "replace";
    const result = commitStoryboardImport({
      rects: slice.confirmedRects,
      native: nativePixels,
      nativeWidth,
      nativeHeight,
      mode,
      frameDurationMs,
    });
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    onClose();
  };

  const handleThumbSelect = async (index: number) => {
    if (index < slice.confirmedRects.length - 1) {
      const ok = await confirm({
        title: `Кадры после ${index + 1} будут удалены`,
        description: "Продолжить?",
        confirmLabel: "Продолжить",
        danger: true,
      });
      if (!ok) {
        return;
      }
      slice.trimAndEdit(index);
      return;
    }
    slice.jumpToEdit(index);
  };

  const title = showForbidden ? "Нет прав на импорт" : STEP_TITLES[step];
  const isSettingsLayout = !showForbidden && step === "settings";
  const canGoToSlicing =
    nativePixels !== null &&
    pixelateResult !== null &&
    !isPreviewing &&
    !previewStale;

  return (
    <div
      className="import-pixelate"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          tryClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`import-pixelate__dialog${
          isSettingsLayout || step === "slicing" ? " import-pixelate__dialog--wide" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="storyboard-import-title"
        tabIndex={-1}
      >
        <header className="import-pixelate__header">
          <h2 id="storyboard-import-title">{title}</h2>
          <button type="button" className="import-pixelate__close" aria-label="Закрыть" onClick={tryClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="import-pixelate__body">
          {showForbidden ? (
            <p role="alert">Недостаточно прав для пикселизации.</p>
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
                  {pixelateResult ? (
                    <p className="import-pixelate__badge">
                      {sourceMode === "original" ? "Как есть" : "Сетка"} {pixelateResult.nativeWidth}×
                      {pixelateResult.nativeHeight}
                      {sourceMode === "original" && gridScale > 1 ? ` · шаг ${gridScale}` : ""}
                    </p>
                  ) : null}
                </>
              }
              right={
                <ImportPixelatePreviewPane
                  isPreviewing={isPreviewing}
                  previewStale={previewStale}
                  hasPreview={nativePixels !== null && pixelateResult !== null}
                  title="Как выглядит лист"
                  caption="Лист вписан в область целиком. Крупность блока меняет число клеток, а не размер этой картинки."
                  emptyHint="Предпросмотр листа появится здесь"
                >
                  {nativePixels && pixelateResult ? (
                    <PixelGridPreview
                      pixels={nativePixels}
                      width={pixelateResult.nativeWidth}
                      height={pixelateResult.nativeHeight}
                      className="import-pixelate__sheet-fill"
                      label="Предпросмотр листа"
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

          {!showForbidden && step === "slicing" && nativePixels && pixelateResult ? (
            <>
              <p className="import-pixelate__badge">
                Native {nativeWidth}×{nativeHeight}
                {sourceMode === "original" && gridScale > 1 ? ` · шаг ${gridScale}` : ""} · кадров{" "}
                {slice.confirmedRects.length}/{MAX_FRAMES}
                {commitMode === "append" ? ` · можно добавить ещё ${appendRoom}` : ""}
              </p>
              <p className="import-pixelate__hint">
                Рамка тянется свободно: угол и сторона — в свою сторону, Shift — ещё и в противоположную.
              </p>
              <StoryboardSliceViewport
                native={nativePixels}
                nativeWidth={nativeWidth}
                nativeHeight={nativeHeight}
                draftRect={slice.draftRect}
                onionRect={slice.onionRect}
                canResize={slice.canResize}
                onDraftRect={slice.setDraftRect}
              />
              <div className="storyboard-import__toolbar">
                <label className="import-pixelate__choice">
                  <input
                    type="checkbox"
                    checked={slice.allowVariableSize}
                    onChange={(event) => slice.setAllowVariableSize(event.target.checked)}
                  />
                  <span>Разный размер на кадрах</span>
                </label>
                <div className="storyboard-import__duration">
                  <span>Длительность кадра, мс</span>
                  <Input
                    variant="field"
                    className="storyboard-import__duration-input"
                    value={frameDurationMs}
                    commitOnBlur
                    min={MIN_FRAME_DURATION_MS}
                    max={MAX_FRAME_DURATION_MS}
                    inputMode="numeric"
                    aria-label="Длительность кадра в миллисекундах"
                    onNumberCommit={setFrameDurationMs}
                  />
                </div>
                {slice.frameOverflow ? (
                  <p className="import-pixelate__warning" role="status">
                    Кадр больше первого. Все кадры должны помещаться в размер первого.
                  </p>
                ) : null}
                {slice.sizesDiffer && !slice.frameOverflow ? (
                  <p className="import-pixelate__hint">
                    Меньший кадр сядет в левый верхний угол прозрачного поля первого кадра.
                  </p>
                ) : null}
              </div>
              {slice.confirmedRects.length > 0 ? (
                <div className="storyboard-import__thumbs">
                  {slice.confirmedRects.map((rect, index) => (
                    <StoryboardFrameThumb
                      key={`${index}-${rect.x}-${rect.y}`}
                      native={nativePixels}
                      nativeWidth={nativeWidth}
                      nativeHeight={nativeHeight}
                      rect={rect}
                      index={index}
                      active={slice.reeditFromIndex === index}
                      onSelect={() => handleThumbSelect(index)}
                    />
                  ))}
                </div>
              ) : null}
              {showCommitPanel && needsCommitChoice ? (
                <div className="storyboard-import__commit">
                  <p className="import-pixelate__hint">
                    Bulk-импорт нельзя отменить одним Ctrl+Z — выберите, как применить кадры.
                  </p>
                  <div className="storyboard-import__commit-options" role="radiogroup" aria-label="Режим импорта">
                    <label className="import-pixelate__choice">
                      <input
                        type="radio"
                        name="storyboard-commit"
                        checked={commitMode === "replace"}
                        onChange={() => setCommitMode("replace")}
                      />
                      <span>Заменить анимацию (один слой «Раскадровка»)</span>
                    </label>
                    <label className="import-pixelate__choice">
                      <input
                        type="radio"
                        name="storyboard-commit"
                        checked={commitMode === "append"}
                        onChange={() => setCommitMode("append")}
                      />
                      <span>Добавить в конец таймлайна</span>
                    </label>
                  </div>
                  {appendBlocked ? (
                    <p className="import-pixelate__warning" role="alert">
                      Можно добавить ещё {appendRoom} кадр(ов).
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
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
                disabled={!canGoToSlicing}
                onClick={() => void confirmWithPreview()}
              >
                К нарезке
              </button>
            </>
          ) : null}

          {!showForbidden && step === "processing" ? (
            <button type="button" className="import-pixelate__btn" onClick={cancelProcessing}>
              Отмена
            </button>
          ) : null}

          {!showForbidden && step === "slicing" ? (
            <>
              <button
                type="button"
                className="import-pixelate__btn"
                disabled={slice.confirmedRects.length === 0}
                onClick={slice.goBack}
              >
                Назад
              </button>
              <button
                type="button"
                className="import-pixelate__btn import-pixelate__btn--primary"
                disabled={!canPickNext}
                onClick={handleConfirmFrame}
              >
                Выбрать кадр №{slice.pickingIndex + 1}
              </button>
              <button
                type="button"
                className="import-pixelate__btn import-pixelate__btn--primary"
                disabled={slice.confirmedRects.length < 1 || appendBlocked || slice.frameOverflow}
                onClick={handleFinish}
              >
                {showCommitPanel && needsCommitChoice ? "Применить" : "Завершить раскадровку"}
              </button>
            </>
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
