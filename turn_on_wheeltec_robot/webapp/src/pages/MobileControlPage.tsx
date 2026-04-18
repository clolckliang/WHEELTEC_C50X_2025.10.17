import { BatteryCharging, Bug, Gamepad2, Signal } from "lucide-react";

import { useControlStore, selectManualCommand } from "@/features/manual-control/model/control-store";
import { DriveModeTabs } from "@/features/manual-control/ui/DriveModeTabs";
import { EmergencyStopButton } from "@/features/manual-control/ui/EmergencyStopButton";
import { ThrottleSlider } from "@/features/manual-control/ui/ThrottleSlider";
import { VirtualJoystick } from "@/features/manual-control/ui/VirtualJoystick";
import { useFaultStore } from "@/entities/fault/model/fault-store";
import { useGamepadStore } from "@/features/gamepad/model/gamepad-store";
import { useRobotStore } from "@/entities/robot/model/robot-store";
import { useRosConnectStore } from "@/features/ros-connect/model/ros-connect-store";
import { deriveBatteryState } from "@/shared/lib/ros/adapters";
import { formatNumber, formatVoltage } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FaultSeverityBadge } from "@/entities/fault/ui/FaultSeverityBadge";

export function MobileControlPage() {
  const telemetry = useRobotStore((state) => state.telemetry);
  const fault = useFaultStore((state) => state.summary);
  const gamepad = useGamepadStore((state) => state.snapshot);
  const connection = useRosConnectStore((state) => state.status);
  const controlState = useControlStore();
  const command = selectManualCommand(controlState);
  const battery = deriveBatteryState(telemetry.batteryVoltage);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-5">
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardDescription>Mobile teleop</CardDescription>
              <CardTitle className="mt-1">Virtual Stick</CardTitle>
            </div>
            <Badge variant="info">{controlState.activeInput}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <VirtualJoystick />
            <ThrottleSlider />
            <DriveModeTabs />
            <EmergencyStopButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardDescription>当前输入与安全摘要</CardDescription>
              <CardTitle className="mt-1">Control Snapshot</CardTitle>
            </div>
            <FaultSeverityBadge severity={fault.severity} />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryPill icon={Signal} label="Connection" value={connection} />
              <SummaryPill icon={BatteryCharging} label="Battery" value={formatVoltage(telemetry.batteryVoltage)} note={battery.label} />
              <SummaryPill icon={Bug} label="Fault" value={fault.label} note={fault.advice} />
              <SummaryPill icon={Gamepad2} label="Gamepad" value={gamepad.connected ? "Ready" : "Offline"} note={gamepad.id} />
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/65 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Command Preview</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>Drive {formatNumber(command.drive)}</div>
                <div>Turn {formatNumber(command.turn)}</div>
                <div>Lateral {formatNumber(command.lateral)}</div>
                <div>Multiplier {formatNumber(command.multiplier)}</div>
                <div>Linear X {formatNumber(command.twist.linear.x)}</div>
                <div>Angular Z {formatNumber(command.twist.angular.z)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function SummaryPill({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Signal;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/65 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <div className="mt-3 text-lg font-semibold">{value}</div>
      {note ? <div className="mt-1 text-xs text-muted-foreground">{note}</div> : null}
    </div>
  );
}
