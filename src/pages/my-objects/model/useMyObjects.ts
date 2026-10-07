import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import {
  deletePixelObject,
  listMyPixelObjectsPage,
  type PixelObjectDto,
  purgePixelObject,
} from "@/shared/api/pixelObjects";
import { getProject } from "@/shared/api/projects";
import { useCursorList } from "@/shared/hooks/useCursorList";
import { TPG_PERMISSIONS, usePermissions } from "@/shared/lib/rbac";
import { isTwiliteSystemUser } from "@/shared/lib/twiliteSystemUser";
import { loadPixelObjectIntoEditor } from "@/shared/pixelObject/loadPixelObjectIntoEditor";
import { usePixelObjectEditStore } from "@/shared/store/pixelObjectEdit";
import { useSessionStore } from "@/shared/store/session/model/sessionStore";
import { confirm } from "@/shared/ui/Confirm";
import { toast } from "@/shared/ui/Toast";

import { pickEmptyHero, readProjectTitleState, resolveObjectsTitle } from "./objectFormatters";
import {
  canDeleteObject,
  purgeConfirm,
  purgeSuccess,
  removalConfirm,
  removalSuccess,
} from "./objectRules";

const LIST_LIMIT = 48;

export function useMyObjects() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const { hasPermission } = usePermissions();
  const userEmail = useSessionStore((state) => state.user?.email ?? null);
  const canCreate =
    hasPermission(TPG_PERMISSIONS.PIXEL_OBJECTS_CREATE) ||
    hasPermission(TPG_PERMISSIONS.PIXEL_OBJECTS_SUBMIT);
  /** Twilite system user removes objects from the app entirely instead of handing them over. */
  const canPurge =
    isTwiliteSystemUser(userEmail) && hasPermission(TPG_PERMISSIONS.PIXEL_OBJECTS_PURGE);

  const loadPage = useCallback(
    (query?: { cursor?: string | null; limit?: number }) =>
      listMyPixelObjectsPage({
        ...query,
        projectId: projectId ?? undefined,
      }),
    [projectId],
  );
  const list = useCursorList({ loadPage, limit: LIST_LIMIT });

  const [fetchedTitle, setFetchedTitle] = useState<{ id: string; title: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [emptyHeroSrc] = useState(pickEmptyHero);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    let cancelled = false;
    void getProject(projectId)
      .then((project) => {
        if (!cancelled) {
          setFetchedTitle({ id: project.id, title: project.title });
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          toast.error(mapApiErrorMessage(caught, "Не удалось загрузить проект."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const hintedTitle = projectId ? readProjectTitleState(location.state) : null;
  const knownTitle = fetchedTitle?.id === projectId ? fetchedTitle.title : hintedTitle;
  const title = resolveObjectsTitle(projectId, knownTitle);

  function createObject(): void {
    usePixelObjectEditStore.getState().clearEditingObject();
    navigate(projectId ? `/new-project?projectId=${projectId}` : "/new-project");
  }

  async function openInEditor(item: PixelObjectDto): Promise<void> {
    setBusyId(item.id);
    try {
      await loadPixelObjectIntoEditor(item);
      navigate(`/new-project?projectId=${item.projectId}&edit=1`);
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось открыть объект в редакторе."));
    } finally {
      setBusyId(null);
    }
  }

  function markBusy(items: readonly PixelObjectDto[]): void {
    if (items.length === 1) {
      setBusyId(items[0].id);
    } else {
      setBulkBusy(true);
    }
  }

  async function purgeMany(targets: PixelObjectDto[]): Promise<void> {
    if (targets.length === 0) {
      return;
    }
    const ok = await confirm({
      ...purgeConfirm(targets),
      confirmLabel: "Удалить навсегда",
      danger: true,
    });
    if (!ok) {
      return;
    }

    markBusy(targets);
    let purged = 0;
    try {
      for (const item of targets) {
        await purgePixelObject(item.id);
        list.removeItem(item.id);
        purged += 1;
      }
      const success = purgeSuccess(purged);
      toast.success(success.title, { description: success.description });
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось удалить объект из Twilite App."));
    } finally {
      setBusyId(null);
      setBulkBusy(false);
    }
  }

  async function removeMany(targets: PixelObjectDto[]): Promise<void> {
    if (canPurge) {
      await purgeMany(targets);
      return;
    }

    const deletable = targets.filter(canDeleteObject);
    if (deletable.length === 0) {
      toast.warn("Эти объекты удалить нельзя.");
      return;
    }
    const ok = await confirm({
      ...removalConfirm(deletable),
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) {
      return;
    }

    markBusy(deletable);
    try {
      let erased = 0;
      let reassigned = 0;
      for (const item of deletable) {
        const result = await deletePixelObject(item.id);
        if (result.outcome === "reassigned") {
          reassigned += 1;
        } else {
          erased += 1;
        }
        list.removeItem(item.id);
      }
      const success = removalSuccess(erased, reassigned);
      toast.success(success.title, { description: success.description });
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось удалить объект."));
    } finally {
      setBusyId(null);
      setBulkBusy(false);
    }
  }

  return {
    items: list.items,
    loading: list.loading,
    loadingMore: list.loadingMore,
    nextCursor: list.nextCursor,
    loadMore: list.loadMore,
    projectId,
    title,
    canCreate,
    canPurge,
    busyId,
    bulkBusy,
    emptyHeroSrc,
    createObject,
    openInEditor,
    removeMany,
  };
}
