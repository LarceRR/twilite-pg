import { useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { useEditorPaletteStore } from "@/shared/store/editorPalette";
import "./EditorWorkingPalette.scss";

export const EditorWorkingPalette = () => {
  const colors = useEditorPaletteStore((state) => state.colors);
  const clearColors = useEditorPaletteStore((state) => state.clearColors);
  const setPrimaryColor = useEditorCanvasStore((state) => state.setPrimaryColor);
  const setSecondaryColor = useEditorCanvasStore((state) => state.setSecondaryColor);

  const handleClear = () => {
    if (colors.length === 0) {
      return;
    }
    if (window.confirm("Очистить палитру?")) {
      clearColors();
    }
  };

  return (
    <div className="editor-working-palette" aria-label="Палитра">
      {colors.length === 0 ? (
        <span className="editor-working-palette__empty">Нарисуйте цветом</span>
      ) : (
        <div className="editor-working-palette__swatches">
          {colors.map((color) => (
            <button
              key={color.hex}
              type="button"
              className="editor-working-palette__swatch"
              style={{ backgroundColor: color.hex }}
              title={`${color.hex} — ЛКМ основной, ПКМ дополнительный`}
              aria-label={color.hex}
              onClick={() => setPrimaryColor(color.hex)}
              onContextMenu={(event) => {
                event.preventDefault();
                setSecondaryColor(color.hex);
              }}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        className="editor-working-palette__clear"
        disabled={colors.length === 0}
        onClick={handleClear}
      >
        Очистить
      </button>
    </div>
  );
};
