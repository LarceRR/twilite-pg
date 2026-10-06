import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteTheme,
  fetchFreeModels,
  fetchMyThemes,
  fetchThemeSchema,
  generateTheme,
  type AppThemeDto,
  type FreeModelDto,
  type GeneratedThemeDto,
  type ThemeSchemaDto,
  resubmitTheme,
  submitTheme,
} from "@/shared/api/appThemes";
import { ApiError } from "@/shared/api/http";
import {
  loadSavedThemes,
  removeLocalTheme,
  saveLocalTheme,
  type SavedLocalTheme,
} from "@/shared/lib/theme-studio/savedThemesStorage";
import { toast } from "@/shared/ui/Toast";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Неизвестная ошибка";
}

export function useThemeStudio() {
  const [schema, setSchema] = useState<ThemeSchemaDto | null>(null);
  const [models, setModels] = useState<readonly FreeModelDto[]>([]);
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<GeneratedThemeDto | null>(null);
  const [saved, setSaved] = useState<SavedLocalTheme[]>(() => loadSavedThemes());
  const [mine, setMine] = useState<readonly AppThemeDto[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshMine = useCallback(async () => {
    try {
      setMine(await fetchMyThemes());
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [schemaDto, modelItems] = await Promise.all([
          fetchThemeSchema(),
          fetchFreeModels(),
        ]);
        setSchema(schemaDto);
        setModels(modelItems);
        setModelId(modelItems[0]?.id ?? "");
        await refreshMine();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    })();
  }, [refreshMine]);

  const onGenerate = useCallback(async () => {
    if (!modelId || prompt.trim().length === 0) return;
    setBusy(true);
    try {
      setDraft(await generateTheme(modelId, prompt.trim()));
      toast.success("Черновик готов", {
        description: "Можно править цвета и сохранить или отправить на модерацию.",
      });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [modelId, prompt]);

  const onSaveLocal = useCallback(() => {
    if (draft === null) return;
    const entry = saveLocalTheme(draft);
    setSaved(loadSavedThemes());
    toast.info("Сохранено локально", {
      description: `«${entry.name}» лежит только в этом браузере, пока вы не отправите тему.`,
    });
  }, [draft]);

  const onPublish = useCallback(
    async (theme: GeneratedThemeDto, localId?: string) => {
      setBusy(true);
      try {
        await submitTheme(theme);
        if (localId) removeLocalTheme(localId);
        setSaved(loadSavedThemes());
        await refreshMine();
        toast.success("Тема на модерации", {
          description: "После проверки она сможет попасть в мобильное приложение.",
        });
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [refreshMine],
  );

  const onResubmit = useCallback(
    async (id: string, theme: GeneratedThemeDto) => {
      setBusy(true);
      try {
        await resubmitTheme(id, theme);
        await refreshMine();
        toast.success("Тема отправлена снова", {
          description: "Предыдущий комментарий отклонения можно учесть в правках.",
        });
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [refreshMine],
  );

  const onDeleteRemote = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await deleteTheme(id);
        await refreshMine();
        toast.success("Тема удалена", {
          description: "Она больше не будет в вашей очереди и на модерации.",
        });
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [refreshMine],
  );

  const updateDraftColor = useCallback((key: string, value: string) => {
    setDraft((current) => {
      if (current === null) return current;
      return { ...current, colors: { ...current.colors, [key]: value } };
    });
  }, []);

  const updateSkyStop = useCallback((index: number, value: string) => {
    setDraft((current) => {
      if (current === null) return current;
      const next = [...current.sceneBackgroundColors];
      next[index] = value;
      return { ...current, sceneBackgroundColors: next };
    });
  }, []);

  const tokenGroups = useMemo(() => schema?.tokens ?? [], [schema]);

  return {
    schema,
    models,
    modelId,
    setModelId,
    prompt,
    setPrompt,
    draft,
    setDraft,
    saved,
    mine,
    busy,
    tokenGroups,
    onGenerate,
    onSaveLocal,
    onPublish,
    onResubmit,
    onDeleteRemote,
    updateDraftColor,
    updateSkyStop,
    removeLocal: (localId: string) => {
      removeLocalTheme(localId);
      setSaved(loadSavedThemes());
    },
  };
}
