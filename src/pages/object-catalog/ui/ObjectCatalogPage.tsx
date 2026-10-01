import { useEffect, useState } from "react";
import { ApiError } from "@/shared/api/http";
import {
  listMyPixelObjects,
  listPublishedPixelObjects,
  type PixelObjectDto,
} from "@/shared/api/pixelObjects";
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

function catalogError(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Недостаточно прав для просмотра каталога.";
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Не удалось загрузить каталог.";
}

export const ObjectCatalogPage = ({ mode }: ObjectCatalogPageProps) => {
  const [items, setItems] = useState<PixelObjectDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = mode === "catalog" ? listPublishedPixelObjects : listMyPixelObjects;
    load()
      .then((next) => {
        if (!cancelled) {
          setItems(next);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(catalogError(caught));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const title = mode === "catalog" ? "Каталог объектов" : "Мои объекты";
  const empty =
    mode === "catalog"
      ? "В каталоге пока нет опубликованных объектов."
      : "Вы ещё не отправляли объекты.";

  return (
    <section className="object-catalog">
      <h1>{title}</h1>
      {loading ? <p>Загрузка…</p> : null}
      {error ? <p className="object-catalog__error">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p>{empty}</p> : null}
      <div className="object-catalog__grid">
        {items.map((item) => (
          <article key={item.id} className="object-catalog__card">
            {item.status === "published" ? (
              <MobileLoopPlayer objectId={item.id} />
            ) : (
              <SheetPlayer sheetUrl={item.sheetUrl} manifest={item.manifest} />
            )}
            <h2>{item.title}</h2>
            <p className="object-catalog__meta">
              {item.authorDisplayName} · {STATUS_LABEL[item.status]}
            </p>
            {item.rejectionComment ? (
              <p className="object-catalog__comment">{item.rejectionComment}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
};
