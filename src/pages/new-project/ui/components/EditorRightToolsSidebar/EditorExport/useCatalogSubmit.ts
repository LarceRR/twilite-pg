import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router";

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
import { toast } from "@/shared/ui/Toast";

export function useCatalogSubmit(title: string) {
  const [searchParams] = useSearchParams();
  const projectIdFromQuery = searchParams.get("projectId");
  const [busy, setBusy] = useState(false);
  const pipelineRef = useRef<SubmitPipelineState | null>(null);
  const editingObjectId = usePixelObjectEditStore((state) => state.editingObjectId);
  const editingProjectId = usePixelObjectEditStore((state) => state.projectId);
  const clearEditingObject = usePixelObjectEditStore((state) => state.clearEditingObject);
  const sheetMaxBytes = usePixelObjectLimitsStore((state) => state.limits.sheetMaxBytes);
  const projectId = editingProjectId ?? projectIdFromQuery;

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
    if (!projectId) {
      toast.warn("Нужен проект", {
        description: "Откройте редактор из карточки проекта, чтобы отправить объект.",
      });
      return;
    }
    setBusy(true);
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
        projectId,
        buildManifest: (mediaId) => toSubmitManifest(packed.local, mediaId),
        state: prior,
        deps: defaultSubmitPipelineDeps({ resubmitId: editingObjectId }),
      });
      pipelineRef.current = result.state;
      clearEditingObject();
      toast.success("Объект успешно отправлен на модерацию");
    } catch (caught) {
      if (caught instanceof SubmitPipelineError) {
        pipelineRef.current = caught.pipelineState;
      }
      toast.error(mapApiErrorMessage(caught, "Не удалось отправить объект."));
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    clearEditingObject,
    editingObjectId,
    preparePackage,
    projectId,
    sheetMaxBytes,
    title,
  ]);

  return { busy, send, preparePackage, projectId };
}
