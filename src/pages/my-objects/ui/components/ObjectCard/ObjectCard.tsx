import "./ObjectCard.scss";

import { Box, Calendar, MoreHorizontal, Tag } from "lucide-react";
import { useState } from "react";

import type { PixelObjectDto } from "@/shared/api/pixelObjects";
import { SheetPlayer } from "@/pages/new-project/ui/components/EditorRightToolsSidebar/EditorExport/SheetPlayer";
import { Popover } from "@/shared/ui/Popover";

import { formatObjectDate, objectTags } from "../../../model/objectFormatters";
import { objectCategoryId } from "../../../model/objectCategories";
import { OBJECT_CATEGORY_ICONS } from "../../objectCategoryIcons";
import { ObjectCardMenu } from "./ObjectCardMenu";

export type ObjectCardProps = {
  item: PixelObjectDto;
  selected: boolean;
  busy: boolean;
  canOpen: boolean;
  canDelete: boolean;
  onToggleSelected: () => void;
  onOpen: () => void;
  onDelete: () => void;
};

export function ObjectCard({
  item,
  selected,
  busy,
  canOpen,
  canDelete,
  onToggleSelected,
  onOpen,
  onDelete,
}: ObjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const categoryId = objectCategoryId(item);
  const TitleIcon = categoryId ? OBJECT_CATEGORY_ICONS[categoryId] : Box;
  const tags = objectTags(item);
  const showMenu = canOpen || canDelete;

  return (
    <article className={`object-card${selected ? " object-card--selected" : ""}`}>
      <div
        className={`object-card__preview${canOpen ? " object-card__preview--openable" : ""}`}
        onClick={() => {
          if (canOpen && !busy) {
            onOpen();
          }
        }}
      >
        <label className="object-card__check" onClick={(event) => event.stopPropagation()}>
          <span className="my-objects-check-wrap">
            <input
              type="checkbox"
              className="my-objects-check"
              checked={selected}
              disabled={busy}
              aria-label={`Выбрать «${item.title}»`}
              onChange={onToggleSelected}
            />
            <span className="my-objects-check__box" aria-hidden />
          </span>
        </label>
        {showMenu ? (
          <div
            className="object-card__menu"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Popover
              open={menuOpen}
              onOpenChange={setMenuOpen}
              placement="bottom"
              disabled={busy}
              content={
                <ObjectCardMenu
                  title={item.title}
                  busy={busy}
                  canOpen={canOpen}
                  canDelete={canDelete}
                  onOpen={() => {
                    setMenuOpen(false);
                    onOpen();
                  }}
                  onDelete={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                />
              }
            >
              <button
                type="button"
                className="object-card__menu-trigger"
                aria-label={`Действия: ${item.title}`}
                aria-haspopup="menu"
                disabled={busy}
              >
                <MoreHorizontal size={16} aria-hidden />
              </button>
            </Popover>
          </div>
        ) : null}
        <SheetPlayer sheetUrl={item.sheetUrl} manifest={item.manifest} />
      </div>

      <div className="object-card__body">
        <h2 className="object-card__title">
          <TitleIcon size={14} aria-hidden />
          <span>{item.title}</span>
        </h2>
        <p className="object-card__tags">
          <Tag size={13} aria-hidden />
          {tags.map((tag) => (
            <span key={tag} className="object-card__tag">
              {tag}
            </span>
          ))}
        </p>
        <div className="object-card__footer">
          <span className="object-card__date">
            <Calendar size={13} aria-hidden />
            {formatObjectDate(item.updatedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
