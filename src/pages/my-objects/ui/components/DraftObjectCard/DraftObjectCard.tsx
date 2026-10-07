import "./DraftObjectCard.scss";

import { Calendar, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { OBJECT_DRAFT_TITLE, type ObjectDraftRecord } from "@/shared/pixelObject/objectDraftStore";
import { PIXEL_OBJECT_TYPE_LABEL } from "@/shared/pixelObject/objectType";

import { formatObjectDate } from "../../../model/objectFormatters";

export type DraftObjectCardProps = {
  draft: ObjectDraftRecord;
  busy: boolean;
  onOpen: () => void;
  onDiscard: () => void;
};

export function DraftObjectCard({ draft, busy, onOpen, onDiscard }: DraftObjectCardProps) {
  const previewUrl = usePreviewUrl(draft.previewPng);

  return (
    <article className="draft-object-card">
      <div
        className="draft-object-card__preview"
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!busy) onOpen();
        }}
        onKeyDown={(event) => {
          if (busy) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
      >
        <span className="draft-object-card__badge">Черновик</span>
        <button
          type="button"
          className="draft-object-card__discard"
          aria-label={`Удалить черновик «${draft.title || OBJECT_DRAFT_TITLE}»`}
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            onDiscard();
          }}
        >
          <Trash2 size={15} aria-hidden />
        </button>
        {previewUrl ? (
          <img src={previewUrl} alt="" />
        ) : (
          <span className="draft-object-card__empty">Нет превью</span>
        )}
      </div>
      <div className="draft-object-card__body">
        <h2 className="draft-object-card__title">{draft.title.trim() || OBJECT_DRAFT_TITLE}</h2>
        <p className="draft-object-card__tags">
          <span className="draft-object-card__tag">{PIXEL_OBJECT_TYPE_LABEL[draft.objectType]}</span>
          <span className="draft-object-card__tag">Только в этом браузере</span>
        </p>
        <div className="draft-object-card__footer">
          <Calendar size={13} aria-hidden />
          {formatObjectDate(draft.updatedAt)}
        </div>
      </div>
    </article>
  );
}

function usePreviewUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
