import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "path";
import { defineConfig, loadEnv } from "vite";

function securityHeaders(isDev: boolean, apiBaseUrl: string): Record<string, string> {
  const connect = ["'self'"];
  if (isDev) {
    connect.push(
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "ws://localhost:*",
      "ws://127.0.0.1:*",
    );
  } else if (apiBaseUrl.length > 0) {
    connect.push(apiBaseUrl);
  }

  let apiOrigin = "";
  if (apiBaseUrl.length > 0) {
    try {
      apiOrigin = new URL(apiBaseUrl).origin;
    } catch {
      apiOrigin = "";
    }
  }

  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self'";

  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob:${apiOrigin.length > 0 ? ` ${apiOrigin}` : ""}${isDev ? " http://localhost:3000 http://127.0.0.1:3000" : ""}`,
      `connect-src ${connect.join(" ")}`,
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "worker-src 'none'",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isDev = mode === "development";
  const apiBaseUrl = (env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const headers = securityHeaders(isDev, apiBaseUrl);

  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      headers,
      proxy: {
        "/v1": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    preview: {
      headers,
    },
  };
});
