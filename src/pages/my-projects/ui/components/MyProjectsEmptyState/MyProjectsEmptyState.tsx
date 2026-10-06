import "./MyProjectsEmptyState.scss";

import { Plus } from "lucide-react";

export type MyProjectsEmptyStateProps = {
  heroSrc: string;
  canCreate: boolean;
  onCreate: () => void;
};

export function MyProjectsEmptyState({ heroSrc, canCreate, onCreate }: MyProjectsEmptyStateProps) {
  return (
    <div className="my-projects-empty">
      <img
        className="my-projects-empty__hero"
        src={heroSrc}
        alt=""
        width={180}
        height={180}
        decoding="async"
      />
      <h1 className="my-projects-empty__title">Создайте свой первый проект</h1>
      <p className="my-projects-empty__lead">
        Соберите пиксель-арт объекты в одном месте — от идеи до готовой коллекции.
      </p>
      {canCreate ? (
        <button type="button" className="my-projects__primary my-projects-empty__cta" onClick={onCreate}>
          <Plus size={20} aria-hidden />
          Создать проект
        </button>
      ) : null}
    </div>
  );
}
