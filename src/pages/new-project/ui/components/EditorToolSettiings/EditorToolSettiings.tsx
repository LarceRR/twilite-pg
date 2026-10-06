import {
  ArrowLeftRight,
  Circle,
  Diamond,
  Download,
  Plus,
  Redo2,
  Square,
  Undo2,
} from "lucide-react";
import {
  getActiveBrushShape,
  useEditorSelectedToolStore,
} from "@/shared/store/editorSelectedTool";
import {
  BRUSH_SHAPE_LABELS,
  BRUSH_SHAPES,
  isBrushShape,
  isShapeToolShape,
  SHAPE_TOOL_LABELS,
  SHAPE_TOOL_SHAPES,
  useEditorCanvasStore,
  type BrushShape,
  type ShapeToolShape,
} from "@/shared/store/editorCanvas";
import { downloadBlob } from "@/shared/lib/download";
import { ColorPicker, ColorPickerSwatchTrigger } from "@/shared/ui/ColorPicker";
import Input from "@/shared/ui/Input/Input";
import { SelectionToolSettings } from "./SelectionToolSettings";
import "./EditorToolSettiings.scss";

const BRUSH_SHAPE_TOOLS = new Set(["Brush", "Eraser"]);

function ShapeIcon({ shape }: { shape: BrushShape | ShapeToolShape }) {
  const props = { size: 14, strokeWidth: 2 } as const;
  switch (shape) {
    case "square":
      return <Square {...props} />;
    case "circle":
      return <Circle {...props} />;
    case "diamond":
      return <Diamond {...props} />;
    case "line":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path
            d="M2 7h10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        </svg>
      );
  }
}

export const EditorToolSettiings = () => {
  const currentTool = useEditorSelectedToolStore((state) => state.currentTool);
  const updateToolProperty = useEditorSelectedToolStore(
    (state) => state.updateToolProperty,
  );
  const setBrushShape = useEditorSelectedToolStore((state) => state.setBrushShape);
  const setShapeToolShape = useEditorSelectedToolStore(
    (state) => state.setShapeToolShape,
  );
  const activeShape = useEditorSelectedToolStore(
    (state) =>
      state.currentTool.name === "Shapes"
        ? state.shapeToolShape
        : getActiveBrushShape(state),
  );
  const primaryColor = useEditorCanvasStore((state) => state.primaryColor);
  const secondaryColor = useEditorCanvasStore((state) => state.secondaryColor);
  const setPrimaryColor = useEditorCanvasStore((state) => state.setPrimaryColor);
  const setSecondaryColor = useEditorCanvasStore((state) => state.setSecondaryColor);
  const swapColors = useEditorCanvasStore((state) => state.swapColors);
  const undo = useEditorCanvasStore((state) => state.undo);
  const redo = useEditorCanvasStore((state) => state.redo);
  const activeLayerId = useEditorCanvasStore((state) => state.activeLayerId);
  const revision = useEditorCanvasStore((state) => state.revision);
  const isDrawing = useEditorCanvasStore((state) => state.isDrawing);
  const exportPngBlob = useEditorCanvasStore((state) => state.exportPngBlob);

  const activeLayer = useEditorCanvasStore((state) =>
    state.layers.find((layer) => layer.id === state.activeLayerId),
  );
  const canUndo = Boolean(activeLayer && activeLayer.undoStack.length > 0 && !isDrawing);
  const canRedo = Boolean(activeLayer && activeLayer.redoStack.length > 0 && !isDrawing);
  const showBrushShapes = BRUSH_SHAPE_TOOLS.has(currentTool.name);
  const showShapeToolShapes = currentTool.name === "Shapes";
  const showShapes = showBrushShapes || showShapeToolShapes;
  const showSelection = currentTool.name === "Select";
  const availableShapes = showShapeToolShapes ? SHAPE_TOOL_SHAPES : BRUSH_SHAPES;

  void revision;
  void activeLayerId;

  const handleShapeSelect = (shape: BrushShape | ShapeToolShape) => {
    if (showShapeToolShapes && isShapeToolShape(shape)) {
      setShapeToolShape(shape);
    } else if (showBrushShapes && isBrushShape(shape)) {
      setBrushShape(shape);
    }
  };

  const getShapeLabel = (shape: BrushShape | ShapeToolShape) =>
    isShapeToolShape(shape) ? SHAPE_TOOL_LABELS[shape] : BRUSH_SHAPE_LABELS[shape];

  const handleExport = async () => {
    try {
      const blob = await exportPngBlob();
      downloadBlob(blob, "pixel-art-160.png");
    } catch {
      // Export failures are rare (missing 2d context); keep UI quiet for MVP.
    }
  };

  return (
    <div className="editor-tool-settings">
      <div className="editor-tool-settings__colors">
        <ColorPicker
          className="editor-tool-settings__swatch"
          value={primaryColor}
          onChange={setPrimaryColor}
          aria-label="Primary color"
          title="Primary color"
        >
          <ColorPickerSwatchTrigger color={primaryColor} />
        </ColorPicker>
        <button
          type="button"
          className="editor-tool-settings__icon-btn"
          onClick={swapColors}
          title="Swap colors"
          aria-label="Swap colors"
        >
          <ArrowLeftRight size={20} />
        </button>
        <ColorPicker
          className="editor-tool-settings__swatch"
          value={secondaryColor}
          onChange={setSecondaryColor}
          aria-label="Secondary color"
          title="Secondary color"
        >
          <ColorPickerSwatchTrigger color={secondaryColor} />
        </ColorPicker>
      </div>

      {showShapes ? (
        <div
          className="editor-tool-settings__shapes"
          role="group"
          aria-label={showShapeToolShapes ? "Фигура" : "Форма кисти"}
        >
          {availableShapes.map((shape) => (
            <button
              key={shape}
              type="button"
              className={
                shape === activeShape
                  ? "editor-tool-settings__shape-btn editor-tool-settings__shape-btn--active"
                  : "editor-tool-settings__shape-btn"
              }
              title={getShapeLabel(shape)}
              aria-label={getShapeLabel(shape)}
              aria-pressed={shape === activeShape}
              onClick={() => handleShapeSelect(shape)}
            >
              <ShapeIcon shape={shape} />
            </button>
          ))}
          {showBrushShapes ? (
            <button
              type="button"
              className="editor-tool-settings__shape-btn"
              disabled
              title="Custom 16×16 — Скоро"
              aria-label="Добавить кастомную кисть 16×16 (скоро)"
            >
              <Plus size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      {showSelection ? <SelectionToolSettings /> : null}

      <div className="editor-tool-settings__tools">
        {currentTool.toolProperties?.map((tool) => (
          <div className="editor-tool-settings__tools-body" key={tool.toolName}>
            <span>{tool.toolName}: </span>
            <Input
              variant="field"
              value={tool.toolCurrentAmount}
              className="editor-tool-settings__tools-body_input"
              commitOnBlur
              min={tool.toolMinAmount}
              max={tool.toolMaxAmount}
              inputMode="decimal"
              aria-label={tool.toolName}
              onNumberCommit={(amount) => updateToolProperty(tool.toolName, amount)}
            />
          </div>
        ))}
      </div>

      <div className="editor-tool-settings__actions">
        <button
          type="button"
          className="editor-tool-settings__icon-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 size={20} />
        </button>
        <button
          type="button"
          className="editor-tool-settings__icon-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo"
          aria-label="Redo"
        >
          <Redo2 size={20} />
        </button>
      </div>
    </div>
  );
};
