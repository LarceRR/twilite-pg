const LOGIN_PATH = "/log-in";

/** Only same-origin relative paths. Blocks `//evil` and auth loops. */
export function safeInternalPath(value: string | null | undefined, fallback = "/"): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  const path = value.trim();

  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }

  if (path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}?`) || path.startsWith(`${LOGIN_PATH}/`)) {
    return fallback;
  }

  return path;
}
