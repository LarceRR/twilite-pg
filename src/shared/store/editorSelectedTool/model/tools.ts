import {
  Brush,
  Crop,
  Eraser,
  MousePointer2,
  SquareDashed,
  PaintBucket,
  Palette,
  Pen,
  Shapes as ShapesIcon,
} from "lucide-react";
import { clampToolAmount } from "./toolAmount";
import type { EditorToolPropertyValues, IEditorTool } from "./types";

export const EDITOR_TOOLS: readonly IEditorTool[] = [
  {
    name: "Select",
    description: "Выделение",
    icon: SquareDashed,
  },
  {
    name: "Brush",
    description: "test desc",
    icon: Brush,
    toolProperties: [
      {
        toolName: "Softness",
        toolCurrentAmount: 10,
        toolMaxAmount: 100,
        toolMinAmount: 0,
      },
      {
        toolName: "Size",
        toolCurrentAmount: 4,
        toolMaxAmount: 100,
        toolMinAmount: 1,
      },
    ],
  },
  {
    name: "Pen",
    description: "test desc",
    icon: Pen,
  },
  {
    name: "Shapes",
    description: "Геометрические фигуры",
    icon: ShapesIcon,
    toolProperties: [
      {
        toolName: "Softness",
        toolCurrentAmount: 0,
        toolMaxAmount: 100,
        toolMinAmount: 0,
      },
      {
        toolName: "Size",
        toolCurrentAmount: 1,
        toolMaxAmount: 20,
        toolMinAmount: 1,
      },
    ],
  },
  {
    name: "Eraser",
    description: "test desc",
    icon: Eraser,
    toolProperties: [
      {
        toolName: "Softness",
        toolCurrentAmount: 10,
        toolMaxAmount: 100,
        toolMinAmount: 0,
      },
      {
        toolName: "Size",
        toolCurrentAmount: 4,
        toolMaxAmount: 100,
        toolMinAmount: 1,
      },
    ],
  },
  {
    name: "Fill",
    description: "Заливка связной области (G)",
    icon: PaintBucket,
  },
  {
    name: "Crop",
    description: "test desc",
    icon: Crop,
  },
];

export const DEFAULT_EDITOR_TOOL_NAME = "Brush";

export function getEditorToolByName(name: string): IEditorTool | undefined {
  return EDITOR_TOOLS.find((tool) => tool.name === name);
}

export function getDefaultEditorTool(): IEditorTool {
  return getEditorToolByName(DEFAULT_EDITOR_TOOL_NAME) ?? EDITOR_TOOLS[0];
}

export function createInitialToolPropertyValues(): EditorToolPropertyValues {
  return Object.fromEntries(
    EDITOR_TOOLS.map((tool) => [
      tool.name,
      Object.fromEntries(
        (tool.toolProperties ?? []).map((property) => [
          property.toolName,
          clampToolAmount(
            property.toolCurrentAmount,
            property.toolMinAmount,
            property.toolMaxAmount,
          ),
        ]),
      ),
    ]),
  );
}

export function applySavedToolProperties(
  tool: IEditorTool,
  saved?: Record<string, number>,
): IEditorTool {
  if (!tool.toolProperties?.length) {
    return { ...tool };
  }

  return {
    ...tool,
    toolProperties: tool.toolProperties.map((property) => {
      const nextAmount = saved?.[property.toolName] ?? property.toolCurrentAmount;

      return {
        ...property,
        toolCurrentAmount: clampToolAmount(
          nextAmount,
          property.toolMinAmount,
          property.toolMaxAmount,
        ),
      };
    }),
  };
}
