export type InputSource = "touch" | "keyboard" | "gamepad";

export type DriveMode = "standard" | "precision" | "inspection";

export interface AxisInput {
  x: number;
  y: number;
}

export interface TwistVector {
  linear: {
    x: number;
    y: number;
    z: number;
  };
  angular: {
    x: number;
    y: number;
    z: number;
  };
}

export interface ManualCommand {
  source: InputSource;
  drive: number;
  turn: number;
  lateral: number;
  multiplier: number;
  mode: DriveMode;
  twist: TwistVector;
}
