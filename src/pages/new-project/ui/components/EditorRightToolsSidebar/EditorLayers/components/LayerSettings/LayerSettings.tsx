import { BLEND_MODES, useEditorCanvasStore } from "@/shared/store/editorCanvas";
import Input from "@/shared/ui/Input/Input";
import "./LayerSettings.scss";

export const LayerSettings = () => {
  const activeLayer = useEditorCanvasStore((state) =>
    state.layers.find((layer) => layer.id === state.activeLayerId),
  );
  const setLayerOpacity = useEditorCanvasStore((state) => state.setLayerOpacity);
  const setLayerBlendMode = useEditorCanvasStore((state) => state.setLayerBlendMode);
  const renameLayer = useEditorCanvasStore((state) => state.renameLayer);

  if (!activeLayer) {
    return <div className="layer-settings">Нет активного слоя</div>;
  }

  return (
    <div className="layer-settings">
      <div className="layer-settings__row">
        <span>Имя</span>
        <Input
          variant="field"
          className="layer-settings__name"
          value={activeLayer.name}
          commitOnBlur
          aria-label="Имя слоя"
          onCommit={(name) => renameLayer(activeLayer.id, name)}
        />
      </div>
      <label className="layer-settings__row">
        <span>Opacity</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(activeLayer.opacity * 100)}
          onChange={(event) =>
            setLayerOpacity(activeLayer.id, Number(event.target.value) / 100)
          }
        />
        <span className="layer-settings__value">
          {Math.round(activeLayer.opacity * 100)}%
        </span>
      </label>
      <label className="layer-settings__row">
        <span>Blend</span>
        <select
          value={activeLayer.blendMode}
          onChange={(event) =>
            setLayerBlendMode(
              activeLayer.id,
              event.target.value as (typeof BLEND_MODES)[number],
            )
          }
        >
          {BLEND_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
