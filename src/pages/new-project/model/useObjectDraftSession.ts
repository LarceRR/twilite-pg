import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { OBJECT_DRAFT_TITLE, getObjectDraft, isObjectDraftSealed, putObjectDraft, removeObjectDraft } from "@/shared/pixelObject/objectDraftStore";
import { parsePixelObjectType, type PixelObjectType } from "@/shared/pixelObject/objectType";
import { CANVAS_HEIGHT, CANVAS_WIDTH, useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { captureEditorDraft } from "@/shared/store/editorCanvas/model/draftDocument";
import { useEditorViewportStore } from "@/shared/store/editorViewport";
import { usePixelObjectEditStore } from "@/shared/store/pixelObjectEdit";
import { toast } from "@/shared/ui/Toast";

let freshDraftId: string | null = null;
let storeWarningShown = false;

export function markFreshObjectDraft(id: string): void {
  freshDraftId = id;
}

async function saveCurrentDraft(input: {
  draftId: string;
  projectId: string;
  objectType: PixelObjectType;
}): Promise<void> {
  if (isObjectDraftSealed(input.draftId)) {
    return;
  }
  try {
    const canvas = useEditorCanvasStore.getState();
    if (!canvas.hasOpaqueDocument()) {
      await removeObjectDraft(input.draftId);
      return;
    }
    const snapshot = captureEditorDraft(canvas);
    let previewPng: Blob | null = null;
    try {
      previewPng = await canvas.exportPngBlob();
    } catch {
      previewPng = null;
    }
    const title = usePixelObjectEditStore.getState().title.trim() || OBJECT_DRAFT_TITLE;
    await putObjectDraft({
      id: input.draftId,
      projectId: input.projectId,
      objectType: input.objectType,
      title,
      updatedAt: new Date().toISOString(),
      previewPng,
      snapshot,
    });
  } catch {
    if (!storeWarningShown) {
      storeWarningShown = true;
      toast.warn("Черновик не сохранился в браузере");
    }
  }
}

export function useObjectDraftSession() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editingObjectId = usePixelObjectEditStore((state) => state.editingObjectId);
  const projectId = searchParams.get("projectId");
  const draftId = searchParams.get("draftId");
  const objectType = parsePixelObjectType(searchParams.get("objectType"));
  const editing = searchParams.get("edit") === "1" && editingObjectId !== null;
  const persist = !editing && projectId !== null && objectType !== null && draftId !== null;
  const [bootedDraftId, setBootedDraftId] = useState<string | null>(persist ? null : draftId);

  useEffect(() => {
    if (!persist || !draftId || !objectType || !projectId) {
      setBootedDraftId(draftId);
      return;
    }
    let cancelled = false;
    setBootedDraftId(null);
    void getObjectDraft(draftId)
      .then((record) => {
        if (cancelled) {
          return;
        }
        if (record && record.projectId === projectId && record.objectType === objectType) {
          const loaded = useEditorCanvasStore.getState().loadDraft(record.snapshot);
          if (loaded) {
            useEditorViewportStore.getState().setDocumentSize(record.snapshot.width, record.snapshot.height);
            const title = record.title === OBJECT_DRAFT_TITLE ? "" : record.title;
            usePixelObjectEditStore.getState().setTitle(title);
          } else {
            useEditorCanvasStore.getState().resetDocument();
            useEditorViewportStore.getState().setDocumentSize(CANVAS_WIDTH, CANVAS_HEIGHT);
          }
        } else if (freshDraftId !== draftId) {
          useEditorCanvasStore.getState().resetDocument();
          useEditorViewportStore.getState().setDocumentSize(CANVAS_WIDTH, CANVAS_HEIGHT);
          usePixelObjectEditStore.getState().setTitle("");
        }
        if (freshDraftId === draftId) {
          freshDraftId = null;
        }
        setBootedDraftId(draftId);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        if (freshDraftId !== draftId) {
          useEditorCanvasStore.getState().resetDocument();
        }
        freshDraftId = null;
        setBootedDraftId(draftId);
        if (!storeWarningShown) {
          storeWarningShown = true;
          toast.warn("Черновик не открылся из браузера");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [persist, draftId, objectType, projectId]);

  const ready = editing || !persist || bootedDraftId === draftId;

  useEffect(() => {
    if (!ready || !persist || !draftId || !projectId || !objectType) {
      return;
    }
    let timer = 0;
    const flush = () => {
      window.clearTimeout(timer);
      void saveCurrentDraft({ draftId, projectId, objectType });
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, 400);
    };
    const unsubscribeCanvas = useEditorCanvasStore.subscribe((state, previous) => {
      if (state.revision !== previous.revision) {
        schedule();
      }
    });
    const unsubscribeTitle = usePixelObjectEditStore.subscribe((state, previous) => {
      if (state.title !== previous.title) {
        schedule();
      }
    });
    const onHide = () => {
      window.clearTimeout(timer);
      void saveCurrentDraft({ draftId, projectId, objectType });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        onHide();
      }
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      unsubscribeCanvas();
      unsubscribeTitle();
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      void saveCurrentDraft({ draftId, projectId, objectType });
    };
  }, [ready, persist, draftId, projectId, objectType]);

  function chooseType(type: PixelObjectType): void {
    const id = crypto.randomUUID();
    markFreshObjectDraft(id);
    usePixelObjectEditStore.getState().clearEditingObject();
    useEditorCanvasStore.getState().resetDocument();
    useEditorViewportStore.getState().setDocumentSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    const params = new URLSearchParams();
    if (projectId) {
      params.set("projectId", projectId);
    }
    params.set("objectType", type);
    params.set("draftId", id);
    navigate(`/new-project?${params.toString()}`, { replace: true });
  }

  const phase: "pick-type" | "loading" | "editor" = editing
    ? "editor"
    : objectType === null
      ? "pick-type"
      : ready
        ? "editor"
        : "loading";

  return { phase, chooseType };
}
