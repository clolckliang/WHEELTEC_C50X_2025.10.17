export interface TelemetrySnapshot {
  batteryVoltage: number;
  linearX: number;
  linearY: number;
  angularZ: number;
  imuGz: number;
  odomX: number;
  odomY: number;
  currents: [number, number, number];
  controlStatus: string;
  controlOwnerId: string;
  controlOwnerName: string;
  controlOwnerSource: string;
  controlClientCount: number;
  controlWaitingCount: number;
  controlLastReleaseReason: string;
  updatedAt: number;
}

export interface VelocitySample {
  timestamp: string;
  vx: number;
  vy: number;
  wz: number;
}

export interface CurrentSample {
  timestamp: string;
  i0: number;
  i1: number;
  i2: number;
}

export interface BatteryState {
  level: number;
  label: string;
}
