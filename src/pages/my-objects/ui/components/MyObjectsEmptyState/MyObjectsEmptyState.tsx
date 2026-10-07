import "./MyObjectsEmptyState.scss";

import { Plus } from "lucide-react";

export type MyObjectsEmptyStateProps = {
  heroSrc: string;
  canCreate: boolean;
  heading: string | null;
  onCreate: () => void;
};

export function MyObjectsEmptyState({ heroSrc, canCreate, heading, onCreate }: MyObjectsEmptyStateProps) {
  return (
    <div className="my-objects-empty">
      <img
        className="my-objects-empty__hero"
        src={heroSrc}
        alt=""
        width={180}
        height={180}
        decoding="async"
      />
      {heading ? <h1 className="my-objects-empty__title">{heading}</h1> : null}
      <p className="my-objects-empty__lead">
        Нарисуйте пиксель-арт — объект появится в этом списке.
      </p>
      {canCreate ? (
        <button type="button" className="my-objects__primary my-objects-empty__cta" onClick={onCreate}>
          <Plus size={20} aria-hidden />
          Создать объект
        </button>
      ) : null}
    </div>
  );
}
