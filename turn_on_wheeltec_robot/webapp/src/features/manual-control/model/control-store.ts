import { create } from "zustand";

import { robotConfig } from "@/shared/config/robot";
import type { AxisInput, DriveMode, InputSource, ManualCommand } from "@/shared/types/control";

interface ControlState {
  axes: AxisInput;
  lateral: number;
  activeInput: InputSource;
  driveMode: DriveMode;
  turbo: boolean;
  speedMultiplier: number;
  touchActive: boolean;
  estopActive: boolean;
  setAxes: (axes: AxisInput, source: InputSource) => void;
  setLateral: (value: number, source: InputSource) => void;
  setTouchActive: (active: boolean) => void;
  setSpeedMultiplier: (value: number) => void;
  nudgeSpeedMultiplier: (delta: number) => void;
  setTurbo: (active: boolean) => void;
  toggleTurbo: () => void;
  stop: (source?: InputSource) => void;
  setDriveMode: (mode: DriveMode) => void;
  setEstopActive: (active: boolean) => void;
}

export const useControlStore = create<ControlState>((set) => ({
  axes: { x: 0, y: 0 },
  lateral: 0,
  activeInput: "touch",
  driveMode: "standard",
  turbo: false,
  speedMultiplier: robotConfig.speedMultiplier.initial,
  touchActive: false,
  estopActive: false,
  setAxes: (axes, source) => set({ axes, activeInput: source }),
  setLateral: (value, source) => set({ lateral: value, activeInput: source }),
  setTouchActive: (touchActive) => set({ touchActive }),
  setSpeedMultiplier: (speedMultiplier) =>
    set({
      speedMultiplier: Math.max(
        robotConfig.speedMultiplier.min,
        Math.min(robotConfig.speedMultiplier.max, speedMultiplier),
      ),
    }),
  nudgeSpeedMultiplier: (delta) =>
    set((state) => ({
      speedMultiplier: Math.max(
        robotConfig.speedMultiplier.min,
        Math.min(robotConfig.speedMultiplier.max, +(state.speedMultiplier + delta).toFixed(1)),
      ),
    })),
  setTurbo: (turbo) => set({ turbo }),
  toggleTurbo: () => set((state) => ({ turbo: !state.turbo })),
  stop: (source = "touch") => set({ axes: { x: 0, y: 0 }, lateral: 0, activeInput: source }),
  setDriveMode: (driveMode) => set({ driveMode }),
  setEstopActive: (estopActive) => set({ estopActive }),
}));

function linearAxis(value: number, deadzone: number) {
  const magnitude = Math.abs(value);
  if (magnitude <= deadzone) {
    return 0;
  }
  return Math.sign(value) * Math.min(1, (magnitude - deadzone) / (1 - deadzone));
}

function driveModeScale(mode: DriveMode) {
  switch (mode) {
    case "precision":
      return 0.55;
    case "inspection":
      return 0.35;
    default:
      return 1;
  }
}

export function selectManualCommand(state: Pick<ControlState, "axes" | "lateral" | "activeInput" | "driveMode" | "turbo" | "speedMultiplier">): ManualCommand {
  const modeScale = driveModeScale(state.driveMode);
  const boost = state.turbo ? 1.25 : 1;
  const multiplier = Math.min(robotConfig.speedMultiplier.max, state.speedMultiplier * boost) * modeScale;
  const drive = linearAxis(-state.axes.y, robotConfig.deadzone);
  const turn = linearAxis(state.axes.x, robotConfig.deadzone);
  const lateral = linearAxis(state.lateral, robotConfig.deadzone);

  return {
    source: state.activeInput,
    drive,
    turn,
    lateral,
    multiplier,
    mode: state.driveMode,
    twist: {
      linear: {
        x: drive * robotConfig.maxLinear * multiplier,
        y: lateral * robotConfig.maxLateral * multiplier,
        z: 0,
      },
      angular: {
        x: 0,
        y: 0,
        z: turn * robotConfig.maxAngular * multiplier,
      },
    },
  };
}
