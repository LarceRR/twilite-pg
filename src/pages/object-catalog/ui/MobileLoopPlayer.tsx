import { useEffect, useRef, useState } from "react";
import { getPixelObjectMobile } from "@/shared/api/pixelObjects";
import {
  createMobileSurface,
  isSupportedTpoMajor,
  nextLoopIndex,
  sheetFrameOrigin,
  type DecodedSheet,
} from "@/shared/pixelObject/mobileRuntime";

type MobileLoopPlayerProps = {
  objectId: string;
};

type LiveSheet = DecodedSheet & {
  source: CanvasImageSource;
};

/** Same approach as SheetPlayer: img src uses img-src, not fetch/connect-src + bucket CORS. */
async function decodeSheet(sheetUrl: string): Promise<LiveSheet> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Не удалось декодировать spritesheet"));
    element.src = sheetUrl;
  });
  return {
    source: image,
    close: () => {
      image.onload = null;
      image.src = "";
    },
  };
}

/**
 * Mobile lifecycle: fetch the DTO and decode the sheet only while the card
 * is on screen. Leaving the screen stops the ticker and releases the decode.
 */
export const MobileLoopPlayer = ({ objectId }: MobileLoopPlayerProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(Boolean(entry?.isIntersecting));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas) {
      return;
    }

    let stopped = false;
    let timer = 0;
    const surface = createMobileSurface();
    const context = canvas.getContext("2d");

    const releaseCanvas = () => {
      window.clearTimeout(timer);
      if (!context || typeof context.clearRect !== "function") {
        return;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
    };

    const run = async () => {
      try {
        const dto = await getPixelObjectMobile(objectId);
        if (stopped) {
          return;
        }
        const decoded = await surface.mount(dto.format, () => decodeSheet(dto.sheetUrl));
        if (stopped || !decoded || !("source" in decoded)) {
          if (!stopped && !isSupportedTpoMajor(dto.format)) {
            setMessage("Мобильный плеер не поддерживает эту версию формата.");
          }
          return;
        }
        const live = decoded as LiveSheet;
        if (!context || typeof context.drawImage !== "function") {
          return;
        }
        setMessage(null);
        const { frameWidth, frameHeight, columns } = dto.sheet;
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        context.imageSmoothingEnabled = false;
        const clip = dto.animations[0]?.frames ?? [];
        let index = 0;

        const draw = () => {
          const entry = clip[index];
          if (!entry) {
            return;
          }
          const { sx, sy } = sheetFrameOrigin(entry.frame, columns, frameWidth, frameHeight);
          context.clearRect(0, 0, frameWidth, frameHeight);
          context.drawImage(
            live.source,
            sx,
            sy,
            frameWidth,
            frameHeight,
            0,
            0,
            frameWidth,
            frameHeight,
          );
        };

        const schedule = () => {
          if (stopped) {
            return;
          }
          draw();
          if (clip.length < 2) {
            return;
          }
          const duration = clip[index]?.durationMs ?? 100;
          timer = window.setTimeout(() => {
            index = nextLoopIndex(index, clip.length);
            schedule();
          }, duration);
        };
        schedule();
      } catch (caught) {
        if (!stopped) {
          setMessage(caught instanceof Error ? caught.message : "Не удалось загрузить объект");
        }
      }
    };

    void run();
    return () => {
      stopped = true;
      surface.unmount();
      releaseCanvas();
    };
  }, [objectId, visible]);

  return (
    <div ref={hostRef} className="mobile-loop">
      <canvas ref={canvasRef} width={160} height={160} aria-label="Цикл объекта" />
      {message ? <p className="mobile-loop__message">{message}</p> : null}
    </div>
  );
};
