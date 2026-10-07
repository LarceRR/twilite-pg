import "./ObjectCategoryTabs.scss";

import { OBJECT_CATEGORIES, type ObjectCategoryId } from "../../../model/objectCategories";
import { OBJECT_CATEGORY_ICONS } from "../../objectCategoryIcons";

export type ObjectCategoryTabsProps = {
  value: ObjectCategoryId;
  onChange: (value: ObjectCategoryId) => void;
};

export function ObjectCategoryTabs({ value, onChange }: ObjectCategoryTabsProps) {
  return (
    <div className="object-category-tabs" role="tablist" aria-label="Категории">
      {OBJECT_CATEGORIES.map((category) => {
        const Icon = OBJECT_CATEGORY_ICONS[category.id];
        const active = value === category.id;
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`object-category-tabs__tab${active ? " object-category-tabs__tab--active" : ""}`}
            onClick={() => onChange(category.id)}
          >
            <Icon size={15} aria-hidden />
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
