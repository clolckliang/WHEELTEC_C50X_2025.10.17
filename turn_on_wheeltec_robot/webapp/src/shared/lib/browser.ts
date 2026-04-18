export function isBrowser() {
  return typeof window !== "undefined";
}

export function buildRosbridgeUrl() {
  if (!isBrowser()) {
    return "ws://127.0.0.1:9090";
  }
  return `ws://${window.location.hostname || "127.0.0.1"}:9090`;
}

export function buildApiBase() {
  if (!isBrowser()) {
    return "http://127.0.0.1:8000";
  }
  return `${window.location.protocol}//${window.location.host}`;
}

export function getSystemTheme() {
  if (!isBrowser()) {
    return "dark" as const;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
