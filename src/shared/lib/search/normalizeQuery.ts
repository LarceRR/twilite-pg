export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function tokenizeQuery(value: string): string[] {
  const normalized = normalizeQuery(value);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}
