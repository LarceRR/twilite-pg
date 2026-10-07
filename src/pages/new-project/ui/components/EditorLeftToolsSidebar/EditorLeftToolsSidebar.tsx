import { useEffect, useRef, useState } from "react";
import { Circle, Lasso, SquareDashed, WandSparkles } from "lucide-react";
import { useEditorCanvasStore, type SelectionTool } from "@/shared/store/editorCanvas";
import { useEditorPaletteStore } from "@/shared/store/editorPalette";
import { EDITOR_TOOLS, useEditorSelectedToolStore, type IEditorTool } from "@/shared/store/editorSelectedTool";
import { confirm } from "@/shared/ui/Confirm";
import "./EditorLeftToolsSidebar.scss";

const SELECTION_ICONS: Record<SelectionTool, typeof SquareDashed> = {
  rect: SquareDashed,
  ellipse: Circle,
  lasso: Lasso,
  wand: WandSparkles,
};

export const EditorLeftToolsSidebar = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const currentToolName = useEditorSelectedToolStore((state) => state.currentTool.name);
  const setCurrentTool = useEditorSelectedToolStore((state) => state.setCurrentTool);
  const selectionTool = useEditorCanvasStore((state) => state.selectionTool);
  const setPrimaryColor = useEditorCanvasStore((state) => state.setPrimaryColor);
  const setSecondaryColor = useEditorCanvasStore((state) => state.setSecondaryColor);
  const colors = useEditorPaletteStore((state) => state.colors);
  const clearColors = useEditorPaletteStore((state) => state.clearColors);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setPaletteOpen(currentToolName === "Palette");
  }, [currentToolName]);

  const handleSelectTool = (tool: IEditorTool) => {
    setCurrentTool(tool);
    setPaletteOpen(tool.name === "Palette");
  };

  const handleClearPalette = async () => {
    if (colors.length === 0) return;
    if (await confirm("Очистить палитру?")) {
      clearColors();
    }
  };

  return (
    <div className="editor-left-tools-sidebar" ref={rootRef}>
      <div className="editor-left-tools-sidebar__rail">
        {EDITOR_TOOLS.map((tool) => {
          const active = currentToolName === tool.name;
          const Icon = tool.name === "Select" ? SELECTION_ICONS[selectionTool] : tool.icon;
          return (
            <div
              key={tool.name}
              className={`editor-left-tools-sidebar__tool${active ? " editor-left-tools-sidebar__tool--active" : ""}`}
              onClick={() => handleSelectTool(tool)}
              title={tool.description || tool.name}
              aria-label={tool.description || tool.name}
              aria-expanded={tool.name === "Palette" ? paletteOpen : undefined}
            >
              <Icon size={20} />
            </div>
          );
        })}

        <div className="editor-left-tools-sidebar__rail-tool-more">
          sdfsdf
        </div>
      </div>
    </div>
  );
};
