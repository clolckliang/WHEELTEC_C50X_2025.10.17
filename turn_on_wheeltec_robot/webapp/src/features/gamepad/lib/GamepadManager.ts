import type { GamepadStateSnapshot } from "@/shared/types/gamepad";

type SnapshotListener = (snapshot: GamepadStateSnapshot, gamepad: Gamepad | null) => void;

export class GamepadManager {
  private animationFrame?: number;
  private listener?: SnapshotListener;
  private trackedIndex: number | null = null;

  setListener(listener: SnapshotListener) {
    this.listener = listener;
  }

  start() {
    if (this.animationFrame) {
      return;
    }
    const loop = () => {
      this.poll();
      this.animationFrame = window.requestAnimationFrame(loop);
    };
    this.animationFrame = window.requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
  }

  private poll() {
    const pad = this.findGamepad();
    if (!pad) {
      this.listener?.(
        {
          connected: false,
          index: null,
          id: "未检测到手柄",
          leftStick: { x: 0, y: 0 },
          rightStick: { x: 0, y: 0 },
          triggers: { lt: 0, rt: 0 },
          buttons: {
            a: false,
            b: false,
            x: false,
            y: false,
            lb: false,
            rb: false,
            back: false,
            start: false,
          },
          hapticsSupported: false,
          lastUpdated: Date.now(),
        },
        null,
      );
      return;
    }

    const snapshot: GamepadStateSnapshot = {
      connected: true,
      index: pad.index,
      id: pad.id || `Gamepad ${pad.index}`,
      leftStick: {
        x: pad.axes[0] ?? 0,
        y: pad.axes[1] ?? 0,
      },
      rightStick: {
        x: pad.axes[2] ?? 0,
        y: pad.axes[3] ?? 0,
      },
      triggers: {
        lt: pad.buttons[6]?.value ?? 0,
        rt: pad.buttons[7]?.value ?? 0,
      },
      buttons: {
        a: !!pad.buttons[0]?.pressed,
        b: !!pad.buttons[1]?.pressed,
        x: !!pad.buttons[2]?.pressed,
        y: !!pad.buttons[3]?.pressed,
        lb: !!pad.buttons[4]?.pressed,
        rb: !!pad.buttons[5]?.pressed,
        back: !!pad.buttons[8]?.pressed,
        start: !!pad.buttons[9]?.pressed,
      },
      hapticsSupported: Boolean((pad as Gamepad & { vibrationActuator?: unknown }).vibrationActuator),
      lastUpdated: Date.now(),
    };

    this.listener?.(snapshot, pad);
  }

  private findGamepad() {
    if (!navigator.getGamepads) {
      return null;
    }

    const pads = navigator.getGamepads();
    if (this.trackedIndex !== null && pads[this.trackedIndex]) {
      return pads[this.trackedIndex];
    }

    for (const pad of pads) {
      if (pad) {
        this.trackedIndex = pad.index;
        return pad;
      }
    }

    this.trackedIndex = null;
    return null;
  }
}
