export type PixelPoint = { x: number; y: number };

/** Snap the endpoint to the nearest 45° ray while preserving line length. */
export function snapLineEndpoint(
  start: PixelPoint,
  end: PixelPoint,
): PixelPoint {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return end;
  }

  const angleStep = Math.PI / 4;
  const snappedAngle = Math.round(Math.atan2(dy, dx) / angleStep) * angleStep;
  const length = Math.hypot(dx, dy);

  return {
    x: Math.round(start.x + Math.cos(snappedAngle) * length),
    y: Math.round(start.y + Math.sin(snappedAngle) * length),
  };
}
