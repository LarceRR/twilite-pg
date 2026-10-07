import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  deletePixelObject,
  listMyPixelObjectsPage,
  listPublishedPixelObjectsPage,
  type PixelObjectDto,
} from "@/shared/api/pixelObjects";
import { canDeleteObject, removalConfirm, removalSuccess } from "@/pages/my-objects/model/objectRules";
import { useCursorList } from "@/shared/hooks/useCursorList";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import { loadPixelObjectIntoEditor } from "@/shared/pixelObject/loadPixelObjectIntoEditor";
import { confirm } from "@/shared/ui/Confirm";
import { toast } from "@/shared/ui/Toast";
import { SheetPlayer } from "@/pages/new-project/ui/components/EditorRightToolsSidebar/EditorExport/SheetPlayer";
import { MobileLoopPlayer } from "./MobileLoopPlayer";
import "./ObjectCatalogPage.scss";

const STATUS_LABEL: Record<PixelObjectDto["status"], string> = {
  pending: "На модерации",
  published: "Опубликован",
  rejected: "Отклонён",
  archived: "В архиве",
};

type ObjectCatalogPageProps = {
  mode: "catalog" | "mine";
};

function canOpenInEditor(item: PixelObjectDto): boolean {
  return item.status === "rejected" || item.status === "published";
}

export const ObjectCatalogPage = ({ mode }: ObjectCatalogPageProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFilter = searchParams.get("projectId");
  const loadPage = useCallback(
    (query?: { cursor?: string | null; limit?: number }) =>
      mode === "catalog"
        ? listPublishedPixelObjectsPage(query)
        : listMyPixelObjectsPage({
            ...query,
            projectId: projectIdFilter ?? undefined,
          }),
    [mode, projectIdFilter],
  );
  const list = useCursorList({ loadPage });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openInEditor = async (item: PixelObjectDto) => {
    setLoadingId(item.id);
    try {
      await loadPixelObjectIntoEditor(item);
      navigate(`/new-project?projectId=${item.projectId}&edit=1`);
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось открыть объект в редакторе."));
    } finally {
      setLoadingId(null);
    }
  };

  const removeObject = async (item: PixelObjectDto) => {
    const ok = await confirm({
      ...removalConfirm([item]),
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) {
      return;
    }
    setDeletingId(item.id);
    try {
      const result = await deletePixelObject(item.id);
      list.removeItem(item.id);
      const success = removalSuccess(result.outcome === "deleted" ? 1 : 0, result.outcome === "reassigned" ? 1 : 0);
      toast.success(success.title, { description: success.description });
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось удалить объект."));
    } finally {
      setDeletingId(null);
    }
  };

  const title = mode === "catalog" ? "Каталог объектов" : "Мои объекты";
  const empty =
    mode === "catalog"
      ? "В каталоге пока нет опубликованных объектов."
      : "Вы ещё не отправляли объекты.";

  return (
    <section className="object-catalog">
      <h1>{title}</h1>
      {list.loading ? <p>Загрузка…</p> : null}
      {!list.loading && list.items.length === 0 ? <p>{empty}</p> : null}
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
            {mode === "mine" && (canOpenInEditor(item) || canDeleteObject(item)) ? (
              <div className="object-catalog__actions">
                {canOpenInEditor(item) ? (
                  <button
                    type="button"
                    className="object-catalog__edit"
                    disabled={loadingId === item.id || deletingId === item.id}
                    onClick={() => void openInEditor(item)}
                  >
                    {loadingId === item.id ? "Загрузка…" : "Открыть в редакторе"}
                  </button>
                ) : null}
                {canDeleteObject(item) ? (
                  <button
                    type="button"
                    className="object-catalog__delete"
                    disabled={deletingId === item.id || loadingId === item.id}
                    onClick={() => void removeObject(item)}
                  >
                    {deletingId === item.id ? "Удаление…" : "Удалить"}
                  </button>
                ) : null}
              </div>
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
