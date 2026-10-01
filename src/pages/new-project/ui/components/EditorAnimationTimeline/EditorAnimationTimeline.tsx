import { ChevronLeft, ChevronRight, Grid2x2, Layers, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_FRAME_DURATION_MS, MIN_FRAME_DURATION_MS } from "@/shared/pixelObject/constants";
import { MAX_FRAMES, useEditorCanvasStore } from "@/shared/store/editorCanvas";
import Input from "@/shared/ui/Input/Input";
import { FrameThumbnail } from "./FrameThumbnail";
import { frameDragShift, useFrameStripDrag } from "./useFrameStripDrag";
import "./EditorAnimationTimeline.scss";

const DROP_EASING = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";

type EditorAnimationTimelineProps = {
  onStoryboardImport?: () => void;
};

export const EditorAnimationTimeline = ({ onStoryboardImport }: EditorAnimationTimelineProps) => {
  const frames = useEditorCanvasStore((state) => state.frames);
  const activeFrameId = useEditorCanvasStore((state) => state.activeFrameId);
  const isDrawing = useEditorCanvasStore((state) => state.isDrawing);
  const isPlaying = useEditorCanvasStore((state) => state.isPlaying);
  const onionSkin = useEditorCanvasStore((state) => state.onionSkin);
  const addFrame = useEditorCanvasStore((state) => state.addFrame);
  const deleteFrame = useEditorCanvasStore((state) => state.deleteFrame);
  const setActiveFrame = useEditorCanvasStore((state) => state.setActiveFrame);
  const moveFrame = useEditorCanvasStore((state) => state.moveFrame);
  const reorderFrame = useEditorCanvasStore((state) => state.reorderFrame);
  const setFrameDuration = useEditorCanvasStore((state) => state.setFrameDuration);
  const playPreview = useEditorCanvasStore((state) => state.playPreview);
  const pausePlayback = useEditorCanvasStore((state) => state.pausePlayback);
  const toggleOnionSkin = useEditorCanvasStore((state) => state.toggleOnionSkin);
  const [error, setError] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<Map<string, DOMRect> | null>(null);

  const activeIndex = frames.findIndex((frame) => frame.id === activeFrameId);
  const active = frames[activeIndex];
  const durationMs = active?.durationMs ?? MIN_FRAME_DURATION_MS;
  const busy = isDrawing || isPlaying;

  const report = (result: { ok: true } | { ok: false; reason: string }) => {
    setError(result.ok ? null : result.reason);
  };

  const captureFlip = () => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const rects = new Map<string, DOMRect>();
    strip.querySelectorAll<HTMLElement>("[data-frame-id]").forEach((node) => {
      const id = node.dataset.frameId;
      if (id) {
        rects.set(id, node.getBoundingClientRect());
      }
    });
    flipRef.current = rects;
  };

  const { drag, bindFrame } = useFrameStripDrag({
    count: frames.length,
    disabled: busy,
    stripRef,
    onDrop: (fromIndex, toIndex) => {
      captureFlip();
      if (fromIndex !== toIndex) {
        report(reorderFrame(fromIndex, toIndex));
      }
    },
  });

  useLayoutEffect(() => {
    const previous = flipRef.current;
    const strip = stripRef.current;
    if (!previous || !strip) {
      return;
    }
    flipRef.current = null;
    const nodes = [...strip.querySelectorAll<HTMLElement>("[data-frame-id]")];
    nodes.forEach((node) => {
      const before = node.dataset.frameId ? previous.get(node.dataset.frameId) : undefined;
      if (!before) {
        return;
      }
      const after = node.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        return;
      }
      node.style.transition = "none";
      node.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    requestAnimationFrame(() => {
      nodes.forEach((node) => {
        if (!node.style.transform) {
          return;
        }
        node.style.transition = DROP_EASING;
        node.style.transform = "";
      });
    });
  });

  useEffect(() => {
    if (!isPlaying || frames.length < 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      const latest = useEditorCanvasStore.getState();
      const index = latest.frames.findIndex((frame) => frame.id === latest.activeFrameId);
      const next = latest.frames[(index + 1) % latest.frames.length];
      if (!next) {
        latest.pausePlayback();
        return;
      }
      const result = latest.setActiveFrame(next.id, { keepPlaying: true });
      if (!result.ok) {
        latest.pausePlayback();
      }
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [activeFrameId, durationMs, frames.length, isPlaying]);

  useEffect(() => () => useEditorCanvasStore.getState().pausePlayback(), []);

  const slot = drag ? drag.size + drag.gap : 0;

  return (
    <div className="editor-animation-timeline">
      <div className="editor-animation-timeline__toolbar">
        <button
          type="button"
          className="editor-animation-timeline__tool-btn editor-animation-timeline__tool-btn--labeled"
          title="Импорт раскадровки из одного изображения"
          disabled={busy || !onStoryboardImport}
          onClick={() => onStoryboardImport?.()}
        >
          <Grid2x2 size={16} aria-hidden />
          <span>Раскадровка</span>
        </button>
        <button
          type="button"
          className="editor-animation-timeline__tool-btn"
          title="Добавить кадр — копия текущего"
          disabled={busy || frames.length >= MAX_FRAMES}
          onClick={() => report(addFrame())}
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          className="editor-animation-timeline__tool-btn"
          title="Удалить кадр"
          disabled={busy || frames.length <= 1}
          onClick={() => active && report(deleteFrame(active.id))}
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          className="editor-animation-timeline__tool-btn"
          title="Сдвинуть кадр раньше"
          disabled={busy || activeIndex <= 0}
          onClick={() => report(moveFrame(-1))}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="editor-animation-timeline__tool-btn"
          title="Сдвинуть кадр позже"
          disabled={busy || activeIndex < 0 || activeIndex >= frames.length - 1}
          onClick={() => report(moveFrame(1))}
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="editor-animation-timeline__tool-btn"
          title={isPlaying ? "Пауза" : "Проиграть цикл"}
          aria-pressed={isPlaying}
          disabled={isDrawing}
          onClick={() => (isPlaying ? pausePlayback() : playPreview())}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          className={`editor-animation-timeline__tool-btn${onionSkin ? " is-active" : ""}`}
          title="Калька соседних кадров"
          aria-pressed={onionSkin}
          onClick={() => toggleOnionSkin()}
        >
          <Layers size={16} />
        </button>
        <div className="editor-animation-timeline__duration">
          <span>мс</span>
          <Input
            variant="field"
            className="editor-animation-timeline__duration-input"
            value={durationMs}
            commitOnBlur
            min={MIN_FRAME_DURATION_MS}
            max={MAX_FRAME_DURATION_MS}
            inputMode="numeric"
            disabled={!active || isPlaying}
            aria-label="Длительность кадра в миллисекундах"
            onNumberCommit={(ms) => {
              if (active) {
                setFrameDuration(active.id, ms);
              }
            }}
          />
        </div>
        <span className="editor-animation-timeline__count">
          {Math.max(activeIndex, 0) + 1}/{frames.length}
          <span>
            {" "}
            · {frames.length}/{MAX_FRAMES}
          </span>
        </span>
      </div>
      {error ? <div className="editor-animation-timeline__error">{error}</div> : null}
      <div
        ref={stripRef}
        className={`editor-animation-timeline__strip${drag ? " is-dragging" : ""}`}
        role="listbox"
        aria-label="Кадры"
      >
        {frames.map((frame, index) => {
          const dragging = drag?.originIndex === index;
          const shift = drag ? frameDragShift(index, drag.originIndex, drag.hoverIndex) : 0;
          const transform = dragging
            ? `translateX(${drag.dx}px) scale(1.04)`
            : shift !== 0
              ? `translateX(${shift * slot}px)`
              : undefined;
          return (
            <button
              key={frame.id}
              type="button"
              role="option"
              data-frame-id={frame.id}
              aria-selected={frame.id === activeFrameId}
              draggable={false}
              className={`editor-animation-timeline__frame${
                frame.id === activeFrameId ? " is-active" : ""
              }${dragging ? " is-dragging" : ""}`}
              title={`${index + 1}, ${frame.durationMs} мс. Перетащите, чтобы изменить порядок`}
              style={{
                transform,
                transformOrigin: dragging ? "left center" : undefined,
              }}
              {...bindFrame(index)}
              onClick={() => report(setActiveFrame(frame.id))}
            >
              <FrameThumbnail frameId={frame.id} />
              <span className="editor-animation-timeline__index">{index + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
