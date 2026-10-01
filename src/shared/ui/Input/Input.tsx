import "./Input.scss";
import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  ReactNode,
  Ref,
} from "react";
import { useEffect, useRef, useState } from "react";
import KeybindHint from "@/shared/ui/KeybindHint/KeybindHint";
import { commitBoundedNumber, parseInRange } from "./commitBoundedNumber";

export interface InputProps {
  icon?: ReactNode;
  placeholder?: string;
  value?: string | number;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  children?: ReactNode;
  /** Chord to show as OS-aware hint, e.g. "Mod+K". */
  keybind?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** `search` is the navbar field. `field` is a compact editor control. */
  variant?: "search" | "field";
  type?: string;
  disabled?: boolean;
  inputMode?: "decimal" | "numeric" | "text" | "search" | "email" | "tel" | "url" | "none";
  maxLength?: number;
  autoComplete?: string;
  name?: string;
  "aria-label"?: string;
  /**
   * While focused, the text is exactly what was typed, including an empty field.
   * Bounds are applied on blur or Enter. Empty or invalid text restores the last value.
   */
  commitOnBlur?: boolean;
  min?: number;
  max?: number;
  /** Text fields. Called on blur or Enter with the raw string. */
  onCommit?: (value: string) => void;
  /** Number fields. Called for an in-range value while typing, and for the clamped value on blur. */
  onNumberCommit?: (value: number) => void;
}

function asNumber(value: string | number | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function Input({
  icon,
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  className = "",
  children,
  keybind,
  inputRef,
  variant = "search",
  type = "text",
  disabled = false,
  inputMode,
  maxLength,
  autoComplete,
  name,
  "aria-label": ariaLabel,
  commitOnBlur = false,
  min,
  max,
  onCommit,
  onNumberCommit,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const focusedRef = useRef(false);
  const numeric = min !== undefined || max !== undefined;

  const setDraftValue = (next: string | null) => {
    draftRef.current = next;
    setDraft(next);
  };

  useEffect(() => {
    if (!focusedRef.current && draftRef.current !== null) {
      setDraftValue(null);
    }
  }, [value]);

  const commitDraft = () => {
    const raw = draftRef.current;
    setDraftValue(null);
    if (raw === null) {
      return;
    }
    if (numeric) {
      const next = commitBoundedNumber(raw, min, max);
      if (next !== null && next !== asNumber(value)) {
        onNumberCommit?.(next);
      }
      return;
    }
    if (raw !== String(value ?? "")) {
      onCommit?.(raw);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    focusedRef.current = true;
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    focusedRef.current = false;
    setIsFocused(false);
    if (commitOnBlur) {
      commitDraft();
    }
    onBlur?.(event);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!commitOnBlur) {
      onChange?.(event);
      return;
    }
    const next = event.target.value;
    setDraftValue(next);
    if (!numeric) {
      return;
    }
    const parsed = parseInRange(next, min, max);
    if (parsed !== null && parsed !== asNumber(value)) {
      onNumberCommit?.(parsed);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !commitOnBlur) {
      return;
    }
    if (event.key === "Escape") {
      setDraftValue(null);
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const shown = draft !== null ? draft : value === undefined ? "" : String(value);
  const clearPlaceholderOnFocus = variant === "search";

  return (
    <label
      className={`input-wrapper${variant === "field" ? " input-wrapper--field" : ""}${
        disabled ? " is-disabled" : ""
      } ${className}`.trim()}
    >
      {icon ? <span className="input-wrapper__icon">{icon}</span> : null}
      <input
        ref={inputRef}
        type={type}
        name={name}
        value={shown}
        disabled={disabled}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={commitOnBlur ? "off" : autoComplete}
        placeholder={clearPlaceholderOnFocus && isFocused ? "" : placeholder}
        onChange={handleChange}
        className="input-wrapper__input"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel ?? placeholder}
      />
      {keybind ? (
        <KeybindHint hotkey={keybind} className="input-wrapper__os-keybind" />
      ) : null}
      {children}
    </label>
  );
}
