import { BatteryCharging, GaugeCircle, Signal } from "lucide-react";

import { useControlArbitrationStore } from "@/features/control-arbitration/model/control-arbitration-store";
import { useFaultStore } from "@/entities/fault/model/fault-store";
import { useGamepadStore } from "@/features/gamepad/model/gamepad-store";
import { useRosConnectStore } from "@/features/ros-connect/model/ros-connect-store";
import { useRobotStore } from "@/entities/robot/model/robot-store";
import { deriveBatteryState } from "@/shared/lib/ros/adapters";
import { formatPercent, formatVoltage } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";

export function StatusOverview() {
  const telemetry = useRobotStore((state) => state.telemetry);
  const fault = useFaultStore((state) => state.summary);
  const gamepad = useGamepadStore((state) => state.snapshot);
  const connectionStatus = useRosConnectStore((state) => state.status);
  const clientId = useControlArbitrationStore((state) => state.clientId);
  const wantsControl = useControlArbitrationStore((state) => state.wantsControl);
  const battery = deriveBatteryState(telemetry.batteryVoltage);
  const leaseLabel =
    telemetry.controlOwnerId === clientId
      ? "Owned by this console"
      : telemetry.controlOwnerName
        ? `Owner ${telemetry.controlOwnerName}`
        : wantsControl
          ? "Waiting for lease"
          : "Observer mode";

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Connection</div>
            <Signal className="h-4 w-4 text-primary" />
          </div>
          <Badge variant={connectionStatus === "connected" ? "success" : connectionStatus === "error" ? "danger" : "info"}>
            {connectionStatus}
          </Badge>
          <p className="text-sm text-muted-foreground">rosbridge 与 CSV API 通过同一控制台统一管理。</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Battery</div>
            <BatteryCharging className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-semibold">{formatVoltage(telemetry.batteryVoltage)}</div>
          <Progress value={battery.level * 100} />
          <div className="text-sm text-muted-foreground">
            {battery.label} · {formatPercent(battery.level)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Control Status</div>
            <GaugeCircle className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-semibold">{telemetry.controlStatus}</div>
          <p className="text-sm text-muted-foreground">
            {leaseLabel} · {telemetry.controlClientCount} clients · {telemetry.controlWaitingCount} waiting
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Fault / Gamepad</div>
            <Badge variant={gamepad.connected ? "info" : "neutral"}>{gamepad.connected ? "Gamepad Ready" : "No Gamepad"}</Badge>
          </div>
          <div className="text-2xl font-semibold">{fault.label}</div>
          <p className="text-sm text-muted-foreground">{fault.advice}</p>
        </CardContent>
      </Card>
    </div>
  );
}
