import { useEffect, useRef } from "react";
import { useEditorCanvasStore } from "@/shared/store/editorCanvas";
import type { LayerId } from "@/shared/store/editorCanvas";

const THUMB_SIZE = 28;

type LayerThumbnailProps = {
  layerId: LayerId;
};

/**
 * Mini preview of a single layer. Refreshes when drawing stops (or on
 * non-stroke document changes), not on every pointer move.
 */
export function LayerThumbnail({ layerId }: LayerThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useEditorCanvasStore((state) => state.isDrawing);
  const revision = useEditorCanvasStore((state) => state.revision);
  const width = useEditorCanvasStore((state) => state.width);
  const height = useEditorCanvasStore((state) => state.height);

  useEffect(() => {
    if (isDrawing) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const layer = useEditorCanvasStore
      .getState()
      .layers.find((item) => item.id === layerId);
    if (!layer) {
      ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);
      return;
    }

    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const sourceCtx = source.getContext("2d");
    if (!sourceCtx) {
      return;
    }

    const imageData = sourceCtx.createImageData(width, height);
    imageData.data.set(layer.pixels);
    sourceCtx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);
    ctx.drawImage(source, 0, 0, width, height, 0, 0, THUMB_SIZE, THUMB_SIZE);
  }, [isDrawing, revision, layerId, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="editor-layer__thumb"
      width={THUMB_SIZE}
      height={THUMB_SIZE}
      aria-hidden
    />
  );
}
