import { useCallback, useRef, useState } from "react";

import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import { captureExportFrames } from "@/shared/pixelObject/capture";
import { buildLocalManifest, toSubmitManifest } from "@/shared/pixelObject/manifest";
import { packSheet } from "@/shared/pixelObject/pixels";
import { pixelsToPngBlob } from "@/shared/pixelObject/png";
import { sheetTooLarge } from "@/shared/pixelObject/readiness";
import {
  createInitialPipelineState,
  defaultSubmitPipelineDeps,
  runSubmitPipeline,
  SubmitPipelineError,
  type SubmitPipelineState,
} from "@/shared/pixelObject/submitPipeline";
import { usePixelObjectEditStore } from "@/shared/store/pixelObjectEdit";
import { usePixelObjectLimitsStore } from "@/shared/store/pixelObjectLimits";

export type CatalogSubmitStatus = {
  busy: boolean;
  error: string | null;
  success: string | null;
};

export function useCatalogSubmit(title: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pipelineRef = useRef<SubmitPipelineState | null>(null);
  const editingObjectId = usePixelObjectEditStore((state) => state.editingObjectId);
  const clearEditingObject = usePixelObjectEditStore((state) => state.clearEditingObject);
  const sheetMaxBytes = usePixelObjectLimitsStore((state) => state.limits.sheetMaxBytes);

  const preparePackage = useCallback(async () => {
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
    return { local, png };
  }, []);

  const send = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const packed = await preparePackage();
      if (sheetTooLarge(packed.png.size, sheetMaxBytes)) {
        throw new Error("Spritesheet слишком большой.");
      }
      const fingerprint = `${packed.png.size}:image/png`;
      const prior = pipelineRef.current ?? createInitialPipelineState(fingerprint);
      const result = await runSubmitPipeline({
        sheet: packed.png,
        title: title.trim(),
        buildManifest: (mediaId) => toSubmitManifest(packed.local, mediaId),
        state: prior,
        deps: defaultSubmitPipelineDeps({ resubmitId: editingObjectId }),
      });
      pipelineRef.current = result.state;
      clearEditingObject();
      setSuccess(
        editingObjectId
          ? "Новая ревизия отправлена. Опубликованная версия остаётся доступной до решения модерации."
          : "Объект отправлен на модерацию. Можно закрыть вкладку — повторная отправка безопасна по Idempotency-Key.",
      );
    } catch (caught) {
      if (caught instanceof SubmitPipelineError) {
        pipelineRef.current = caught.pipelineState;
      }
      setError(mapApiErrorMessage(caught, "Не удалось отправить объект."));
    } finally {
      setBusy(false);
    }
  }, [busy, clearEditingObject, editingObjectId, preparePackage, sheetMaxBytes, title]);

  return { busy, error, success, send, setError, setSuccess, preparePackage };
}
