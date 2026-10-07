import { useCallback, useState, type ReactElement } from "react";
import {
  listPixelObjectModerationPage,
  publishPixelObject,
  rejectPixelObject,
  type PixelObjectDto,
} from "@/shared/api/pixelObjects";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import { useCursorList } from "@/shared/hooks/useCursorList";
import { toast } from "@/shared/ui/Toast";
import { SheetPlayer } from "@/pages/new-project/ui/components/EditorRightToolsSidebar/EditorExport/SheetPlayer";
import { PIXEL_OBJECT_TYPE_LABEL } from "@/shared/pixelObject/objectType";
import "./PixelObjectModerationPage.scss";

export function PixelObjectModerationPage(): ReactElement {
  const loadPage = useCallback(
    (query?: { cursor?: string | null; limit?: number }) => listPixelObjectModerationPage(query),
    [],
  );
  const list = useCursorList({ loadPage });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const review = async (itemId: string, action: () => Promise<unknown>) => {
    setBusyId(itemId);
    try {
      await action();
      setComments((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      await list.reload();
      toast.success("Решение сохранено", {
        description: "Объект убран из очереди модерации.",
      });
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось выполнить действие модерации."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pixel-object-moderation">
      <header className="pixel-object-moderation__header">
        <div>
          <h1>Модерация объектов</h1>
          <p className="pixel-object-moderation__lead">В очереди: {list.items.length}</p>
        </div>
        <button
          type="button"
          className="pixel-object-moderation__refresh"
          onClick={() => void list.reload()}
        >
          Обновить
        </button>
      </header>

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
  onComment: (value: string) => void;
  onPublish: () => void;
  onReject: () => void;
}): ReactElement {
  const { item, comment, busy, onComment, onPublish, onReject } = props;
  const canReject = comment.trim().length >= 3;

  return (
    <li>
      <article className="pixel-object-moderation__card">
        <div className="pixel-object-moderation__preview-row">
          <SheetPlayer sheetUrl={item.sheetUrl} manifest={item.manifest} />
          <div className="pixel-object-moderation__body">
            <h2>{item.title}</h2>
            <p className="pixel-object-moderation__meta">
              {PIXEL_OBJECT_TYPE_LABEL[item.objectType]} · {item.authorDisplayName} · рев.{" "}
              {item.revision} · {new Date(item.createdAt).toLocaleString("ru-RU")}
            </p>
            <div className="pixel-object-moderation__actions">
              <button
                type="button"
                className="pixel-object-moderation__btn pixel-object-moderation__btn--primary"
                disabled={busy}
                onClick={onPublish}
              >
                Опубликовать
              </button>
              <label className="pixel-object-moderation__reject">
                <span>Комментарий к отклонению</span>
                <textarea
                  value={comment}
                  disabled={busy}
                  onChange={(event) => onComment(event.target.value)}
                  rows={3}
                />
              </label>
              <button
                type="button"
                className="pixel-object-moderation__btn"
                disabled={!canReject || busy}
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
