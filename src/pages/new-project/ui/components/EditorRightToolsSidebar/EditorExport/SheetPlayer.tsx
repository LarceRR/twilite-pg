import { useEffect, useRef } from "react";
import type { SubmitTpoManifest } from "@/shared/pixelObject/manifest";

type SheetPlayerProps = {
  sheetUrl: string;
  manifest: SubmitTpoManifest;
};

/** Draws the default loop from a spritesheet. drawImage does not need CORS. */
export const SheetPlayer = ({ sheetUrl, manifest }: SheetPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frameWidth, frameHeight, columns } = manifest.sheet;
  const frames = manifest.animations[0].frames;

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
    context.imageSmoothingEnabled = false;

    const image = new Image();
    let timer = 0;
    let frameIndex = 0;
    let cancelled = false;

    const draw = () => {
      const entry = frames[frameIndex];
      if (!entry || image.naturalWidth === 0) {
        return;
      }
      const sx = (entry.frame % columns) * frameWidth;
      const sy = Math.floor(entry.frame / columns) * frameHeight;
      context.clearRect(0, 0, frameWidth, frameHeight);
      context.drawImage(image, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    };

    const schedule = () => {
      if (frames.length < 2) {
        return;
      }
      const duration = frames[frameIndex]?.durationMs ?? 100;
      timer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        frameIndex = (frameIndex + 1) % frames.length;
        draw();
        schedule();
      }, duration);
    };

    image.onload = () => {
      if (cancelled) {
        return;
      }
      draw();
      schedule();
    };
    image.src = sheetUrl;

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      image.onload = null;
    };
  }, [columns, frameHeight, frameWidth, frames, sheetUrl]);

  return (
    <canvas
      ref={canvasRef}
      className="editor-export__player"
      width={frameWidth}
      height={frameHeight}
      aria-label="Превью анимации"
    />
  );
};
