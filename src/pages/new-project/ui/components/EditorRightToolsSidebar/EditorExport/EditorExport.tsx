import { Archive, FileImage, Grid3x3, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { downloadBlob } from "@/shared/lib/download";
import { hasAnyPermission, TPG_PERMISSIONS } from "@/shared/lib/rbac";
import { hexToRgba, useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { usePixelObjectEditStore } from "@/shared/store/pixelObjectEdit";
import { usePixelObjectLimitsStore } from "@/shared/store/pixelObjectLimits";
import { useSessionStore } from "@/shared/store/session";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import { applyCanvasFitToDocument } from "@/shared/pixelObject/applyCanvasFit";
import { canvasOversizeReason, exceedsCanvasMax } from "@/shared/pixelObject/canvasFit";
import { captureExportFrames } from "@/shared/pixelObject/capture";
import { EXPORT_SCALES, type ExportScale } from "@/shared/pixelObject/constants";
import { buildLocalManifest, fileSlug } from "@/shared/pixelObject/manifest";
import { blobBytes, pixelsToPngBlob, toImageData } from "@/shared/pixelObject/png";
import { compositeOnBackground, packSheet, scaleNearest } from "@/shared/pixelObject/pixels";
import { PIXEL_OBJECT_TYPE_LABEL } from "@/shared/pixelObject/objectType";
import { submitBlocker } from "@/shared/pixelObject/readiness";
import {
  activeFrameIndexFromIds,
  selectActiveExportFrame,
} from "@/shared/pixelObject/selectActiveExportFrame";
import { buildTpoZip, zipBlob } from "@/shared/pixelObject/zip";
import { ColorPicker, ColorPickerSwatchTrigger } from "@/shared/ui/ColorPicker";
import Input from "@/shared/ui/Input/Input";
import { toast } from "@/shared/ui/Toast";
import { CanvasOversizeActions } from "./CanvasOversizeActions";
import { useCatalogSubmit } from "./useCatalogSubmit";
import "./EditorExport.scss";

const NO_PERMISSIONS: string[] = [];

type ExportPanel = "download" | "catalog";
type DownloadKind = "frame" | "sheet" | "tpo";

const DOWNLOAD_FORMATS: ReadonlyArray<{
  id: DownloadKind;
  title: string;
  description: string;
  badge?: string;
  Icon: typeof FileImage;
}> = [
  {
    id: "frame",
    title: "PNG кадра",
    description: "Только текущий кадр на холсте",
    Icon: FileImage,
  },
  {
    id: "sheet",
    title: "Spritesheet",
    description: "Все кадры в одном PNG",
    Icon: Grid3x3,
  },
  {
    id: "tpo",
    title: "Пакет TPO",
    description: "manifest.json + sheet.png в архиве",
    badge: "Каталог",
    Icon: Archive,
  },
];

export const EditorExport = () => {
  const revision = useEditorCanvasStore((state) => state.revision);
  const frameCount = useEditorCanvasStore((state) => state.frames.length);
  const opaque = useMemo(() => useEditorCanvasStore.getState().hasOpaqueDocument(), [revision]);
  const width = useEditorCanvasStore((state) => state.width);
  const height = useEditorCanvasStore((state) => state.height);
  const permissions = useSessionStore((state) => state.user?.permissions ?? NO_PERMISSIONS);
  const canSubmit = hasAnyPermission(permissions, [
    TPG_PERMISSIONS.PIXEL_OBJECTS_SUBMIT,
    TPG_PERMISSIONS.PIXEL_OBJECTS_CREATE,
  ]);
  const showCatalogPanel = canSubmit;
  const limits = usePixelObjectLimitsStore((state) => state.limits);
  const editingObjectId = usePixelObjectEditStore((state) => state.editingObjectId);
  const editTitle = usePixelObjectEditStore((state) => state.title);
  const setEditTitle = usePixelObjectEditStore((state) => state.setTitle);

  const [panel, setPanel] = useState<ExportPanel>("download");
  const [title, setTitle] = useState(editTitle);
  const [scale, setScale] = useState<ExportScale>(1);
  const [transparent, setTransparent] = useState(true);
  const [flatColor, setFlatColor] = useState("#ffffff");
  const [downloading, setDownloading] = useState<DownloadKind | null>(null);
  const [fitBusy, setFitBusy] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const catalog = useCatalogSubmit(title);

  useEffect(() => {
    if (editTitle.length > 0) {
      setTitle(editTitle);
      setPanel("catalog");
    }
  }, [editTitle, editingObjectId]);

  const oversizeReason = canvasOversizeReason({ width, height }, limits.canvasMax);
  const blocker = submitBlocker({
    title,
    frameCount,
    opaque,
    canSubmit,
    projectId: catalog.projectId,
    width,
    height,
    canvasMax: limits.canvasMax,
    maxFrames: limits.maxFrames,
    titleMax: limits.titleMax,
  });

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) {
      return;
    }
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!context) {
      return;
    }
    const state = useEditorCanvasStore.getState();
    const factor = 2;
    const scaled = scaleNearest(state.getCompositePixels(), state.width, state.height, factor);
    canvas.width = state.width * factor;
    canvas.height = state.height * factor;
    context.imageSmoothingEnabled = false;
    context.putImageData(toImageData(scaled, canvas.width, canvas.height), 0, 0);
  }, [height, revision, width]);

  const prepareFramePng = async () => {
    const document = captureExportFrames();
    const state = useEditorCanvasStore.getState();
    const activeIndex = activeFrameIndexFromIds(
      state.frames.map((frame) => frame.id),
      state.activeFrameId,
    );
    const frame = selectActiveExportFrame(document.frames, activeIndex);
    if (!frame) {
      throw new Error("Нет кадра для экспорта");
    }
    const [red, green, blue] = hexToRgba(flatColor);
    const flattened = transparent
      ? frame.pixels
      : compositeOnBackground(frame.pixels, [red, green, blue]);
    const scaled = scaleNearest(flattened, document.width, document.height, scale);
    return pixelsToPngBlob(scaled, document.width * scale, document.height * scale);
  };

  const preparePackage = async () => {
    const document = captureExportFrames();
    const sheet = packSheet(
      document.frames.map((frame) => frame.pixels),
      document.width,
      document.height,
    );
    const local = buildLocalManifest({
      width: document.width,
      height: document.height,
      sheet,
      durationsMs: document.frames.map((frame) => frame.durationMs),
    });
    const png = await pixelsToPngBlob(sheet.pixels, sheet.width, sheet.height);
    return { local, png, slug: fileSlug(title) };
  };

  const runDownload = async (kind: DownloadKind) => {
    if (downloading) {
      return;
    }
    setDownloading(kind);
    try {
      if (kind === "frame") {
        downloadBlob(await prepareFramePng(), `${fileSlug(title) || "export"}-frame.png`);
      } else if (kind === "sheet") {
        const packed = await preparePackage();
        downloadBlob(packed.png, `${packed.slug || "export"}-sheet.png`);
      } else {
        const packed = await preparePackage();
        const bytes = buildTpoZip(JSON.stringify(packed.local, null, 2), await blobBytes(packed.png));
        downloadBlob(zipBlob(bytes), `${packed.slug || "export"}.tpo.zip`);
      }
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught));
    } finally {
      setDownloading(null);
    }
  };

  const applyFit = (mode: "nearest-downscale" | "center-crop") => {
    setFitBusy(true);
    try {
      const result = applyCanvasFitToDocument(limits.canvasMax, mode);
      if (!result.ok) {
        toast.error(result.reason);
      }
    } finally {
      setFitBusy(false);
    }
  };

  const exportSizeLabel = `${width}×${height}`;
  const frameLabel =
    frameCount === 1 ? "1 кадр" : frameCount >= 2 && frameCount <= 4 ? `${frameCount} кадра` : `${frameCount} кадров`;
  const submitDisabled =
    blocker !== null ||
    catalog.busy ||
    fitBusy ||
    exceedsCanvasMax({ width, height }, limits.canvasMax);

  return (
    <div className="editor-export">
      <header className="editor-export__hero">
        <div className="editor-export__preview-wrap">
          <canvas ref={previewRef} className="editor-export__preview" aria-label="Текущий кадр" />
        </div>
        <div className="editor-export__summary">
          <p className="editor-export__summary-title">Пакет экспорта</p>
          <div className="editor-export__badges">
            <span className="editor-export__badge">{exportSizeLabel} px</span>
            <span className="editor-export__badge">{frameLabel}</span>
            {!opaque ? (
              <span className="editor-export__badge editor-export__badge--warn">Нет непрозрачных пикселей</span>
            ) : null}
            {oversizeReason ? (
              <span className="editor-export__badge editor-export__badge--warn">Больше {limits.canvasMax}px</span>
            ) : null}
          </div>
        </div>
      </header>

      {showCatalogPanel ? (
        <div className="editor-export__panel-tabs" role="tablist" aria-label="Раздел экспорта">
          <button
            type="button"
            role="tab"
            aria-selected={panel === "download"}
            className={`editor-export__panel-tab${panel === "download" ? " editor-export__panel-tab--active" : ""}`}
            onClick={() => setPanel("download")}
          >
            Локально
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === "catalog"}
            className={`editor-export__panel-tab${panel === "catalog" ? " editor-export__panel-tab--active" : ""}`}
            onClick={() => setPanel("catalog")}
          >
            Каталог
          </button>
        </div>
      ) : null}

      {panel === "download" || !showCatalogPanel ? (
        <div className="editor-export__panel" role="tabpanel">
          <section className="editor-export__card">
            <h3 className="editor-export__card-title">Настройки PNG кадра</h3>
            <div className="editor-export__field">
              <span className="editor-export__label">Масштаб (nearest)</span>
              <div className="editor-export__segmented">
                {EXPORT_SCALES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`editor-export__segment${scale === value ? " editor-export__segment--active" : ""}`}
                    aria-pressed={scale === value}
                    onClick={() => setScale(value)}
                  >
                    {value}×
                  </button>
                ))}
              </div>
            </div>
            <div className="editor-export__field">
              <span className="editor-export__label">Фон кадра</span>
              <div className="editor-export__segmented editor-export__segmented--bg">
                <button
                  type="button"
                  className={`editor-export__segment${transparent ? " editor-export__segment--active" : ""}`}
                  aria-pressed={transparent}
                  onClick={() => setTransparent(true)}
                >
                  Прозрачный
                </button>
                <button
                  type="button"
                  className={`editor-export__segment${!transparent ? " editor-export__segment--active" : ""}`}
                  aria-pressed={!transparent}
                  onClick={() => setTransparent(false)}
                >
                  Заливка
                </button>
              </div>
              {!transparent ? (
                <div className="editor-export__color-row">
                  <ColorPicker value={flatColor} onChange={setFlatColor} aria-label="Цвет фона">
                    <ColorPickerSwatchTrigger color={flatColor} />
                  </ColorPicker>
                  <span className="editor-export__color-hex">{flatColor}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="editor-export__formats">
            <h3 className="editor-export__section-title">Скачать</h3>
            <ul className="editor-export__format-list">
              {DOWNLOAD_FORMATS.map(({ id, title: formatTitle, description, badge, Icon }) => {
                const isLoading = downloading === id;
                const meta =
                  id === "frame"
                    ? `${exportSizeLabel} · ${scale}×`
                    : id === "sheet"
                      ? `${frameCount} кадр. · ${exportSizeLabel}`
                      : "ZIP · manifest + sheet";
                return (
                  <li key={id}>
                    <article className="editor-export__format-card">
                      <div className="editor-export__format-icon" aria-hidden>
                        <Icon size={18} strokeWidth={1.75} />
                      </div>
                      <div className="editor-export__format-body">
                        <div className="editor-export__format-head">
                          <strong>{formatTitle}</strong>
                          {badge ? <span className="editor-export__format-badge">{badge}</span> : null}
                        </div>
                        <p>{description}</p>
                        <span className="editor-export__format-meta">{meta}</span>
                      </div>
                      <button
                        type="button"
                        className="editor-export__format-action"
                        disabled={Boolean(downloading)}
                        onClick={() => void runDownload(id)}
                      >
                        {isLoading ? <Loader2 size={20} className="editor-export__spin" /> : "Скачать"}
                      </button>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>

          <details className="editor-export__note">
            <summary>GIF и APNG</summary>
            <p>
              Только для локальной копии: альфа и палитра теряются. В каталог и мобильное приложение уходит
              TPO (sheet.png + manifest).
            </p>
          </details>
        </div>
      ) : (
        <div className="editor-export__panel" role="tabpanel">
          <section className="editor-export__card editor-export__card--submit">
            <h3 className="editor-export__card-title">
              {editingObjectId ? "Повторная отправка (PATCH)" : "Отправка на модерацию"}
            </h3>
            {catalog.objectType ? (
              <p className="editor-export__card-lead">Тип: {PIXEL_OBJECT_TYPE_LABEL[catalog.objectType]}</p>
            ) : null}
            <p className="editor-export__card-lead">
              {editingObjectId
                ? "Создаётся новая pending-ревизия. Текущая опубликованная версия остаётся доступной."
                : "Будет загружен spritesheet и manifest формата TPO. После публикации объект появится в каталоге."}
            </p>
            {oversizeReason ? (
              <CanvasOversizeActions
                reason={oversizeReason}
                busy={fitBusy || catalog.busy}
                onDownscale={() => applyFit("nearest-downscale")}
                onCenterCrop={() => applyFit("center-crop")}
              />
            ) : null}
            <label className="editor-export__field">
              <span className="editor-export__label">Название объекта</span>
              <Input
                variant="field"
                className="editor-export__title"
                value={title}
                maxLength={limits.titleMax}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setEditTitle(event.target.value);
                }}
                placeholder="Например: фонарь улицы"
              />
            </label>
            {blocker && !oversizeReason ? (
              <p className="editor-export__hint editor-export__hint--block">{blocker}</p>
            ) : null}
            <button
              type="button"
              className="editor-export__submit"
              disabled={submitDisabled}
              onClick={() => void catalog.send()}
            >
              {catalog.busy ? (
                <>
                  <Loader2 size={20} className="editor-export__spin" />
                  Отправка…
                </>
              ) : editingObjectId ? (
                "Отправить ревизию"
              ) : (
                "Отправить на модерацию"
              )}
            </button>
          </section>
        </div>
      )}
    </div>
  );
};
