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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const refreshMine = useCallback(async () => {
    try {
      setMine(await fetchMyThemes());
    } catch (err) {
      setError(errorMessage(err));
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
        setError(errorMessage(err));
      }
    })();
  }, [refreshMine]);

  const onGenerate = useCallback(async () => {
    if (!modelId || prompt.trim().length === 0) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      setDraft(await generateTheme(modelId, prompt.trim()));
      setInfo("Черновик сгенерирован — можно править цвета");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [modelId, prompt]);

  const onSaveLocal = useCallback(() => {
    if (draft === null) return;
    const entry = saveLocalTheme(draft);
    setSaved(loadSavedThemes());
    setInfo(`Сохранено локально: ${entry.name}`);
  }, [draft]);

  const onPublish = useCallback(
    async (theme: GeneratedThemeDto, localId?: string) => {
      setBusy(true);
      setError(null);
      try {
        await submitTheme(theme);
        if (localId) removeLocalTheme(localId);
        setSaved(loadSavedThemes());
        await refreshMine();
        setInfo("Тема отправлена на модерацию");
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [refreshMine],
  );

  const onResubmit = useCallback(
    async (id: string, theme: GeneratedThemeDto) => {
      setBusy(true);
      setError(null);
      try {
        await resubmitTheme(id, theme);
        await refreshMine();
        setInfo("Тема снова отправлена на модерацию");
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [refreshMine],
  );

  const onDeleteRemote = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await deleteTheme(id);
        await refreshMine();
        setInfo("Тема удалена");
      } catch (err) {
        setError(errorMessage(err));
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
    error,
    info,
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
