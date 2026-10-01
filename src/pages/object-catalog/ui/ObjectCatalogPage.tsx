import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import {
  listMyPixelObjectsPage,
  listPublishedPixelObjectsPage,
  type PixelObjectDto,
} from "@/shared/api/pixelObjects";
import { useCursorList } from "@/shared/hooks/useCursorList";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import { loadPixelObjectIntoEditor } from "@/shared/pixelObject/loadPixelObjectIntoEditor";
import { SheetPlayer } from "@/pages/new-project/ui/components/EditorRightToolsSidebar/EditorExport/SheetPlayer";
import { MobileLoopPlayer } from "./MobileLoopPlayer";
import "./ObjectCatalogPage.scss";

const STATUS_LABEL: Record<PixelObjectDto["status"], string> = {
  pending: "На модерации",
  published: "Опубликован",
  rejected: "Отклонён",
};

type ObjectCatalogPageProps = {
  mode: "catalog" | "mine";
};

function canOpenInEditor(item: PixelObjectDto): boolean {
  return item.status === "rejected" || item.status === "published";
}

export const ObjectCatalogPage = ({ mode }: ObjectCatalogPageProps) => {
  const navigate = useNavigate();
  const loadPage = useCallback(
    (query?: { cursor?: string | null; limit?: number }) =>
      mode === "catalog" ? listPublishedPixelObjectsPage(query) : listMyPixelObjectsPage(query),
    [mode],
  );
  const list = useCursorList({ loadPage });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const openInEditor = async (item: PixelObjectDto) => {
    setLoadError(null);
    setLoadingId(item.id);
    try {
      await loadPixelObjectIntoEditor(item);
      navigate("/new-project");
    } catch (caught) {
      setLoadError(mapApiErrorMessage(caught, "Не удалось открыть объект в редакторе."));
    } finally {
      setLoadingId(null);
    }
  };

  const title = mode === "catalog" ? "Каталог объектов" : "Мои объекты";
  const empty =
    mode === "catalog"
      ? "В каталоге пока нет опубликованных объектов."
      : "Вы ещё не отправляли объекты.";
  const error = list.error ?? loadError;

  return (
    <section className="object-catalog">
      <h1>{title}</h1>
      {list.loading ? <p>Загрузка…</p> : null}
      {error ? <p className="object-catalog__error">{error}</p> : null}
      {!list.loading && !list.error && list.items.length === 0 ? <p>{empty}</p> : null}
      <div className="object-catalog__grid">
        {list.items.map((item) => (
          <article key={item.id} className="object-catalog__card">
            {item.status === "published" && mode === "catalog" ? (
              <MobileLoopPlayer objectId={item.id} />
            ) : item.status === "pending" && mode !== "mine" ? (
              <p className="object-catalog__meta">Превью недоступно до публикации.</p>
            ) : (
              <SheetPlayer sheetUrl={item.sheetUrl} manifest={item.manifest} />
            )}
            <h2>{item.title}</h2>
            <p className="object-catalog__meta">
              {item.authorDisplayName} · {STATUS_LABEL[item.status]} · рев. {item.revision}
            </p>
            {item.rejectionComment ? (
              <p className="object-catalog__comment">{item.rejectionComment}</p>
            ) : null}
            {mode === "mine" && canOpenInEditor(item) ? (
              <button
                type="button"
                className="object-catalog__edit"
                disabled={loadingId === item.id}
                onClick={() => void openInEditor(item)}
              >
                {loadingId === item.id ? "Загрузка…" : "Открыть в редакторе"}
              </button>
            ) : null}
          </article>
        ))}
      </div>
      {list.nextCursor ? (
        <button
          type="button"
          className="object-catalog__more"
          disabled={list.loadingMore}
          onClick={() => void list.loadMore()}
        >
          {list.loadingMore ? "Загрузка…" : "Ещё"}
        </button>
      ) : null}
    </section>
  );
};
