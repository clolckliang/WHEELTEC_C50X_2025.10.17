import { useRef, type PointerEvent } from "react";

import { useControlStore } from "@/features/manual-control/model/control-store";
import { cn } from "@/shared/lib/cn";

export function VirtualJoystick({ className }: { className?: string }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const axes = useControlStore((state) => state.axes);
  const setAxes = useControlStore((state) => state.setAxes);
  const setTouchActive = useControlStore((state) => state.setTouchActive);
  const stop = useControlStore((state) => state.stop);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    const rect = shell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const limit = rect.width * 0.32;
    const length = Math.hypot(dx, dy);
    const nextX = length > limit ? dx / length : dx / limit;
    const nextY = length > limit ? dy / length : dy / limit;

    setAxes(
      {
        x: Math.max(-1, Math.min(1, nextX)),
        y: Math.max(-1, Math.min(1, nextY)),
      },
      "touch",
    );
  };

  const start = (event: PointerEvent<HTMLDivElement>) => {
    setTouchActive(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX, event.clientY);
  };

  const end = () => {
    setTouchActive(false);
    stop("touch");
  };

  return (
    <div
      ref={shellRef}
      onPointerDown={start}
      onPointerMove={(event) => {
        if (useControlStore.getState().touchActive) {
          updateFromPointer(event.clientX, event.clientY);
        }
      }}
      onPointerUp={end}
      onPointerCancel={end}
      className={cn(
        "relative aspect-square w-full touch-none overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-white/70 via-cyan-100/30 to-slate-100/50 dark:from-slate-900/90 dark:via-cyan-950/30 dark:to-slate-900/60",
        className,
      )}
    >
      <div className="absolute inset-x-1/2 top-0 h-full w-px -translate-x-1/2 bg-border/80" />
      <div className="absolute inset-y-1/2 left-0 h-px w-full -translate-y-1/2 bg-border/80" />
      <div
        className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-sky-500 to-cyan-700 shadow-2xl shadow-sky-500/25 transition-transform duration-75"
        style={{
          transform: `translate(calc(-50% + ${axes.x * 32}%), calc(-50% + ${axes.y * 32}%))`,
        }}
      />
      <div className="absolute bottom-4 left-4 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
        上下 = 速度 / 左右 = 转向
      </div>
    </div>
  );
}
