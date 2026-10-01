import { useCallback, useEffect, useState, type ReactElement } from "react";

import {
  fetchModerationQueue,
  publishTheme,
  rejectTheme,
  type AppThemeDto,
} from "@/shared/api/appThemes";
import { ApiError } from "@/shared/api/http";

import "./ThemeModerationPage.scss";

export function ThemeModerationPage(): ReactElement {
  const [items, setItems] = useState<readonly AppThemeDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const reload = useCallback(async () => {
    try {
      setError(null);
      setItems(await fetchModerationQueue());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить очередь");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="theme-moderation">
      <header>
        <h1>Модерация тем</h1>
        <p>В очереди: {items.length}</p>
        <button type="button" onClick={() => void reload()}>
          Обновить
        </button>
      </header>

      {error ? <div className="theme-moderation__error">{error}</div> : null}

      {items.map((theme) => (
        <article key={theme.id} className="theme-moderation__card">
          <div
            className="theme-moderation__sky"
            style={{
              background: `linear-gradient(to bottom, ${theme.sceneBackgroundColors.join(",")})`,
            }}
          />
          <h2>{theme.name}</h2>
          <p>
            {theme.authorDisplayName} · {new Date(theme.createdAt).toLocaleString("ru-RU")}
          </p>
          <p>{theme.description}</p>
          <div className="theme-moderation__swatches">
            {["surface", "accent", "textPrimary", "secondary"].map((key) => (
              <span key={key} style={{ background: theme.colors[key] }} title={key} />
            ))}
          </div>
          <div className="theme-moderation__actions">
            <button
              type="button"
              disabled={busyId === theme.id}
              onClick={() => {
                void (async () => {
                  setBusyId(theme.id);
                  try {
                    await publishTheme(theme.id);
                    await reload();
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : "Ошибка публикации");
                  } finally {
                    setBusyId(null);
                  }
                })();
              }}
            >
              Опубликовать
            </button>
            <button type="button" onClick={() => setRejectId(theme.id)}>
              Отклонить
            </button>
          </div>
          {rejectId === theme.id ? (
            <div className="theme-moderation__reject">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Причина отклонения (обязательно)"
                rows={3}
              />
              <button
                type="button"
                disabled={comment.trim().length < 3 || busyId === theme.id}
                onClick={() => {
                  void (async () => {
                    setBusyId(theme.id);
                    try {
                      await rejectTheme(theme.id, comment.trim());
                      setRejectId(null);
                      setComment("");
                      await reload();
                    } catch (err) {
                      setError(err instanceof ApiError ? err.message : "Ошибка отклонения");
                    } finally {
                      setBusyId(null);
                    }
                  })();
                }}
              >
                Подтвердить отклонение
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default ThemeModerationPage;
