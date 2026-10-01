import {
  Circle,
  CircleDashed,
  Lasso,
  Square,
  SquareDashed,
  WandSparkles,
  X,
} from "lucide-react";
import {
  APP_HOTKEYS,
} from "@/shared/const/hotkeys";
import {
  SELECTION_OP_MODE_LABELS,
  SELECTION_OP_MODES,
  SELECTION_TOOL_LABELS,
  SELECTION_TOOLS,
  useEditorCanvasStore,
  type SelectionOpMode,
  type SelectionTool,
} from "@/shared/store/editorCanvas";
import Input from "@/shared/ui/Input/Input";
import KeybindHint from "@/shared/ui/KeybindHint/KeybindHint";

const SELECTION_ICONS: Record<SelectionTool, typeof SquareDashed> = {
  rect: SquareDashed,
  ellipse: Circle,
  lasso: Lasso,
  wand: WandSparkles,
};

const OP_MODE_ICONS: Record<SelectionOpMode, typeof Square> = {
  replace: Square,
  add: SquareDashed,
  subtract: CircleDashed,
};

export function SelectionToolSettings() {
  const selectionTool = useEditorCanvasStore((state) => state.selectionTool);
  const setSelectionTool = useEditorCanvasStore((state) => state.setSelectionTool);
  const selectionOpMode = useEditorCanvasStore((state) => state.selectionOpMode);
  const setSelectionOpMode = useEditorCanvasStore((state) => state.setSelectionOpMode);
  const selectionMask = useEditorCanvasStore((state) => state.selectionMask);
  const floatSession = useEditorCanvasStore((state) => state.floatSession);
  const deselect = useEditorCanvasStore((state) => state.deselect);
  const wandTolerance = useEditorCanvasStore((state) => state.wandTolerance);
  const setWandTolerance = useEditorCanvasStore((state) => state.setWandTolerance);
  const wandContiguous = useEditorCanvasStore((state) => state.wandContiguous);
  const setWandContiguous = useEditorCanvasStore((state) => state.setWandContiguous);
  const wandSampleAllLayers = useEditorCanvasStore((state) => state.wandSampleAllLayers);
  const setWandSampleAllLayers = useEditorCanvasStore((state) => state.setWandSampleAllLayers);

  const canDeselect = selectionMask != null || floatSession != null;

  return (
    <>
      <div
        className="editor-tool-settings__shapes"
        role="group"
        aria-label="Инструмент выделения"
      >
        {SELECTION_TOOLS.map((tool) => {
          const Icon = SELECTION_ICONS[tool];
          return (
            <button
              key={tool}
              type="button"
              className={
                tool === selectionTool
                  ? "editor-tool-settings__shape-btn editor-tool-settings__shape-btn--active"
                  : "editor-tool-settings__shape-btn"
              }
              aria-label={SELECTION_TOOL_LABELS[tool]}
              title={SELECTION_TOOL_LABELS[tool]}
              aria-pressed={tool === selectionTool}
              onClick={() => setSelectionTool(tool)}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      {selectionTool !== "wand" ? (
        <div
          className="editor-tool-settings__shapes"
          role="group"
          aria-label="Режим выделения"
        >
          {SELECTION_OP_MODES.map((mode) => {
            const Icon = OP_MODE_ICONS[mode];
            return (
              <button
                key={mode}
                type="button"
                className={
                  mode === selectionOpMode
                    ? "editor-tool-settings__shape-btn editor-tool-settings__shape-btn--active"
                    : "editor-tool-settings__shape-btn"
                }
                aria-label={SELECTION_OP_MODE_LABELS[mode]}
                title={SELECTION_OP_MODE_LABELS[mode]}
                aria-pressed={mode === selectionOpMode}
                onClick={() => setSelectionOpMode(mode)}
              >
                <Icon size={14} />
                <span className="editor-tool-settings__mode-badge">
                  {mode === "add" ? "+" : mode === "subtract" ? "−" : "□"}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        className="editor-tool-settings__deselect"
        disabled={!canDeselect}
        title="Снять выделение"
        aria-label="Снять выделение"
        onClick={() => deselect()}
      >
        <X size={14} />
        <span>Снять</span>
        <KeybindHint hotkey={APP_HOTKEYS.DESELECT} />
      </button>

      {selectionTool === "wand" ? (
        <div className="editor-tool-settings__wand" role="group" aria-label="Параметры палочки">
          <label className="editor-tool-settings__wand-field">
            <span title="Насколько RGB может отличаться от клика">Допуск</span>
            <Input
              variant="field"
              value={wandTolerance}
              className="editor-tool-settings__wand-tolerance"
              commitOnBlur
              min={0}
              max={255}
              inputMode="numeric"
              aria-label="Допуск палочки 0–255"
              onNumberCommit={setWandTolerance}
            />
          </label>
          <label className="editor-tool-settings__wand-check" title="Только соседние пиксели">
            <input
              type="checkbox"
              checked={wandContiguous}
              onChange={(event) => setWandContiguous(event.target.checked)}
            />
            <span>Смежные</span>
          </label>
          <label className="editor-tool-settings__wand-check" title="Сэмпл со всех слоёв">
            <input
              type="checkbox"
              checked={wandSampleAllLayers}
              onChange={(event) => setWandSampleAllLayers(event.target.checked)}
            />
            <span>Все слои</span>
          </label>
        </div>
      ) : null}
    </>
  );
}
