import type { LucideIcon } from "lucide-react";
import type { BrushShape, ShapeToolShape } from "@/shared/store/editorCanvas";

export interface IEditorToolProperties {
  toolName: string;
  toolMinAmount: number;
  toolMaxAmount: number;
  toolCurrentAmount: number;
}

export interface IEditorTool {
  name: string;
  description: string;
  icon: LucideIcon;
  toolProperties?: IEditorToolProperties[];
}

export type EditorToolPropertyValues = Record<string, Record<string, number>>;

export type EditorBrushShapes = Record<string, BrushShape>;

export interface EditorSelectedToolState {
  currentTool: IEditorTool;
  toolPropertyValues: EditorToolPropertyValues;
  brushShapes: EditorBrushShapes;
  shapeToolShape: ShapeToolShape;
  setCurrentTool: (tool: IEditorTool) => void;
  updateToolProperty: (propertyName: string, value: number) => void;
  setBrushShape: (shape: BrushShape) => void;
  setShapeToolShape: (shape: ShapeToolShape) => void;
}

