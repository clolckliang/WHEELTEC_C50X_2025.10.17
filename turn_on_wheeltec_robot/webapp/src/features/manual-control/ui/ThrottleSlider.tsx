import { Gauge } from "lucide-react";

import { useControlStore } from "@/features/manual-control/model/control-store";
import { robotConfig } from "@/shared/config/robot";

export function ThrottleSlider() {
  const speedMultiplier = useControlStore((state) => state.speedMultiplier);
  const setSpeedMultiplier = useControlStore((state) => state.setSpeedMultiplier);

  return (
    <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Gauge className="h-4 w-4 text-primary" />
          油门倍率
        </div>
        <div className="text-sm font-semibold text-muted-foreground">{speedMultiplier.toFixed(1)}x</div>
      </div>
      <input
        type="range"
        min={robotConfig.speedMultiplier.min}
        max={robotConfig.speedMultiplier.max}
        step={robotConfig.speedMultiplier.step}
        value={speedMultiplier}
        onChange={(event) => setSpeedMultiplier(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[hsl(var(--primary))]"
      />
    </div>
  );
}
