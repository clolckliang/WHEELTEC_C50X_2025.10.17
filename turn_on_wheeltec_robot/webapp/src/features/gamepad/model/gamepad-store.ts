import { create } from "zustand";

import type { GamepadStateSnapshot } from "@/shared/types/gamepad";

interface GamepadState {
  snapshot: GamepadStateSnapshot;
  setSnapshot: (snapshot: GamepadStateSnapshot) => void;
}

const emptySnapshot: GamepadStateSnapshot = {
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
};

export const useGamepadStore = create<GamepadState>((set) => ({
  snapshot: emptySnapshot,
  setSnapshot: (snapshot) => set({ snapshot }),
}));
