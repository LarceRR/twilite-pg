import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { normalizeHex } from "./colorMath";
import { ColorPickerPanel } from "./ColorPickerPanel";
import {
  DEFAULT_RECENT_STORAGE_KEY,
  loadRecentColors,
  pushRecentColor,
  saveRecentColors,
} from "./recentColors";
import "./ColorPicker.scss";

export type ColorPickerProps = {
  /** Controlled value — lowercase `#rrggbb`. */
  value?: string;
  defaultValue?: string;
  /** Fires on every change while adjusting (native `input`). */
  onChange?: (hex: string) => void;
  /** Fires when the panel closes (native `change`). */
  onChangeComplete?: (hex: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  /** Shown on the trigger swatch; defaults to the current color. */
  children?: ReactNode;
  "aria-label"?: string;
  panelLabel?: string;
  recentColors?: string[];
  defaultRecentColors?: string[];
  onRecentColorsChange?: (colors: string[]) => void;
  recentStorageKey?: string;
};

function useRecentColors(
  controlled: string[] | undefined,
  defaultRecent: string[] | undefined,
  storageKey: string,
  onRecentColorsChange: ((colors: string[]) => void) | undefined,
) {
  const isControlled = controlled !== undefined;
  const [internal, setInternal] = useState<string[]>(() => {
    if (defaultRecent?.length) {
      return defaultRecent;
    }
    return loadRecentColors(storageKey);
  });

  const colors = isControlled ? controlled : internal;

  const setColors = useCallback(
    (next: string[]) => {
      if (!isControlled) {
        setInternal(next);
        saveRecentColors(storageKey, next);
      }
      onRecentColorsChange?.(next);
    },
    [isControlled, onRecentColorsChange, storageKey],
  );

  return { colors, setColors };
}

export function ColorPicker({
  value,
  defaultValue = "#000000",
  onChange,
  onChangeComplete,
  disabled = false,
  className = "",
  title,
  children,
  "aria-label": ariaLabel = "Choose color",
  panelLabel,
  recentColors: recentControlled,
  defaultRecentColors,
  onRecentColorsChange,
  recentStorageKey = DEFAULT_RECENT_STORAGE_KEY,
}: ColorPickerProps) {
  const isControlled = value !== undefined;
  const [uncontrolledHex, setUncontrolledHex] = useState(() => normalizeHex(defaultValue));
  const committedHex = normalizeHex(isControlled ? value! : uncontrolledHex);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const listboxId = useId();

  const { colors: recentColors, setColors: setRecentColors } = useRecentColors(
    recentControlled,
    defaultRecentColors,
    recentStorageKey,
    onRecentColorsChange,
  );

  const setCommittedHex = useCallback(
    (hex: string) => {
      const next = normalizeHex(hex);
      if (!isControlled) {
        setUncontrolledHex(next);
      }
      if (next !== committedHex) {
        onChange?.(next);
      }
      return next;
    },
    [committedHex, isControlled, onChange],
  );

  const openPanel = () => {
    if (disabled) {
      return;
    }
    setOpen(true);
  };

  const closePanel = useCallback(
    (reason: "dismiss" | "toggle") => {
      if (!open) {
        return;
      }
      setOpen(false);
      const finalHex = committedHex;
      if (reason === "dismiss") {
        onChangeComplete?.(finalHex);
        setRecentColors(pushRecentColor(recentColors, finalHex));
      }
    },
    [committedHex, onChangeComplete, open, recentColors, setRecentColors],
  );

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }

    const update = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const panelWidth = panel?.offsetWidth ?? 280;
      const panelHeight = panel?.offsetHeight ?? 360;
      const gap = 8;
      const padding = 8;

      let top = rect.bottom + gap;
      let left = rect.left;

      if (top + panelHeight > window.innerHeight - padding) {
        top = Math.max(padding, rect.top - panelHeight - gap);
      }
      if (left + panelWidth > window.innerWidth - padding) {
        left = Math.max(padding, window.innerWidth - panelWidth - padding);
      }

      setPos({ top, left });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel("dismiss");
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      closePanel("dismiss");
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [closePanel, open]);

  const accessibleName = `${ariaLabel} ${committedHex}`;

  const triggerContent =
    children ??
    (
      <span
        className="color-picker__default-swatch"
        style={{ backgroundColor: committedHex }}
        aria-hidden
      />
    );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`color-picker__trigger ${className}`.trim()}
        disabled={disabled}
        title={title}
        aria-label={accessibleName}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (open) {
            closePanel("dismiss");
          } else {
            openPanel();
          }
        }}
      >
        {triggerContent}
      </button>

      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              id={listboxId}
              className="color-picker__portal"
              style={{ top: pos.top, left: pos.left }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <ColorPickerPanel
                committedHex={committedHex}
                recentColors={recentColors}
                panelLabel={panelLabel}
                onLiveChange={setCommittedHex}
                onRequestClose={() => closePanel("dismiss")}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Swatch trigger helper for editor labels that expect block-level hit targets. */
export function ColorPickerSwatchTrigger({
  color,
  className,
}: {
  color: string;
  className?: string;
}): ReactElement {
  return (
    <span
      className={`color-picker__swatch-trigger ${className ?? ""}`.trim()}
      style={{ backgroundColor: normalizeHex(color) }}
    />
  );
}
