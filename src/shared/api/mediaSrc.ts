import { env } from "@/shared/config/env";

/** Prefix API paths so <img> hits the backend, including the Vite /v1 proxy. */
export function mediaSrc(url: string): string {
  if (url.startsWith("/")) {
    return `${env.apiBaseUrl}${url}`;
  }
  return url;
}

/** Cross-origin API images must send the session cookie. */
export function mediaCrossOrigin(url: string): "use-credentials" | undefined {
  return mediaSrc(url).startsWith("http") ? "use-credentials" : undefined;
}
