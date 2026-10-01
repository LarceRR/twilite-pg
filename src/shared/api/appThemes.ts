import { apiFetch } from "@/shared/api/http";

export type ThemeColors = Record<string, string>;

export type AppThemeDto = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly authorDisplayName: string;
  readonly authorUserId: string;
  readonly status: "pending" | "published" | "rejected";
  readonly rejectionComment: string | null;
  readonly colors: ThemeColors;
  readonly sceneBackgroundColors: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
};

export type GeneratedThemeDto = {
  readonly name: string;
  readonly description: string;
  readonly colors: ThemeColors;
  readonly sceneBackgroundColors: readonly string[];
};

export type FreeModelDto = {
  readonly id: string;
  readonly name: string;
  readonly contextLength: number | null;
};

export type ThemeSchemaDto = {
  readonly tokens: readonly {
    readonly key: string;
    readonly group: string;
    readonly descriptionRu: string;
  }[];
  readonly sky: { readonly min: number; readonly max: number };
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchThemeSchema(): Promise<ThemeSchemaDto> {
  return readJson(await apiFetch("/v1/app-themes/schema"));
}

export async function fetchFreeModels(): Promise<readonly FreeModelDto[]> {
  const body = await readJson<{ items: FreeModelDto[] }>(
    await apiFetch("/v1/app-themes/ai/models"),
  );
  return body.items;
}

export async function generateTheme(model: string, prompt: string): Promise<GeneratedThemeDto> {
  return readJson(
    await apiFetch("/v1/app-themes/ai/generate", {
      method: "POST",
      body: JSON.stringify({ model, prompt }),
    }),
  );
}

export async function submitTheme(payload: GeneratedThemeDto): Promise<AppThemeDto> {
  return readJson(
    await apiFetch("/v1/app-themes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchMyThemes(): Promise<readonly AppThemeDto[]> {
  const body = await readJson<{ items: AppThemeDto[] }>(await apiFetch("/v1/app-themes/mine"));
  return body.items;
}

export async function resubmitTheme(id: string, payload: GeneratedThemeDto): Promise<AppThemeDto> {
  return readJson(
    await apiFetch(`/v1/app-themes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  );
}

export async function deleteTheme(id: string): Promise<void> {
  await apiFetch(`/v1/app-themes/${id}`, { method: "DELETE" });
}

export async function fetchModerationQueue(): Promise<readonly AppThemeDto[]> {
  const body = await readJson<{ items: AppThemeDto[] }>(
    await apiFetch("/v1/app-themes/moderation"),
  );
  return body.items;
}

export async function publishTheme(id: string): Promise<AppThemeDto> {
  return readJson(await apiFetch(`/v1/app-themes/${id}/publish`, { method: "POST" }));
}

export async function rejectTheme(id: string, comment: string): Promise<AppThemeDto> {
  return readJson(
    await apiFetch(`/v1/app-themes/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  );
}
