import { Wifi, WifiOff } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import type { RosConnectionStatus } from "@/shared/types/ros";
import { Badge } from "@/shared/ui/badge";

const tones: Record<RosConnectionStatus, { variant: "neutral" | "info" | "danger" | "warning" | "success"; label: string }> = {
  disconnected: { variant: "neutral", label: "Disconnected" },
  connecting: { variant: "info", label: "Connecting" },
  connected: { variant: "success", label: "Connected" },
  reconnecting: { variant: "warning", label: "Reconnecting" },
  error: { variant: "danger", label: "Error" },
};

export function ConnectionBadge({ status }: { status: RosConnectionStatus }) {
  const tone = tones[status];
  const Icon = status === "connected" ? Wifi : WifiOff;

  return (
    <Badge variant={tone.variant} className={cn("px-3.5 py-1.5 normal-case tracking-normal")}>
      <Icon className="h-3.5 w-3.5" />
      {tone.label}
    </Badge>
  );
}
