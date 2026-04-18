import { Gamepad2, Vibrate } from "lucide-react";

import { useGamepadStore } from "@/features/gamepad/model/gamepad-store";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function GamepadStatusCard() {
  const snapshot = useGamepadStore((state) => state.snapshot);

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardDescription>Xbox / Gamepad 优先控制源</CardDescription>
          <CardTitle className="mt-1">Gamepad Status</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={snapshot.connected ? "success" : "neutral"}>
            <Gamepad2 className="h-3.5 w-3.5" />
            {snapshot.connected ? "Ready" : "Offline"}
          </Badge>
          <Badge variant={snapshot.hapticsSupported ? "info" : "neutral"}>
            <Vibrate className="h-3.5 w-3.5" />
            {snapshot.hapticsSupported ? "Haptics" : "No Haptics"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium">{snapshot.id}</div>
          <p className="text-xs text-muted-foreground">A 停车 / B 急停 / X 解锁 / Y Turbo / LB RB 调速</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Left Stick</div>
            <div className="mt-2 text-sm">X {snapshot.leftStick.x.toFixed(2)}</div>
            <div className="text-sm">Y {snapshot.leftStick.y.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Triggers / Strafe</div>
            <div className="mt-2 text-sm">LT {snapshot.triggers.lt.toFixed(2)}</div>
            <div className="text-sm">RT {snapshot.triggers.rt.toFixed(2)}</div>
            <div className="text-sm">RX {snapshot.rightStick.x.toFixed(2)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(snapshot.buttons).map(([key, value]) => (
            <Badge key={key} variant={value ? "info" : "neutral"} className="tracking-[0.08em]">
              {key.toUpperCase()}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
