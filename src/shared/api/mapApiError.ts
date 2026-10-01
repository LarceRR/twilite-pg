import { ApiError } from "@/shared/api/http";
import { isContractErrorCode, type ContractErrorCode } from "@/shared/contracts";

/** Safe Russian copy for support-facing codes. Never mirror storage keys/URLs. */
const RU_BY_CODE: Readonly<Record<ContractErrorCode, string>> = {
  MEDIA_UPLOAD_FORBIDDEN: "Недостаточно прав для загрузки файла.",
  MEDIA_OBJECT_MISSING: "Файл не найден в хранилище. Загрузите spritesheet снова.",
  MEDIA_SIZE_MISMATCH: "Размер файла не совпал с заявленным. Загрузите spritesheet снова.",
  MEDIA_CONTENT_TYPE_MISMATCH: "Тип файла не совпал с заявленным PNG.",
  MEDIA_QUOTA_EXCEEDED: "Превышена квота загрузок. Попробуйте позже.",
  PIXEL_OBJECT_INVALID_MANIFEST: "Манифест объекта не прошёл проверку.",
  PIXEL_OBJECT_NOT_FOUND: "Объект не найден или недоступен.",
  PIXEL_OBJECT_NOT_PUBLISHED: "Объект ещё не опубликован.",
  PIXEL_OBJECT_SELF_MODERATION: "Нельзя модерировать собственный объект.",
  PIXEL_OBJECT_PENDING: "Объект уже на модерации.",
  SURFACE_FULL: "На поверхности больше нет свободных мест.",
  SURFACE_METADATA_TOO_LARGE: "Слишком большие метаданные поверхности.",
  IDEMPOTENCY_CONFLICT: "Конфликт повторного запроса. Обновите страницу и попробуйте снова.",
  CONTRACT_INVALID: "Некорректный запрос.",
  STORAGE_UNAVAILABLE: "Хранилище временно недоступно. Повторите позже.",
};

const FALLBACK_FORBIDDEN = "Недостаточно прав для этого действия.";
const FALLBACK_GENERIC = "Не удалось выполнить запрос.";

export type MappedApiError = {
  message: string;
  code: string | null;
  requestId: string | null;
};

export function extractErrorCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("code" in body)) {
    return null;
  }
  const code = (body as { code: unknown }).code;
  return typeof code === "string" && code.trim().length > 0 ? code : null;
}

export function extractRequestId(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("requestId" in body)) {
    return null;
  }
  const id = (body as { requestId: unknown }).requestId;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
}

function messageForCode(code: string | null, status: number | null): string {
  if (code && isContractErrorCode(code)) {
    return RU_BY_CODE[code];
  }
  if (status === 403) {
    return FALLBACK_FORBIDDEN;
  }
  return FALLBACK_GENERIC;
}

function withRequestId(message: string, requestId: string | null): string {
  if (!requestId) {
    return message;
  }
  return `${message} (requestId: ${requestId})`;
}

/** Map API failures to safe RU copy + optional requestId. Strips storage internals. */
export function mapApiError(error: unknown, fallback = FALLBACK_GENERIC): MappedApiError {
  if (error instanceof ApiError) {
    const code = error.code ?? extractErrorCode(error.body);
    const requestId = error.requestId ?? extractRequestId(error.body);
    const base =
      code && isContractErrorCode(code)
        ? RU_BY_CODE[code]
        : error.status === 403
          ? FALLBACK_FORBIDDEN
          : sanitizeClientMessage(error.message) ?? fallback;
    return {
      message: withRequestId(base, requestId),
      code,
      requestId,
    };
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return {
      message: sanitizeClientMessage(error.message) ?? fallback,
      code: null,
      requestId: null,
    };
  }
  return { message: fallback, code: null, requestId: null };
}

export function mapApiErrorMessage(error: unknown, fallback = FALLBACK_GENERIC): string {
  return mapApiError(error, fallback).message;
}

/** Drop messages that look like storage keys / presigned URLs. */
function sanitizeClientMessage(message: string): string | null {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/https?:\/\//i.test(trimmed) || /storageKey|r2\.cloudflare|X-Amz-/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function statusFallbackMessage(status: number | null, code: string | null): string {
  return messageForCode(code, status);
}
