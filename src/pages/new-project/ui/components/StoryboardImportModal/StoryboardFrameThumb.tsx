import { useEffect, useRef } from "react";
import { extractNativeRect, snapRect, type NativeCropRect } from "@/shared/store/editorCanvas";

type StoryboardFrameThumbProps = {
  native: Uint8ClampedArray;
  nativeWidth: number;
  nativeHeight: number;
  rect: NativeCropRect;
  index: number;
  active: boolean;
  onSelect: () => void;
};

export function StoryboardFrameThumb({
  native,
  nativeWidth,
  nativeHeight,
  rect,
  index,
  active,
  onSelect,
}: StoryboardFrameThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { x, y, w, h } = snapRect(rect);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const crop = extractNativeRect(native, nativeWidth, nativeHeight, { x, y, w, h });
    const image = ctx.createImageData(crop.width, crop.height);
    image.data.set(crop.pixels);
    ctx.putImageData(image, 0, 0);
  }, [h, native, nativeHeight, nativeWidth, w, x, y]);

  return (
    <button
      type="button"
      className={`storyboard-import__thumb${active ? " is-active" : ""}`}
      title={`Кадр ${index + 1}`}
      onClick={onSelect}
    >
      <canvas ref={canvasRef} width={w} height={h} aria-hidden />
      <span>{index + 1}</span>
    </button>
  );
}
