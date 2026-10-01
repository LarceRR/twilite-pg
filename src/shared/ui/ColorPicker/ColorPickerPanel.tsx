import { ChevronDown, Pipette, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Input from "@/shared/ui/Input/Input";
import { COLOR_FORMATS, formatColorField, parseColorField, type ColorFormat } from "./colorFormat";
import { hsvToHex, normalizeHex } from "./colorMath";
import { useColorPickerPanelState } from "./useColorPickerPanelState";

type ColorPickerPanelProps = {
  committedHex: string;
  recentColors: readonly string[];
  onLiveChange: (hex: string) => void;
  onRequestClose: () => void;
  panelLabel?: string;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return 100;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function supportsEyeDropper(): boolean {
  return typeof window !== "undefined" && "EyeDropper" in window;
}

export function ColorPickerPanel({
  committedHex,
  recentColors,
  onLiveChange,
  onRequestClose,
  panelLabel = "Color picker",
}: ColorPickerPanelProps) {
  const areaId = useId();
  const hueId = useId();
  const alphaId = useId();
  const { hsv, setHue, setSaturationValue, previewHex } = useColorPickerPanelState({
    committedHex,
    open: true,
  });

  const [opacity, setOpacity] = useState(100);
  const [format, setFormat] = useState<ColorFormat>("hex");
  const [formatOpen, setFormatOpen] = useState(false);
  const formatRef = useRef<HTMLDivElement>(null);

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);
  const draggingSv = useRef(false);
  const draggingHue = useRef(false);
  const draggingAlpha = useRef(false);

  const emitIfChanged = useCallback(
    (hex: string | null) => {
      if (hex) {
        onLiveChange(hex);
      }
    },
    [onLiveChange],
  );

  const updateSvFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const node = svRef.current;
      if (!node) {
        return;
      }
      const rect = node.getBoundingClientRect();
      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      emitIfChanged(setSaturationValue(x * 100, (1 - y) * 100));
    },
    [emitIfChanged, setSaturationValue],
  );

  const updateHueFromPointer = useCallback(
    (clientX: number) => {
      const node = hueRef.current;
      if (!node) {
        return;
      }
      const rect = node.getBoundingClientRect();
      const x = clamp01((clientX - rect.left) / rect.width);
      emitIfChanged(setHue(x * 360));
    },
    [emitIfChanged, setHue],
  );

  const updateAlphaFromPointer = useCallback((clientX: number) => {
    const node = alphaRef.current;
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    const x = clamp01((clientX - rect.left) / rect.width);
    setOpacity(clampOpacity(x * 100));
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (draggingSv.current) {
        updateSvFromPointer(event.clientX, event.clientY);
      }
      if (draggingHue.current) {
        updateHueFromPointer(event.clientX);
      }
      if (draggingAlpha.current) {
        updateAlphaFromPointer(event.clientX);
      }
    };
    const onUp = () => {
      draggingSv.current = false;
      draggingHue.current = false;
      draggingAlpha.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [updateAlphaFromPointer, updateHueFromPointer, updateSvFromPointer]);

  useEffect(() => {
    if (!formatOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (formatRef.current?.contains(event.target as Node)) {
        return;
      }
      setFormatOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [formatOpen]);

  const pureHue = hsvToHex({ h: hsv.h, s: 100, v: 100 });
  const colorFieldValue = formatColorField(previewHex, opacity, format);
  const formatLabel = COLOR_FORMATS.find((entry) => entry.id === format)?.label ?? "HEX";

  const handleEyedropper = async () => {
    if (!supportsEyeDropper()) {
      return;
    }
    try {
      // @ts-expect-error EyeDropper is not in all TS libs yet.
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        emitIfChanged(normalizeHex(result.sRGBHex));
      }
    } catch {
      // User cancelled.
    }
  };

  const handleRecentPick = (hex: string) => {
    emitIfChanged(normalizeHex(hex));
  };

  const applyParsedField = (raw: string) => {
    const parsed = parseColorField(raw, format, opacity);
    if (!parsed) {
      return;
    }
    setOpacity(parsed.alphaPercent);
    emitIfChanged(parsed.hex);
  };

  const svThumbX = `${hsv.s}%`;
  const svThumbY = `${100 - hsv.v}%`;
  const hueThumbX = `${(hsv.h / 360) * 100}%`;
  const alphaThumbX = `${opacity}%`;

  return (
    <div className="color-picker-panel" role="dialog" aria-label={panelLabel}>
      <header className="color-picker-panel__header">
        <div className="color-picker-panel__tabs" role="tablist">
          <span className="color-picker-panel__tab color-picker-panel__tab--active" role="tab" aria-selected>
            Custom
          </span>
          <span className="color-picker-panel__tab color-picker-panel__tab--muted" role="tab" aria-selected={false}>
            Libraries
          </span>
        </div>
        <button
          type="button"
          className="color-picker-panel__icon-btn"
          onClick={onRequestClose}
          aria-label="Close color picker"
        >
          <X size={14} />
        </button>
      </header>

      <div className="color-picker-panel__body">
        <div
          ref={svRef}
          id={areaId}
          className="color-picker-panel__sv"
          style={{
            backgroundColor: pureHue,
            backgroundImage:
              "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
          }}
          role="slider"
          aria-label="Saturation and brightness"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsv.s)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault();
            draggingSv.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateSvFromPointer(event.clientX, event.clientY);
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 10 : 1;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              emitIfChanged(setSaturationValue(Math.max(0, hsv.s - step), hsv.v));
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              emitIfChanged(setSaturationValue(Math.min(100, hsv.s + step), hsv.v));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              emitIfChanged(setSaturationValue(hsv.s, Math.min(100, hsv.v + step)));
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              emitIfChanged(setSaturationValue(hsv.s, Math.max(0, hsv.v - step)));
            }
          }}
        >
          <span className="color-picker-panel__sv-thumb" style={{ left: svThumbX, top: svThumbY }} />
        </div>

        <div className="color-picker-panel__sliders">
          <button
            type="button"
            className="color-picker-panel__eyedropper"
            onClick={() => void handleEyedropper()}
            disabled={!supportsEyeDropper()}
            aria-label="Pick color from screen"
            title={supportsEyeDropper() ? "Eyedropper" : "Eyedropper not supported in this browser"}
          >
            <Pipette size={14} />
          </button>

          <div className="color-picker-panel__slider-stack">
            <div
              ref={hueRef}
              id={hueId}
              className="color-picker-panel__hue"
              role="slider"
              aria-label="Hue"
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(hsv.h)}
              tabIndex={0}
              onPointerDown={(event) => {
                event.preventDefault();
                draggingHue.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                updateHueFromPointer(event.clientX);
              }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 15 : 1;
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  emitIfChanged(setHue(Math.max(0, hsv.h - step)));
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  emitIfChanged(setHue(Math.min(360, hsv.h + step)));
                }
              }}
            >
              <span className="color-picker-panel__slider-thumb" style={{ left: hueThumbX }} />
            </div>

            <div
              ref={alphaRef}
              id={alphaId}
              className="color-picker-panel__alpha"
              role="slider"
              aria-label="Opacity"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={opacity}
              tabIndex={0}
              onPointerDown={(event) => {
                event.preventDefault();
                draggingAlpha.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                updateAlphaFromPointer(event.clientX);
              }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 10 : 1;
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  setOpacity((value) => clampOpacity(value - step));
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  setOpacity((value) => clampOpacity(value + step));
                }
              }}
            >
              <div className="color-picker-panel__alpha-track">
                <div
                  className="color-picker-panel__alpha-fill"
                  style={{
                    background: `linear-gradient(to right, transparent, ${previewHex})`,
                  }}
                />
              </div>
              <span className="color-picker-panel__slider-thumb" style={{ left: alphaThumbX }} />
            </div>
          </div>
        </div>

        <div className="color-picker-panel__fields">
          <div className="color-picker-panel__format" ref={formatRef}>
            <button
              type="button"
              className="color-picker-panel__format-trigger"
              aria-haspopup="listbox"
              aria-expanded={formatOpen}
              onClick={() => setFormatOpen((open) => !open)}
            >
              <span>{formatLabel}</span>
              <ChevronDown size={12} aria-hidden />
            </button>
            {formatOpen ? (
              <ul className="color-picker-panel__format-menu" role="listbox" aria-label="Color format">
                {COLOR_FORMATS.map((entry) => (
                  <li key={entry.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={entry.id === format}
                      className={
                        entry.id === format
                          ? "color-picker-panel__format-option color-picker-panel__format-option--active"
                          : "color-picker-panel__format-option"
                      }
                      onClick={() => {
                        setFormat(entry.id);
                        setFormatOpen(false);
                      }}
                    >
                      {entry.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Input
            key={format}
            variant="field"
            className="color-picker-panel__hex-input"
            value={colorFieldValue}
            commitOnBlur
            aria-label={`${formatLabel} value`}
            onCommit={applyParsedField}
          />
          <Input
            variant="field"
            className="color-picker-panel__opacity-input"
            value={opacity}
            commitOnBlur
            min={0}
            max={100}
            inputMode="numeric"
            aria-label="Opacity percent"
            onNumberCommit={(value) => setOpacity(clampOpacity(value))}
          />
          <span className="color-picker-panel__percent">%</span>
        </div>

        <div className="color-picker-panel__recent" role="list" aria-label="Recent colors">
          {recentColors.map((hex) => (
            <button
              key={hex}
              type="button"
              className="color-picker-panel__recent-swatch"
              style={{ backgroundColor: hex }}
              role="listitem"
              aria-label={hex}
              aria-pressed={normalizeHex(hex) === normalizeHex(previewHex)}
              onClick={() => handleRecentPick(hex)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
