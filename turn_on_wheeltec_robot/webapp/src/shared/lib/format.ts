import type { FaultSeverity } from "@/shared/types/fault";

export function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

export function formatVoltage(value: number) {
  return `${formatNumber(value, 2)} V`;
}

export function formatCurrent(value: number) {
  return `${formatNumber(value, 3)} A`;
}

export function formatSpeed(value: number) {
  return `${formatNumber(value, 2)} m/s`;
}

export function formatAngleRate(value: number) {
  return `${formatNumber(value, 2)} rad/s`;
}

export function formatPercent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }

  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remain = Math.floor(seconds % 60);
  return `${minutes}m ${remain}s`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeDate(timestamp: number) {
  if (!timestamp) {
    return "--";
  }
  return new Date(timestamp * 1000).toLocaleString();
}

export function severityTone(severity: FaultSeverity) {
  switch (severity) {
    case "normal":
      return "success";
    case "warning":
      return "warning";
    case "critical":
      return "danger";
    default:
      return "neutral";
  }
}
