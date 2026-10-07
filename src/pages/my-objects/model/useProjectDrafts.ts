import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import {
  listObjectDraftsByProject,
  removeObjectDraft,
  sealObjectDraft,
  subscribeObjectDrafts,
  type ObjectDraftRecord,
} from "@/shared/pixelObject/objectDraftStore";
import { usePixelObjectEditStore } from "@/shared/store/pixelObjectEdit";
import { confirm } from "@/shared/ui/Confirm";
import { toast } from "@/shared/ui/Toast";

export function useProjectDrafts(projectId: string | null) {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<ObjectDraftRecord[]>([]);
  const [ready, setReady] = useState(projectId === null);

  useEffect(() => {
    if (!projectId) {
      setDrafts([]);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    const reload = () => {
      void listObjectDraftsByProject(projectId)
        .then((rows) => {
          if (!cancelled) {
            setDrafts(rows);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDrafts([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setReady(true);
          }
        });
    };
    reload();
    const unsubscribe = subscribeObjectDrafts(reload);
    window.addEventListener("focus", reload);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("focus", reload);
    };
  }, [projectId]);

  function openDraft(draft: ObjectDraftRecord): void {
    usePixelObjectEditStore.getState().clearEditingObject();
    const params = new URLSearchParams({
      projectId: draft.projectId,
      objectType: draft.objectType,
      draftId: draft.id,
    });
    navigate(`/new-project?${params.toString()}`);
  }

  async function discardDraft(draft: ObjectDraftRecord): Promise<void> {
    const ok = await confirm({
      title: "Удалить черновик?",
      description: "Рисунок хранится только в этом браузере и пропадёт без восстановления.",
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) {
      return;
    }
    sealObjectDraft(draft.id);
    try {
      await removeObjectDraft(draft.id);
    } catch {
      toast.error("Не удалось удалить черновик.");
    }
  }

  return { drafts, ready, openDraft, discardDraft };
}
