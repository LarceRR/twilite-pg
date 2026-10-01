export type Side = "top" | "right" | "bottom" | "left";

export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

export type Placement = {
  top: number;
  left: number;
  side: Side;
  maxWidth: number;
  maxHeight: number;
};

const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

const SIDES: Side[] = ["top", "bottom", "right", "left"];

export function mirrorSide(side: Side, rtl: boolean): Side {
  if (!rtl) return side;
  if (side === "left") return "right";
  if (side === "right") return "left";
  return side;
}

export function placementCandidates(preferred: Side): Side[] {
  return [preferred, OPPOSITE[preferred], ...SIDES.filter((side) => side !== preferred && side !== OPPOSITE[preferred])];
}

export function spaceOnSide(side: Side, anchor: Box, viewport: Box, offset: number): number {
  if (side === "top") return anchor.y - viewport.y - offset;
  if (side === "bottom") return viewport.y + viewport.height - (anchor.y + anchor.height) - offset;
  if (side === "left") return anchor.x - viewport.x - offset;
  return viewport.x + viewport.width - (anchor.x + anchor.width) - offset;
}

function mainSize(side: Side, size: Size): number {
  return side === "top" || side === "bottom" ? size.height : size.width;
}

export function intersects(anchor: Box, viewport: Box): boolean {
  return anchor.x < viewport.x + viewport.width
    && anchor.x + anchor.width > viewport.x
    && anchor.y < viewport.y + viewport.height
    && anchor.y + anchor.height > viewport.y;
}

export function chooseSide(preferred: Side, anchor: Box, size: Size, viewport: Box, offset: number): Side {
  const sides = placementCandidates(preferred);
  const fitting = sides.find((side) => spaceOnSide(side, anchor, viewport, offset) >= mainSize(side, size));
  if (fitting) return fitting;
  return sides.reduce((best, side) => (
    spaceOnSide(side, anchor, viewport, offset) > spaceOnSide(best, anchor, viewport, offset) ? side : best
  ));
}

function alignedPosition(side: Side, anchor: Box, size: Size, offset: number): { top: number; left: number } {
  const left = anchor.x + anchor.width / 2 - size.width / 2;
  const top = anchor.y + anchor.height / 2 - size.height / 2;
  if (side === "top") return { top: anchor.y - offset - size.height, left };
  if (side === "bottom") return { top: anchor.y + anchor.height + offset, left };
  if (side === "left") return { top, left: anchor.x - offset - size.width };
  return { top, left: anchor.x + anchor.width + offset };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function inset(viewport: Box, padding: number): Box {
  return {
    x: viewport.x + padding,
    y: viewport.y + padding,
    width: Math.max(0, viewport.width - padding * 2),
    height: Math.max(0, viewport.height - padding * 2),
  };
}

function axisLimits(side: Side, anchor: Box, box: Box, offset: number): Pick<Placement, "maxWidth" | "maxHeight"> {
  const main = Math.max(0, spaceOnSide(side, anchor, box, offset));
  if (side === "top" || side === "bottom") return { maxWidth: box.width, maxHeight: main };
  return { maxWidth: main, maxHeight: box.height };
}

export function placeTooltip(
  anchor: Box,
  size: Size,
  viewport: Box,
  preferred: Side,
  offset: number,
  padding: number,
): Placement | null {
  if (!intersects(anchor, viewport)) return null;
  const box = inset(viewport, padding);
  const side = chooseSide(preferred, anchor, size, box, offset);
  const limits = axisLimits(side, anchor, box, offset);
  const fitted = {
    width: Math.min(size.width, limits.maxWidth),
    height: Math.min(size.height, limits.maxHeight),
  };
  const raw = alignedPosition(side, anchor, fitted, offset);
  return {
    side,
    maxWidth: limits.maxWidth,
    maxHeight: limits.maxHeight,
    left: Math.round(clamp(raw.left, box.x, box.x + box.width - fitted.width)),
    top: Math.round(clamp(raw.top, box.y, box.y + box.height - fitted.height)),
  };
}

export function samePlacement(current: Placement | null, next: Placement | null): boolean {
  if (current === next) return true;
  if (!current || !next) return false;
  return current.top === next.top
    && current.left === next.left
    && current.side === next.side
    && current.maxWidth === next.maxWidth
    && current.maxHeight === next.maxHeight;
}
