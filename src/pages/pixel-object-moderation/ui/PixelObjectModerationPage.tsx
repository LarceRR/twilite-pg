import { useCallback, useEffect, useState, type ReactElement } from "react";
import {
  listPixelObjectModeration,
  moderationErrorMessage,
  publishPixelObject,
  rejectPixelObject,
  type PixelObjectDto,
} from "@/shared/api/pixelObjects";
import { SheetPlayer } from "@/pages/new-project/ui/components/EditorRightToolsSidebar/EditorExport/SheetPlayer";
import "./PixelObjectModerationPage.scss";

export function PixelObjectModerationPage(): ReactElement {
  const [items, setItems] = useState<PixelObjectDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    try {
      setError(null);
      setItems(await listPixelObjectModeration());
    } catch (caught) {
      setError(moderationErrorMessage(caught));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const review = async (itemId: string, action: () => Promise<unknown>) => {
    setBusyId(itemId);
    setError(null);
    try {
      await action();
      setComments((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      await reload();
    } catch (caught) {
      setError(moderationErrorMessage(caught));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pixel-object-moderation">
      <header className="pixel-object-moderation__header">
        <div>
          <h1>Модерация объектов</h1>
          <p className="pixel-object-moderation__lead">В очереди: {items.length}</p>
        </div>
        <button type="button" className="pixel-object-moderation__refresh" onClick={() => void reload()}>
          Обновить
        </button>
      </header>

      {error ? <div className="pixel-object-moderation__error">{error}</div> : null}

      {items.length === 0 ? <p className="pixel-object-moderation__empty">Очередь пуста.</p> : null}

      <ul className="pixel-object-moderation__list">
        {items.map((item) => {
          const comment = comments[item.id] ?? "";
          const canReject = comment.trim().length >= 3;
          const busy = busyId === item.id;

          return (
            <li key={item.id}>
              <article className="pixel-object-moderation__card">
                <div className="pixel-object-moderation__preview-row">
                  <SheetPlayer sheetUrl={item.sheetUrl} manifest={item.manifest} />
                  <div className="pixel-object-moderation__body">
                    <h2>{item.title}</h2>
                    <p className="pixel-object-moderation__meta">
                      {item.authorDisplayName} · рев. {item.revision} ·{" "}
                      {new Date(item.createdAt).toLocaleString("ru-RU")}
                    </p>
                    <div className="pixel-object-moderation__actions">
                      <button
                        type="button"
                        className="pixel-object-moderation__btn pixel-object-moderation__btn--primary"
                        disabled={busy}
                        onClick={() => void review(item.id, () => publishPixelObject(item.id))}
                      >
                        Опубликовать
                      </button>
                    </div>
                    <div className="pixel-object-moderation__reject">
                      <label className="pixel-object-moderation__field">
                        <span className="pixel-object-moderation__label">Комментарий при отклонении</span>
                        <textarea
                          value={comment}
                          onChange={(event) =>
                            setComments((prev) => ({ ...prev, [item.id]: event.target.value }))
                          }
                          rows={2}
                          placeholder="Минимум 3 символа"
                        />
                      </label>
                      <button
                        type="button"
                        className="pixel-object-moderation__btn pixel-object-moderation__btn--danger"
                        disabled={busy || !canReject}
                        onClick={() =>
                          void review(item.id, () => rejectPixelObject(item.id, comment.trim()))
                        }
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default PixelObjectModerationPage;
