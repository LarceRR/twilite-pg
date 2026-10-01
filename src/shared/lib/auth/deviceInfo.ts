export type WebDeviceInfo = {
  platform: "web";
  model: string;
  appVersion: "tpg-web";
};

export function webDeviceInfo(): WebDeviceInfo {
  return {
    platform: "web",
    model: typeof navigator === "undefined" ? "tpg-web" : navigator.userAgent.slice(0, 120),
    appVersion: "tpg-web",
  };
}
