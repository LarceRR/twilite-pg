import { useEffect, useRef } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/shared/store/editorCanvas";

type PixelGridPreviewProps = {
  pixels: Uint8ClampedArray;
  width?: number;
  height?: number;
  label?: string;
  className?: string;
};

export function PixelGridPreview({
  pixels,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
  label = "Предпросмотр на холсте",
  className = "import-pixelate__placement",
}: PixelGridPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!context) {
      return;
    }
    const image = context.createImageData(width, height);
    image.data.set(pixels);
    context.putImageData(image, 0, 0);
  }, [pixels, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={width}
      height={height}
      aria-label={label}
    />
  );
}
