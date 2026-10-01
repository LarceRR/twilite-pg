import { Archive, FileImage, Grid3x3, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { downloadBlob } from "@/shared/lib/download";
import { hasAnyPermission, TPG_PERMISSIONS } from "@/shared/lib/rbac";
import { hexToRgba, useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { useSessionStore } from "@/shared/store/session";
import {
  moderationErrorMessage,
  submitPixelObject,
  uploadPixelSheet,
} from "@/shared/api/pixelObjects";
import { captureExportFrames } from "@/shared/pixelObject/capture";
import { EXPORT_SCALES, type ExportScale } from "@/shared/pixelObject/constants";
import { buildLocalManifest, fileSlug, toSubmitManifest } from "@/shared/pixelObject/manifest";
import { blobBytes, pixelsToPngBlob, toImageData } from "@/shared/pixelObject/png";
import { compositeOnBackground, packSheet, scaleNearest } from "@/shared/pixelObject/pixels";
import { sheetTooLarge, submitBlocker } from "@/shared/pixelObject/readiness";
import {
  activeFrameIndexFromIds,
  selectActiveExportFrame,
} from "@/shared/pixelObject/selectActiveExportFrame";
import { buildTpoZip, zipBlob } from "@/shared/pixelObject/zip";
import { ColorPicker, ColorPickerSwatchTrigger } from "@/shared/ui/ColorPicker";
import Input from "@/shared/ui/Input/Input";
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

  const [panel, setPanel] = useState<ExportPanel>("download");
  const [title, setTitle] = useState("");
  const [scale, setScale] = useState<ExportScale>(1);
  const [transparent, setTransparent] = useState(true);
  const [flatColor, setFlatColor] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<DownloadKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const blocker = submitBlocker({
    title,
    frameCount,
    opaque,
    canSubmit,
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

  const downloadFrame = async () => {
    setError(null);
    setDownloading("frame");
    try {
      const blob = await prepareFramePng();
      downloadBlob(blob, `${fileSlug(title) || "export"}-frame.png`);
    } catch (caught) {
      setError(moderationErrorMessage(caught));
    } finally {
      setDownloading(null);
    }
  };

  const downloadSheet = async () => {
    setError(null);
    setDownloading("sheet");
    try {
      const packed = await preparePackage();
      downloadBlob(packed.png, `${packed.slug || "export"}-sheet.png`);
    } catch (caught) {
      setError(moderationErrorMessage(caught));
    } finally {
      setDownloading(null);
    }
  };

  const downloadTpo = async () => {
    setError(null);
    setDownloading("tpo");
    try {
      const packed = await preparePackage();
      const bytes = buildTpoZip(JSON.stringify(packed.local, null, 2), await blobBytes(packed.png));
      downloadBlob(zipBlob(bytes), `${packed.slug || "export"}.tpo.zip`);
    } catch (caught) {
      setError(moderationErrorMessage(caught));
    } finally {
      setDownloading(null);
    }
  };

  const runDownload = (kind: DownloadKind) => {
    if (downloading) {
      return;
    }
    if (kind === "frame") {
      void downloadFrame();
    } else if (kind === "sheet") {
      void downloadSheet();
    } else {
      void downloadTpo();
    }
  };

  const send = async () => {
    if (blocker || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const packed = await preparePackage();
      if (sheetTooLarge(packed.png.size)) {
        throw new Error("Spritesheet слишком большой.");
      }
      const mediaId = await uploadPixelSheet(packed.png);
      const manifest = toSubmitManifest(packed.local, mediaId);
      await submitPixelObject({ title: title.trim(), manifest });
    } catch (caught) {
      setError(moderationErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const exportSizeLabel = `${width}×${height}`;
  const frameLabel =
    frameCount === 1 ? "1 кадр" : frameCount >= 2 && frameCount <= 4 ? `${frameCount} кадра` : `${frameCount} кадров`;

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
                        onClick={() => runDownload(id)}
                      >
                        {isLoading ? <Loader2 size={16} className="editor-export__spin" /> : "Скачать"}
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
            <h3 className="editor-export__card-title">Отправка на модерацию</h3>
            <p className="editor-export__card-lead">
              Будет загружен spritesheet и manifest формата TPO. После публикации объект появится в каталоге.
            </p>
            <label className="editor-export__field">
              <span className="editor-export__label">Название объекта</span>
              <Input
                variant="field"
                className="editor-export__title"
                value={title}
                maxLength={80}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например: фонарь улицы"
              />
            </label>
            {blocker ? <p className="editor-export__hint editor-export__hint--block">{blocker}</p> : null}
            <button
              type="button"
              className="editor-export__submit"
              disabled={blocker !== null || busy}
              onClick={() => void send()}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="editor-export__spin" />
                  Отправка…
                </>
              ) : (
                "Отправить на модерацию"
              )}
            </button>

            {error ? (
              <p className="editor-export__banner editor-export__banner--error" role="alert">
                {error}
              </p>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
};
