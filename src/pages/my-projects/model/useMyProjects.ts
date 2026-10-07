import { useCallback, useEffect, useState } from "react";

import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import {
  bulkDeleteProjects,
  bulkPurgeProjects,
  createProject,
  deleteProject,
  listMyProjects,
  type ProjectDto,
  purgeProject,
  updateProject,
  uploadProjectAvatarFile,
} from "@/shared/api/projects";
import { TPG_PERMISSIONS, usePermissions } from "@/shared/lib/rbac";
import { isTwiliteSystemUser } from "@/shared/lib/twiliteSystemUser";
import { useSessionStore } from "@/shared/store/session/model/sessionStore";
import { confirm } from "@/shared/ui/Confirm";
import { toast } from "@/shared/ui/Toast";

import { pickEmptyHero } from "./projectFormatters";

export function useMyProjects() {
  const { hasPermission } = usePermissions();
  const userEmail = useSessionStore((state) => state.user?.email ?? null);
  const canPurge =
    isTwiliteSystemUser(userEmail) && hasPermission(TPG_PERMISSIONS.EDITOR_PURGE);
  const canCreate = hasPermission(TPG_PERMISSIONS.EDITOR_CREATE_PROJECT);
  const canEdit = hasPermission(TPG_PERMISSIONS.EDITOR_EDIT);
  const canDelete = canPurge || hasPermission(TPG_PERMISSIONS.EDITOR_DELETE);
  const canCreateObject =
    hasPermission(TPG_PERMISSIONS.PIXEL_OBJECTS_CREATE) ||
    hasPermission(TPG_PERMISSIONS.PIXEL_OBJECTS_SUBMIT);

  const [items, setItems] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [emptyHeroSrc] = useState(pickEmptyHero);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listMyProjects());
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось загрузить проекты."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openCreate(): void {
    setCreateTitle("");
    setCreateDescription("");
    setCreateOpen(true);
  }

  function closeCreate(): void {
    if (!creating) {
      setCreateOpen(false);
    }
  }

  function toggleSelect(projectId: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  function selectAll(): void {
    const selectableIds = items
      .filter((p) => p.isReassignmentInbox !== true && canDelete)
      .map((p) => p.id);
    setSelected(new Set(selectableIds));
  }

  function clearSelection(): void {
    setSelected(new Set());
  }

  async function create(): Promise<void> {
    const title = createTitle.trim();
    if (!title || creating) {
      return;
    }
    setCreating(true);
    try {
      const project = await createProject(
        title,
        crypto.randomUUID(),
        createDescription.trim() || null,
      );
      setCreateTitle("");
      setCreateDescription("");
      setCreateOpen(false);
      setItems((prev) => [project, ...prev]);
      toast.success("Проект создан", {
        description: "Он появился в списке — можно открыть редактор и начать работу.",
      });
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось создать проект."));
    } finally {
      setCreating(false);
    }
  }

  async function rename(project: ProjectDto): Promise<void> {
    const next = window.prompt("Новое название проекта", project.title)?.trim();
    if (!next || next === project.title) {
      return;
    }
    setBusyId(project.id);
    try {
      const updated = await updateProject(project.id, { title: next });
      setItems((prev) => prev.map((item) => (item.id === project.id ? updated : item)));
      toast.success("Проект переименован", {
        description: `Новое название: «${updated.title}».`,
      });
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось переименовать проект."));
    } finally {
      setBusyId(null);
    }
  }

  async function purge(project: ProjectDto): Promise<void> {
    const objectsNote =
      project.objectCount > 0
        ? ` Вместе с ним безвозвратно удалятся все его объекты (${project.objectCount}), их файлы и размещения на поверхностях.`
        : " Проект удалится безвозвратно.";
    const ok = await confirm({
      title: `Удалить проект «${project.title}» из Twilite App?`,
      description: `Вы действительно хотите удалить проект из Twilite App?${objectsNote}`,
      confirmLabel: "Удалить навсегда",
      danger: true,
    });
    if (!ok) {
      return;
    }
    setBusyId(project.id);
    try {
      await purgeProject(project.id);
      setItems((prev) => prev.filter((item) => item.id !== project.id));
      toast.success("Проект удалён из Twilite App", {
        description: "Проект, его объекты и файлы стёрты.",
      });
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось удалить проект из Twilite App."));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(project: ProjectDto): Promise<void> {
    if (canPurge) {
      await purge(project);
      return;
    }

    const ok = await confirm({
      title: `Удалить проект «${project.title}»?`,
      description:
        "Проект пропадёт из вашего списка и перейдёт Twilite, чтобы у пользователей, которые уже используют его объекты, ничего не сломалось.",
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) {
      return;
    }
    setBusyId(project.id);
    try {
      await deleteProject(project.id);
      setItems((prev) => prev.filter((item) => item.id !== project.id));
      toast.success("Проект удалён", {
        description: "Доступ перешёл к Twilite, объекты в системе сохранены.",
      });
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось удалить проект."));
    } finally {
      setBusyId(null);
    }
  }

  async function bulkRemove(): Promise<void> {
    if (selected.size === 0) {
      return;
    }
    const selectedProjects = items.filter((p) => selected.has(p.id));
    const ok = await confirm({
      title: `Удалить ${selectedProjects.length} проектов?`,
      description: canPurge
        ? "Они будут удалены из Twilite App вместе с объектами и файлами."
        : "Они будут переданы Twilite, объекты сохранятся.",
      confirmLabel: "Удалить все",
      danger: true,
    });
    if (!ok) {
      return;
    }
    setBulkBusy(true);
    try {
      const projectIds = selectedProjects.map((p) => p.id);
      if (canPurge) {
        const result = await bulkPurgeProjects(projectIds);
        toast.success("Проекты удалены из Twilite App", {
          description: `${result.purged} проектов, юр объекты и файлы стерты.`,
        });
      } else {
        const result = await bulkDeleteProjects(projectIds);
        toast.success("Проекты удалены", {
          description: `${result.deleted} проектов передано Twilite.`,
        });
      }
      setItems((prev) => prev.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось удалить проекты."));
    } finally {
      setBulkBusy(false);
    }
  }

  async function uploadAvatar(project: ProjectDto, file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }
    setBusyId(project.id);
    try {
      const updated = await uploadProjectAvatarFile(project.id, file);
      setItems((prev) => prev.map((item) => (item.id === project.id ? updated : item)));
      toast.success("Аватар проекта обновлён", {
        description: "Новое изображение уже на карточке проекта.",
      });
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось обновить аватар проекта."));
    } finally {
      setBusyId(null);
    }
  }

  return {
    items,
    loading,
    busyId,
    emptyHeroSrc,
    canCreate,
    canEdit,
    canDelete,
    canPurge,
    canCreateObject,
    createOpen,
    createTitle,
    createDescription,
    creating,
    setCreateTitle,
    setCreateDescription,
    selected,
    bulkBusy,
    openCreate,
    closeCreate,
    create,
    rename,
    remove,
    uploadAvatar,
    toggleSelect,
    selectAll,
    clearSelection,
    bulkRemove,
  };
}
