import { useEffect, useRef } from "react";
import { toImageData } from "@/shared/pixelObject/png";
import { useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { compositeFrame } from "@/shared/store/editorCanvas/model/frames";
import type { FrameId } from "@/shared/store/editorCanvas";

type FrameThumbnailProps = {
  frameId: FrameId;
};

export function FrameThumbnail({ frameId }: FrameThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revision = useEditorCanvasStore((state) => state.revision);
  const isDrawing = useEditorCanvasStore((state) => state.isDrawing);
  const activeFrameId = useEditorCanvasStore((state) => state.activeFrameId);
  const width = useEditorCanvasStore((state) => state.width);
  const height = useEditorCanvasStore((state) => state.height);

  useEffect(() => {
    if (isDrawing && frameId !== activeFrameId) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const state = useEditorCanvasStore.getState();
    const frame = state.frames.find((item) => item.id === frameId);
    context.imageSmoothingEnabled = false;
    if (!frame) {
      context.clearRect(0, 0, state.width, state.height);
      return;
    }

    const pixels = compositeFrame(state.layers, frame, state.width, state.height);
    context.putImageData(toImageData(pixels, state.width, state.height), 0, 0);
  }, [activeFrameId, frameId, height, isDrawing, revision, width]);

  return (
    <canvas
      ref={canvasRef}
      className="editor-animation-timeline__thumb"
      width={width}
      height={height}
      aria-hidden
    />
  );
}
