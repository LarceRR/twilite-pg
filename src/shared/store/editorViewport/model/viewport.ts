export const MIN_VIEWPORT_ZOOM = 1;
export const MAX_VIEWPORT_ZOOM = 32;
export const GRID_MIN_ZOOM = 8;
export const MIN_VISIBLE_CANVAS_PX = 64;
export const FIT_MARGIN_PX = 16;

export type ViewportPoint = {
  x: number;
  y: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type ViewportTransform = {
  zoom: number;
  panX: number;
  panY: number;
};

export type DocumentSize = {
  width: number;
  height: number;
};

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DocumentPixel = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function clampViewportZoom(zoom: number): number {
  return clamp(Math.round(finiteOr(zoom, MIN_VIEWPORT_ZOOM)), MIN_VIEWPORT_ZOOM, MAX_VIEWPORT_ZOOM);
}

export function zoomAtPoint(
  transform: ViewportTransform,
  point: ViewportPoint,
  requestedZoom: number,
): ViewportTransform {
  const zoom = clampViewportZoom(transform.zoom);
  const nextZoom = clampViewportZoom(requestedZoom);
  if (zoom === nextZoom) {
    return { ...transform, zoom };
  }

  const worldX = (point.x - transform.panX) / zoom;
  const worldY = (point.y - transform.panY) / zoom;

  return {
    zoom: nextZoom,
    panX: Math.round(point.x - worldX * nextZoom),
    panY: Math.round(point.y - worldY * nextZoom),
  };
}

function clampPanAxis(
  pan: number,
  viewportExtent: number,
  canvasExtent: number,
  minimumVisible: number,
): number {
  if (viewportExtent <= 0 || canvasExtent <= 0) {
    return Math.round(finiteOr(pan, 0));
  }

  const visible = Math.min(minimumVisible, viewportExtent, canvasExtent);
  const min = visible - canvasExtent;
  const max = viewportExtent - visible;
  return Math.round(clamp(finiteOr(pan, 0), min, max));
}

export function clampViewportPan(
  transform: ViewportTransform,
  viewport: ViewportSize,
  document: DocumentSize,
  minimumVisible = MIN_VISIBLE_CANVAS_PX,
): ViewportTransform {
  const zoom = clampViewportZoom(transform.zoom);
  return {
    zoom,
    panX: clampPanAxis(transform.panX, viewport.width, document.width * zoom, minimumVisible),
    panY: clampPanAxis(transform.panY, viewport.height, document.height * zoom, minimumVisible),
  };
}

export function fitViewport(
  viewport: ViewportSize,
  document: DocumentSize,
  margin = FIT_MARGIN_PX,
): ViewportTransform {
  const availableWidth = Math.max(0, viewport.width - margin * 2);
  const availableHeight = Math.max(0, viewport.height - margin * 2);
  const widthZoom = Math.floor(availableWidth / document.width);
  const heightZoom = Math.floor(availableHeight / document.height);
  const zoom = clampViewportZoom(Math.min(widthZoom, heightZoom));

  return {
    zoom,
    panX: Math.round((viewport.width - document.width * zoom) / 2),
    panY: Math.round((viewport.height - document.height * zoom) / 2),
  };
}

export function clientPointToDocumentPixel(
  clientX: number,
  clientY: number,
  canvasRect: RectLike,
  document: DocumentSize,
): DocumentPixel | null {
  if (canvasRect.width <= 0 || canvasRect.height <= 0) {
    return null;
  }

  const x = Math.floor(((clientX - canvasRect.left) * document.width) / canvasRect.width);
  const y = Math.floor(((clientY - canvasRect.top) * document.height) / canvasRect.height);

  if (x < 0 || y < 0 || x >= document.width || y >= document.height) {
    return null;
  }

  return { x, y };
}

export function clientPointToDocumentPixelClamped(
  clientX: number,
  clientY: number,
  canvasRect: RectLike,
  document: DocumentSize,
): DocumentPixel | null {
  if (canvasRect.width <= 0 || canvasRect.height <= 0) {
    return null;
  }

  return {
    x: clamp(
      Math.floor(((clientX - canvasRect.left) * document.width) / canvasRect.width),
      0,
      document.width - 1,
    ),
    y: clamp(
      Math.floor(((clientY - canvasRect.top) * document.height) / canvasRect.height),
      0,
      document.height - 1,
    ),
  };
}

export function createPixelGridPath(document: DocumentSize, zoom: number): string {
  const integerZoom = clampViewportZoom(zoom);
  const width = document.width * integerZoom;
  const height = document.height * integerZoom;
  const segments: string[] = [];

  for (let x = 0; x <= document.width; x += 1) {
    const lineX = x === document.width ? width - 0.5 : x * integerZoom + 0.5;
    segments.push(`M ${lineX} 0 V ${height}`);
  }

  for (let y = 0; y <= document.height; y += 1) {
    const lineY = y === document.height ? height - 0.5 : y * integerZoom + 0.5;
    segments.push(`M 0 ${lineY} H ${width}`);
  }

  return segments.join(" ");
}
