import { useCallback, useState, type ReactElement } from "react";
import {
  listPixelObjectModerationPage,
  publishPixelObject,
  rejectPixelObject,
  type PixelObjectDto,
} from "@/shared/api/pixelObjects";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import { useCursorList } from "@/shared/hooks/useCursorList";
import { useSessionStore } from "@/shared/store/session";
import { SheetPlayer } from "@/pages/new-project/ui/components/EditorRightToolsSidebar/EditorExport/SheetPlayer";
import "./PixelObjectModerationPage.scss";

export function PixelObjectModerationPage(): ReactElement {
  const currentUserId = useSessionStore((state) => state.user?.id ?? null);
  const loadPage = useCallback(
    (query?: { cursor?: string | null; limit?: number }) => listPixelObjectModerationPage(query),
    [],
  );
  const list = useCursorList({ loadPage });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const review = async (itemId: string, action: () => Promise<unknown>) => {
    setBusyId(itemId);
    setActionError(null);
    try {
      await action();
      setComments((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      await list.reload();
    } catch (caught) {
      setActionError(mapApiErrorMessage(caught, "Не удалось выполнить действие модерации."));
    } finally {
      setBusyId(null);
    }
  };

  const error = list.error ?? actionError;

  return (
    <div className="pixel-object-moderation">
      <header className="pixel-object-moderation__header">
        <div>
          <h1>Модерация объектов</h1>
          <p className="pixel-object-moderation__lead">В очереди: {list.items.length}</p>
        </div>
        <button type="button" className="pixel-object-moderation__refresh" onClick={() => void list.reload()}>
          Обновить
        </button>
      </header>

      {error ? <div className="pixel-object-moderation__error">{error}</div> : null}
      {list.loading ? <p>Загрузка…</p> : null}
      {!list.loading && list.items.length === 0 ? (
        <p className="pixel-object-moderation__empty">Очередь пуста.</p>
      ) : null}

      <ul className="pixel-object-moderation__list">
        {list.items.map((item) => (
          <ModerationCard
            key={item.id}
            item={item}
            comment={comments[item.id] ?? ""}
            busy={busyId === item.id}
            selfOwned={Boolean(currentUserId && item.authorUserId === currentUserId)}
            onComment={(value) => setComments((prev) => ({ ...prev, [item.id]: value }))}
            onPublish={() => void review(item.id, () => publishPixelObject(item.id))}
            onReject={() =>
              void review(item.id, () => rejectPixelObject(item.id, comments[item.id]?.trim() ?? ""))
            }
          />
        ))}
      </ul>

      {list.nextCursor ? (
        <button
          type="button"
          className="pixel-object-moderation__refresh"
          disabled={list.loadingMore}
          onClick={() => void list.loadMore()}
        >
          {list.loadingMore ? "Загрузка…" : "Ещё"}
        </button>
      ) : null}
    </div>
  );
}

function ModerationCard(props: {
  item: PixelObjectDto;
  comment: string;
  busy: boolean;
  selfOwned: boolean;
  onComment: (value: string) => void;
  onPublish: () => void;
  onReject: () => void;
}): ReactElement {
  const { item, comment, busy, selfOwned, onComment, onPublish, onReject } = props;
  const canReject = !selfOwned && comment.trim().length >= 3;
  const actionsDisabled = busy || selfOwned;

  return (
    <li>
      <article className="pixel-object-moderation__card">
        <div className="pixel-object-moderation__preview-row">
          <SheetPlayer sheetUrl={item.sheetUrl} manifest={item.manifest} />
          <div className="pixel-object-moderation__body">
            <h2>{item.title}</h2>
            <p className="pixel-object-moderation__meta">
              {item.authorDisplayName} · рев. {item.revision} ·{" "}
              {new Date(item.createdAt).toLocaleString("ru-RU")}
            </p>
            {selfOwned ? (
              <p className="pixel-object-moderation__error" role="status">
                Нельзя модерировать собственный объект.
              </p>
            ) : null}
            <div className="pixel-object-moderation__actions">
              <button
                type="button"
                className="pixel-object-moderation__btn pixel-object-moderation__btn--primary"
                disabled={actionsDisabled}
                onClick={onPublish}
              >
                Опубликовать
              </button>
            </div>
            <div className="pixel-object-moderation__reject">
              <label className="pixel-object-moderation__field">
                <span className="pixel-object-moderation__label">Комментарий при отклонении</span>
                <textarea
                  value={comment}
                  onChange={(event) => onComment(event.target.value)}
                  rows={2}
                  placeholder="Минимум 3 символа"
                  disabled={selfOwned}
                />
              </label>
              <button
                type="button"
                className="pixel-object-moderation__btn pixel-object-moderation__btn--danger"
                disabled={actionsDisabled || !canReject}
                onClick={onReject}
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

export default PixelObjectModerationPage;
