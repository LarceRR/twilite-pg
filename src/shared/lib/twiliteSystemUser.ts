/** Seeded system account that inherits soft-deleted projects and objects (mirrors backend). */
export const TWILITE_SYSTEM_USER_EMAIL = "twilite@app.ru";

export function isTwiliteSystemUser(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim().toLowerCase() === TWILITE_SYSTEM_USER_EMAIL;
}
