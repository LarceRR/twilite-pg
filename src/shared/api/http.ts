import { env } from "@/shared/config/env";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly code: string | null;
  readonly requestId: string | null;

  constructor(
    message: string,
    status: number,
    body: unknown,
    code: string | null = null,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.code = code;
    this.requestId = requestId;
  }
}

type RefreshRunner = () => Promise<boolean>;

let refreshRunner: RefreshRunner | null = null;

/** Session layer registers a single-flight refresh to avoid an import cycle. */
export function registerSessionRefresh(runner: RefreshRunner | null): void {
  refreshRunner = runner;
}

/** Cookie session: browser sends httpOnly cookies, JS never sees the tokens. */
export async function apiFetch(path: string, init?: RequestInit, retry = true): Promise<Response> {
  const headers = new Headers(init?.headers);
  const isRefresh = path.startsWith("/v1/auth/refresh");

  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && retry && !isRefresh && refreshRunner) {
    const refreshed = await refreshRunner();
    if (refreshed) {
      return apiFetch(path, init, false);
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = await response.text().catch(() => null);
  }
  const message =
    typeof body === "object" && body !== null && "message" in body
      ? String((body as { message: unknown }).message)
      : `HTTP ${response.status}`;
  const code =
    typeof body === "object" && body !== null && "code" in body
      ? String((body as { code: unknown }).code)
      : null;
  const requestId =
    typeof body === "object" && body !== null && "requestId" in body
      ? String((body as { requestId: unknown }).requestId)
      : null;
  return new ApiError(
    message,
    response.status,
    body,
    code && code.length > 0 ? code : null,
    requestId && requestId.length > 0 ? requestId : null,
  );
}
