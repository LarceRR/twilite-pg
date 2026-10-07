import {
  CONFIRM_DEFAULTS,
  type AlertOptions,
  type ConfirmKind,
  type ConfirmOptions,
  type ConfirmRequest,
} from "./confirmTypes";

let nextId = 0;

export function createConfirmId(): string {
  nextId += 1;
  return `confirm-${nextId}`;
}

/** Test helper — keeps ids stable across suites. */
export function __resetConfirmIdCounterForTests(): void {
  nextId = 0;
}

export function normalizeConfirmInput(input: string | ConfirmOptions): ConfirmOptions {
  if (typeof input === "string") {
    return { title: input };
  }
  return input;
}

export function normalizeAlertInput(input: string | AlertOptions): AlertOptions {
  if (typeof input === "string") {
    return { title: input };
  }
  return input;
}

export function buildConfirmRequest(
  kind: ConfirmKind,
  options: ConfirmOptions | AlertOptions,
): ConfirmRequest {
  const confirmLabel =
    options.confirmLabel ??
    (kind === "alert" ? CONFIRM_DEFAULTS.alertConfirmLabel : CONFIRM_DEFAULTS.confirmLabel);

  return {
    id: createConfirmId(),
    kind,
    title: options.title,
    description: options.description,
    confirmLabel,
    cancelLabel:
      "cancelLabel" in options && options.cancelLabel
        ? options.cancelLabel
        : CONFIRM_DEFAULTS.cancelLabel,
    danger: "danger" in options ? Boolean(options.danger) : false,
  };
}
