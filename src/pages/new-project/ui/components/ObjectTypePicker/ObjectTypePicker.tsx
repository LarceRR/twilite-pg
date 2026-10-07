import "./ObjectTypePicker.scss";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

import { PIXEL_OBJECT_TYPE_LABEL, type PixelObjectType } from "@/shared/pixelObject/objectType";

export type ObjectTypePickerProps = {
  onPick: (objectType: PixelObjectType) => void;
};

const ART = {
  flame: "/new-object/object-type/object-create.png",
  goodScene: "/new-object/object-type/good-card-background.png",
  badScene: "/new-object/object-type/bad-card-background.png",
} as const;

const CARDS: {
  id: PixelObjectType;
  hint: string;
  scene: string;
  tone: "good" | "bad";
}[] = [
  {
    id: "Good",
    hint: "То, к чему хочется возвращаться",
    scene: ART.goodScene,
    tone: "good",
  },
  {
    id: "Bad",
    hint: "То, что было непросто пережить",
    scene: ART.badScene,
    tone: "bad",
  },
];

export function ObjectTypePicker({ onPick }: ObjectTypePickerProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");

  function goBack(): void {
    navigate(projectId ? `/my-objects?projectId=${projectId}` : "/my-objects");
  }

  return (
    <section className="object-type-picker">
      <div className="object-type-picker__intro">
        <img className="object-type-picker__flame" src={ART.flame} alt="" />
        <h1>Какой это момент?</h1>
        <p>Тип выбирается до рисования. Если уйти из редактора, черновик останется в этом проекте.</p>
      </div>
      <div className="object-type-picker__cards">
        {CARDS.map(({ id, hint, scene, tone }) => (
          <button
            key={id}
            type="button"
            className={`object-type-picker__card object-type-picker__card--${tone}`}
            onClick={() => onPick(id)}
          >
            <span className="object-type-picker__art">
              <img className="object-type-picker__scene" src={scene} alt="" />
            </span>
            <span className="object-type-picker__body">
              <span className="object-type-picker__copy">
                <span className="object-type-picker__label">{PIXEL_OBJECT_TYPE_LABEL[id]}</span>
                <span className="object-type-picker__hint">{hint}</span>
              </span>
              <ArrowRight className="object-type-picker__arrow" size={18} aria-hidden />
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="object-type-picker__back" onClick={goBack}>
        <ArrowLeft size={16} aria-hidden />
        Назад к объектам
      </button>
    </section>
  );
}
