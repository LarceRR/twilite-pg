import { useEffect, useRef, useState } from "react";
import {
  pixelateFromFile,
  type PixelArtAlgorithm,
  type PixelateResult,
} from "@/shared/api/tpg";
import { resolvePixelGrid } from "@/shared/store/editorCanvas";
import { describePixelateError, isAbortError } from "./commitNativeImport";
import { decodeImageUrl } from "./decodeImageUrl";
import { decodeNativePng } from "./decodeNativePng";
import {
  DEFAULT_IMPORT_SETTINGS,
  loadImagePreview,
  type ImagePreview,
  type ImportPixelateRequest,
} from "./importFile";

export type PixelateImportStep =
  | "loading"
  | "source"
  | "settings"
  | "processing"
  | "error";

export type PixelateImportDoneStep = "result" | "slicing";

/** Delay after the last settings change before requesting a canvas preview. */
export const PIXELATE_PREVIEW_DEBOUNCE_MS = 450;

/** `pixelate` runs the converter. `original` keeps file pixels 1:1. */
export type PixelateSourceMode = "pixelate" | "original";

export type UsePixelateImportPipelineOptions = {
  request: ImportPixelateRequest;
  canPixelate: boolean;
  /** Called when pixelate + decode succeed. */
  onPixelateSuccess?: (payload: {
    result: PixelateResult;
    native: Uint8ClampedArray<ArrayBuffer>;
  }) => void;
  /** Step after an explicit confirm (storyboard → slicing). Default stays on settings with live preview. */
  resultStep?: PixelateImportDoneStep;
};

function revokeObjectUrl(url: string): void {
  if (!url.startsWith("blob:") || typeof URL.revokeObjectURL !== "function") {
    return;
  }
  try {
    URL.revokeObjectURL(url);
  } catch {
    // stale preview URL should not block closing
  }
}

export function usePixelateImportPipeline({
  request,
  canPixelate,
  onPixelateSuccess,
  resultStep = "result",
}: UsePixelateImportPipelineOptions) {
  const abortRef = useRef<AbortController | null>(null);
  const [step, setStep] = useState<PixelateImportStep | PixelateImportDoneStep>("loading");
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState<number>(DEFAULT_IMPORT_SETTINGS.pixelSize);
  const [paletteSize, setPaletteSize] = useState<number>(DEFAULT_IMPORT_SETTINGS.paletteSize);
  const [algorithm, setAlgorithm] = useState<PixelArtAlgorithm>(DEFAULT_IMPORT_SETTINGS.algorithm);
  const [sourceMode, setSourceMode] = useState<PixelateSourceMode>("pixelate");
  const [pixelateResult, setPixelateResult] = useState<PixelateResult | null>(null);
  const [nativePixels, setNativePixels] = useState<Uint8ClampedArray<ArrayBuffer> | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewStale, setPreviewStale] = useState(false);
  const [gridScale, setGridScale] = useState(1);

  const file = request.kind === "file" ? request.file : null;

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPixelateResult(null);
    setNativePixels(null);
    setPreviewError(null);
    setIsPreviewing(false);
    setPreviewStale(false);
    setGridScale(1);
    setSourceMode("pixelate");

    if (request.kind === "rejected") {
      setPreview(null);
      setError(request.reason);
      setStep("error");
      return;
    }

    let cancelled = false;
    setStep("loading");
    setError(null);
    setPreview(null);
    void loadImagePreview(request.file).then(
      (next) => {
        if (cancelled) {
          revokeObjectUrl(next.url);
          return;
        }
        setPreview(next);
        setStep("source");
      },
      (reason: unknown) => {
        if (cancelled) {
          return;
        }
        setError(reason instanceof Error ? reason.message : "Файл не является изображением");
        setStep("error");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [request]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) {
        revokeObjectUrl(preview.url);
      }
    };
  }, [preview]);

  const runPixelateJob = async (options: { advanceStep: boolean }) => {
    if (!file) {
      return false;
    }
    if (!canPixelate) {
      setError("Недостаточно прав для пикселизации");
      setStep("error");
      return false;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsPreviewing(true);
    setPreviewStale(false);
    setPreviewError(null);
    if (options.advanceStep) {
      setStep("processing");
      setError(null);
    }

    try {
      const result = await pixelateFromFile(file, {
        pixelSize,
        paletteSize,
        algorithm,
        signal: controller.signal,
      });
      const native = await decodeNativePng(result.nativeBase64, result.nativeWidth, result.nativeHeight);
      if (controller.signal.aborted) {
        return false;
      }
      setGridScale(1);
      setPixelateResult(result);
      setNativePixels(native);
      onPixelateSuccess?.({ result, native });
      if (options.advanceStep) {
        setStep(resultStep);
      }
      return true;
    } catch (reason) {
      if (controller.signal.aborted || isAbortError(reason)) {
        if (options.advanceStep) {
          setStep("settings");
        }
        return false;
      }
      const message = describePixelateError(reason);
      if (options.advanceStep) {
        setError(message);
        setStep("error");
      } else {
        setPreviewError(message);
      }
      return false;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsPreviewing(false);
    }
  };

  const runOriginalJob = async (options: { advanceStep: boolean }) => {
    if (!file || !preview) {
      return false;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsPreviewing(true);
    setPreviewStale(false);
    setPreviewError(null);
    if (options.advanceStep) {
      setStep("processing");
      setError(null);
    }

    try {
      const decoded = await decodeImageUrl(preview.url, preview.width, preview.height);
      if (controller.signal.aborted) {
        return false;
      }
      const grid = resolvePixelGrid(decoded, preview.width, preview.height);
      setGridScale(grid.scale);
      setPixelateResult({
        mimeType: "image/png",
        width: grid.width,
        height: grid.height,
        imageBase64: "",
        nativeWidth: grid.width,
        nativeHeight: grid.height,
        nativeBase64: "",
        pixelSize: 1,
        paletteSize: 0,
        algorithm: "nearest",
      });
      setNativePixels(grid.pixels);
      if (options.advanceStep) {
        setStep(resultStep);
      }
      return true;
    } catch (reason) {
      if (controller.signal.aborted || isAbortError(reason)) {
        if (options.advanceStep) {
          setStep("settings");
        }
        return false;
      }
      const message = reason instanceof Error ? reason.message : "Не удалось прочитать изображение";
      if (options.advanceStep) {
        setError(message);
        setStep("error");
      } else {
        setPreviewError(message);
      }
      return false;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsPreviewing(false);
    }
  };

  // Live preview: pixelate after settings settle, or read the file as-is.
  useEffect(() => {
    if (step !== "settings" || !file) {
      return;
    }
    if (sourceMode === "pixelate" && !canPixelate) {
      return;
    }
    if (sourceMode === "original" && !preview) {
      return;
    }

    setPreviewStale(true);
    abortRef.current?.abort();
    const delay = sourceMode === "original" ? 0 : PIXELATE_PREVIEW_DEBOUNCE_MS;
    const timer = window.setTimeout(() => {
      if (sourceMode === "original") {
        void runOriginalJob({ advanceStep: false });
        return;
      }
      void runPixelateJob({ advanceStep: false });
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
    // Intentionally re-run only when settings / step / file change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jobs close over latest settings
  }, [step, file, canPixelate, pixelSize, paletteSize, algorithm, sourceMode, preview]);

  const cancelProcessing = () => {
    abortRef.current?.abort();
    setIsPreviewing(false);
    setStep("settings");
  };

  const runPixelate = async () => {
    if (sourceMode === "original") {
      await runOriginalJob({ advanceStep: true });
      return;
    }
    await runPixelateJob({ advanceStep: true });
  };

  /** Advance to result/slicing using the current preview, or rebuild it if stale. */
  const confirmWithPreview = async () => {
    if (nativePixels && pixelateResult && !previewStale && !isPreviewing) {
      setStep(resultStep);
      return true;
    }
    if (sourceMode === "original") {
      return runOriginalJob({ advanceStep: true });
    }
    return runPixelateJob({ advanceStep: true });
  };

  const resetPixelateOutput = () => {
    setPixelateResult(null);
    setNativePixels(null);
    setPreviewError(null);
  };

  return {
    step,
    setStep,
    preview,
    error,
    previewError,
    file,
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
    runPixelate,
    confirmWithPreview,
    resetPixelateOutput,
  };
}
