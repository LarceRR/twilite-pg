import type { ReactElement } from "react";

import { useThemeStudio } from "../model/useThemeStudio";
import "./ThemeStudioPage.scss";

export function ThemeStudioPage(): ReactElement {
  const studio = useThemeStudio();

  return (
    <div className="theme-studio">
      <header className="theme-studio__header">
        <h1>Студия тем Twilite</h1>
        <p>
          Тема попадёт в мобильное приложение после модерации. Черновики до отправки
          хранятся только в этом браузере.
        </p>
      </header>

      {studio.error ? <div className="theme-studio__error">{studio.error}</div> : null}
      {studio.info ? <div className="theme-studio__info">{studio.info}</div> : null}

      <section className="theme-studio__panel">
        <h2>Генерация</h2>
        <label>
          Модель
          <select
            value={studio.modelId}
            onChange={(event) => studio.setModelId(event.target.value)}
            disabled={studio.models.length === 0 || studio.busy}
          >
            {studio.models.length === 0 ? <option value="">Нет бесплатных моделей</option> : null}
            {studio.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Промпт
          <textarea
            value={studio.prompt}
            onChange={(event) => studio.setPrompt(event.target.value)}
            rows={4}
            placeholder="Например: тёплый закат над бумажным городом"
            disabled={studio.busy}
          />
        </label>
        <div className="theme-studio__actions">
          <button type="button" onClick={() => void studio.onGenerate()} disabled={studio.busy}>
            {studio.busy ? "Генерация…" : "Сгенерировать"}
          </button>
          <button type="button" onClick={() => studio.setPrompt("")} disabled={studio.busy}>
            Очистить промпт
          </button>
        </div>
      </section>

      {studio.draft ? (
        <section className="theme-studio__panel">
          <h2>Черновик · {studio.draft.name}</h2>
          <p>{studio.draft.description}</p>
          <div
            className="theme-studio__sky"
            style={{
              background: `linear-gradient(to bottom, ${studio.draft.sceneBackgroundColors.join(",")})`,
            }}
          />
          <div
            className="theme-studio__preview"
            style={{
              background: studio.draft.colors.surface,
              color: studio.draft.colors.textPrimary,
            }}
          >
            <div
              className="theme-studio__preview-card"
              style={{ background: studio.draft.colors.surfaceRaised }}
            >
              Карточка
            </div>
            <button type="button" style={{ background: studio.draft.colors.accent, color: studio.draft.colors.accentOn }}>
              Кнопка
            </button>
          </div>

          <h3>Небо</h3>
          <div className="theme-studio__colors">
            {studio.draft.sceneBackgroundColors.map((color, index) => (
              <label key={`sky-${index}`}>
                stop {index + 1}
                <input
                  type="color"
                  value={normalizeColorInput(color)}
                  onChange={(event) => studio.updateSkyStop(index, event.target.value.toUpperCase())}
                />
                <input
                  type="text"
                  value={color}
                  onChange={(event) => studio.updateSkyStop(index, event.target.value)}
                />
              </label>
            ))}
          </div>

          <h3>UI цвета</h3>
          <div className="theme-studio__colors">
            {studio.tokenGroups
              .filter((token) => token.key !== "sceneBackgroundColors")
              .map((token) => (
                <label key={token.key} title={token.descriptionRu}>
                  {token.key}
                  <input
                    type="color"
                    value={normalizeColorInput(studio.draft!.colors[token.key] ?? "#000000")}
                    onChange={(event) =>
                      studio.updateDraftColor(token.key, event.target.value.toUpperCase())
                    }
                  />
                  <input
                    type="text"
                    value={studio.draft!.colors[token.key] ?? ""}
                    onChange={(event) => studio.updateDraftColor(token.key, event.target.value)}
                  />
                </label>
              ))}
          </div>

          <div className="theme-studio__actions">
            <button type="button" onClick={() => void studio.onGenerate()} disabled={studio.busy}>
              Перегенерировать
            </button>
            <button type="button" onClick={studio.onSaveLocal} disabled={studio.busy}>
              Сохранить локально
            </button>
            <button
              type="button"
              onClick={() => void studio.onPublish(studio.draft!)}
              disabled={studio.busy}
            >
              Опубликовать
            </button>
          </div>
        </section>
      ) : null}

      <section className="theme-studio__panel">
        <h2>Локальные сохранённые</h2>
        {studio.saved.length === 0 ? <p>Пока пусто</p> : null}
        {studio.saved.map((theme) => (
          <article key={theme.localId} className="theme-studio__item">
            <strong>{theme.name}</strong>
            <span>{new Date(theme.savedAt).toLocaleString("ru-RU")}</span>
            <div className="theme-studio__actions">
              <button type="button" onClick={() => studio.setDraft(theme)}>
                Открыть
              </button>
              <button type="button" onClick={() => void studio.onPublish(theme, theme.localId)}>
                Опубликовать
              </button>
              <button type="button" onClick={() => studio.removeLocal(theme.localId)}>
                Удалить
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="theme-studio__panel">
        <h2>Мои темы на сервере</h2>
        {studio.mine.length === 0 ? <p>Пока пусто</p> : null}
        {studio.mine.map((theme) => (
          <article key={theme.id} className="theme-studio__item">
            <strong>
              {theme.name} · {theme.status}
            </strong>
            {theme.status === "rejected" && theme.rejectionComment ? (
              <p className="theme-studio__error">Причина: {theme.rejectionComment}</p>
            ) : null}
            <div className="theme-studio__actions">
              {theme.status === "rejected" ? (
                <button
                  type="button"
                  onClick={() =>
                    void studio.onResubmit(theme.id, {
                      name: theme.name,
                      description: theme.description,
                      colors: theme.colors,
                      sceneBackgroundColors: theme.sceneBackgroundColors,
                    })
                  }
                >
                  Снова отправить
                </button>
              ) : null}
              {theme.status !== "published" ? (
                <button type="button" onClick={() => void studio.onDeleteRemote(theme.id)}>
                  Удалить
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function normalizeColorInput(value: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  return "#000000";
}

export default ThemeStudioPage;
