export interface GamepadButtonsState {
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  lb: boolean;
  rb: boolean;
  back: boolean;
  start: boolean;
}

export interface GamepadStateSnapshot {
  connected: boolean;
  index: number | null;
  id: string;
  leftStick: {
    x: number;
    y: number;
  };
  rightStick: {
    x: number;
    y: number;
  };
  triggers: {
    lt: number;
    rt: number;
  };
  buttons: GamepadButtonsState;
  hapticsSupported: boolean;
  lastUpdated: number;
}
