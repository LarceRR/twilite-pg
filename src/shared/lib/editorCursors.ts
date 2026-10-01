/**
 * Canvas CSS cursors. Custom tool cursors are lucide icons (same set as the UI)
 * encoded as SVG data-URIs — React components cannot be used in `cursor: url(...)`.
 */
import { __iconNode as circleNode } from "lucide-react/dist/esm/icons/circle.mjs";
import { __iconNode as cropNode } from "lucide-react/dist/esm/icons/crop.mjs";
import { __iconNode as eraserNode } from "lucide-react/dist/esm/icons/eraser.mjs";
import { __iconNode as lassoNode } from "lucide-react/dist/esm/icons/lasso.mjs";
import { __iconNode as paintbrushNode } from "lucide-react/dist/esm/icons/paintbrush.mjs";
import { __iconNode as paintBucketNode } from "lucide-react/dist/esm/icons/paint-bucket.mjs";
import { __iconNode as paletteNode } from "lucide-react/dist/esm/icons/palette.mjs";
import { __iconNode as penNode } from "lucide-react/dist/esm/icons/pen.mjs";
import { __iconNode as rotateCwNode } from "lucide-react/dist/esm/icons/rotate-cw.mjs";
import { __iconNode as squareDashedNode } from "lucide-react/dist/esm/icons/square-dashed.mjs";
import { __iconNode as wandSparklesNode } from "lucide-react/dist/esm/icons/wand-sparkles.mjs";

type LucideIconNode = ReadonlyArray<readonly [string, Record<string, string>]>;

export type EditorCursorId =
  | "default"
  | "crosshair"
  | "pen"
  | "brush"
  | "eraser"
  | "fill"
  | "move"
  | "marquee"
  | "ellipse"
  | "lasso"
  | "wand"
  | "crop"
  | "palette"
  | "grab"
  | "grabbing"
  | "resize-nwse"
  | "resize-nesw"
  | "resize-ns"
  | "resize-ew"
  | "rotate";

function escapeAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Build a 24×24 lucide SVG data-URI suitable for CSS `cursor`. */
function lucideCursor(
  nodes: LucideIconNode,
  hotspotX: number,
  hotspotY: number,
  fallback: string,
): string {
  const body = nodes
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key}="${escapeAttr(String(value))}"`)
        .join(" ");
      return `<${tag} ${attrStr}/>`;
    })
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ` +
    `fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<g stroke="#fff" stroke-width="3.5">${body}</g>` +
    `<g>${body}</g>` +
    `</svg>`;

  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, ${fallback}`;
}

export const EDITOR_CURSORS: Record<EditorCursorId, string> = {
  default: "default",
  crosshair: "crosshair",
  pen: lucideCursor(penNode as LucideIconNode, 2, 22, "crosshair"),
  brush: lucideCursor(paintbrushNode as LucideIconNode, 2, 22, "crosshair"),
  eraser: lucideCursor(eraserNode as LucideIconNode, 4, 20, "crosshair"),
  fill: lucideCursor(paintBucketNode as LucideIconNode, 4, 4, "cell"),
  move: "move",
  marquee: lucideCursor(squareDashedNode as LucideIconNode, 12, 12, "crosshair"),
  ellipse: lucideCursor(circleNode as LucideIconNode, 12, 12, "crosshair"),
  lasso: lucideCursor(lassoNode as LucideIconNode, 4, 20, "crosshair"),
  wand: lucideCursor(wandSparklesNode as LucideIconNode, 4, 4, "cell"),
  crop: lucideCursor(cropNode as LucideIconNode, 8, 8, "crosshair"),
  palette: lucideCursor(paletteNode as LucideIconNode, 4, 20, "pointer"),
  grab: "grab",
  grabbing: "grabbing",
  "resize-nwse": "nwse-resize",
  "resize-nesw": "nesw-resize",
  "resize-ns": "ns-resize",
  "resize-ew": "ew-resize",
  rotate: lucideCursor(rotateCwNode as LucideIconNode, 12, 12, "alias"),
};

export function cursorForToolName(
  toolName: string,
  selectionTool?: "rect" | "ellipse" | "lasso" | "wand",
): EditorCursorId {
  switch (toolName) {
    case "Pen":
      return "pen";
    case "Brush":
      return "brush";
    case "Eraser":
      return "eraser";
    case "Fill":
      return "fill";
    case "Move":
      return "move";
    case "Crop":
      return "crop";
    case "Palette":
      return "palette";
    case "Shapes":
      return "crosshair";
    case "Select":
      if (selectionTool === "ellipse") return "ellipse";
      if (selectionTool === "lasso") return "lasso";
      if (selectionTool === "wand") return "wand";
      return "marquee";
    default:
      return "crosshair";
  }
}

export function cursorForScaleHandle(
  handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w",
): EditorCursorId {
  switch (handle) {
    case "nw":
    case "se":
      return "resize-nwse";
    case "ne":
    case "sw":
      return "resize-nesw";
    case "n":
    case "s":
      return "resize-ns";
    case "e":
    case "w":
      return "resize-ew";
  }
}

export function cssCursor(id: EditorCursorId): string {
  return EDITOR_CURSORS[id];
}
