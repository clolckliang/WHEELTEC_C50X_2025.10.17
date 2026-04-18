export type RosConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface RosConnectionSnapshot {
  status: RosConnectionStatus;
  url: string;
  error?: string;
}

export interface RosMessageEnvelope<T> {
  topic: string;
  message: T;
}
