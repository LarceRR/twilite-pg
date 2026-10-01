/** Public env for the SPA. Vite only exposes VITE_* keys. */
export const env = {
  /** Backend origin, e.g. http://localhost:3000 — empty means same-origin / Vite proxy. */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '',
};
