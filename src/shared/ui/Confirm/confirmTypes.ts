export type ConfirmKind = "confirm" | "alert";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action. */
  danger?: boolean;
};

export type AlertOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
};

export type ConfirmRequest = {
  id: string;
  kind: ConfirmKind;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
};

export const CONFIRM_DEFAULTS = {
  confirmLabel: "Подтвердить",
  cancelLabel: "Отмена",
  alertConfirmLabel: "ОК",
} as const;
