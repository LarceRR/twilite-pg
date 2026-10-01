export type OperatingSystem = "mac" | "windows" | "linux" | "unknown";

export function detectOperatingSystem(
  platform = typeof navigator !== "undefined" ? navigator.platform : "",
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
): OperatingSystem {
  const value = `${platform} ${userAgent}`.toLowerCase();

  if (/mac|iphone|ipad|ipod/.test(value)) return "mac";
  if (/win/.test(value)) return "windows";
  if (/linux|android/.test(value)) return "linux";

  return "unknown";
}

export function isAppleOS(os: OperatingSystem): boolean {
  return os === "mac";
}
