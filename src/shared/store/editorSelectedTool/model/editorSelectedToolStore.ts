import { create } from "zustand";
import {
  DEFAULT_BRUSH_SHAPE,
  DEFAULT_SHAPE_TOOL_SHAPE,
  isBrushShape,
  isShapeToolShape,
  type BrushShape,
  type ShapeToolShape,
} from "@/shared/store/editorCanvas";
import type { EditorBrushShapes, EditorSelectedToolState } from "./types";
import {
  applySavedToolProperties,
  createInitialToolPropertyValues,
  getDefaultEditorTool,
  getEditorToolByName,
} from "./tools";
import { clampToolAmount } from "./toolAmount";

const BRUSH_SHAPE_TOOLS = new Set(["Brush", "Eraser"]);

function createInitialBrushShapes(): EditorBrushShapes {
  return {
    Brush: DEFAULT_BRUSH_SHAPE,
    Eraser: DEFAULT_BRUSH_SHAPE,
  };
}

const initialPropertyValues = createInitialToolPropertyValues();
const initialDefaultTool = getDefaultEditorTool();
const defaultTool = applySavedToolProperties(
  initialDefaultTool,
  initialPropertyValues[initialDefaultTool.name],
);

export const useEditorSelectedToolStore = create<EditorSelectedToolState>((set, get) => ({
  currentTool: defaultTool,
  toolPropertyValues: initialPropertyValues,
  brushShapes: createInitialBrushShapes(),
  shapeToolShape: DEFAULT_SHAPE_TOOL_SHAPE,
  setCurrentTool: (tool) => {
    const catalogTool = getEditorToolByName(tool.name);
    if (!catalogTool) {
      return;
    }

    const saved = get().toolPropertyValues[catalogTool.name];
    set({ currentTool: applySavedToolProperties(catalogTool, saved) });
  },
  updateToolProperty: (propertyName, value) => {
    if (!propertyName) {
      return;
    }

    set((state) => {
      const property = state.currentTool.toolProperties?.find(
        (item) => item.toolName === propertyName,
      );

      if (!property) {
        return state;
      }

      const nextAmount = clampToolAmount(
        value,
        property.toolMinAmount,
        property.toolMaxAmount,
      );

      if (nextAmount === property.toolCurrentAmount) {
        return state;
      }

      return {
        currentTool: {
          ...state.currentTool,
          toolProperties: state.currentTool.toolProperties?.map((item) =>
            item.toolName === propertyName
              ? { ...item, toolCurrentAmount: nextAmount }
              : item,
          ),
        },
        toolPropertyValues: {
          ...state.toolPropertyValues,
          [state.currentTool.name]: {
            ...state.toolPropertyValues[state.currentTool.name],
            [propertyName]: nextAmount,
          },
        },
      };
    });
  },
  setBrushShape: (shape: BrushShape) => {
    if (!isBrushShape(shape)) {
      return;
    }
    const toolName = get().currentTool.name;
    if (!BRUSH_SHAPE_TOOLS.has(toolName)) {
      return;
    }
    set((state) => ({
      brushShapes: {
        ...state.brushShapes,
        [toolName]: shape,
      },
    }));
  },
  setShapeToolShape: (shape: ShapeToolShape) => {
    if (get().currentTool.name !== "Shapes" || !isShapeToolShape(shape)) {
      return;
    }
    set({ shapeToolShape: shape });
  },
}));

export function getActiveBrushShape(
  state: Pick<EditorSelectedToolState, "currentTool" | "brushShapes">,
): BrushShape {
  const name = state.currentTool.name;
  const shape = state.brushShapes[name];
  return shape && isBrushShape(shape) ? shape : DEFAULT_BRUSH_SHAPE;
}

export function getActiveShapeToolShape(
  state: Pick<EditorSelectedToolState, "shapeToolShape">,
): ShapeToolShape {
  return state.shapeToolShape;
}

export function getToolSoftness(
  state: Pick<EditorSelectedToolState, "currentTool">,
): number {
  const soft = state.currentTool.toolProperties?.find((p) => p.toolName === "Softness");
  return soft?.toolCurrentAmount ?? 0;
}
