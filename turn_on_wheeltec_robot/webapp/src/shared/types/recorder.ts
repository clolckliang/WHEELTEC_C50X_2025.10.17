export type RecorderState = "idle" | "recording" | "processing";

export interface RecorderStatus {
  state: RecorderState;
  count: number;
  duration: number;
  rate: number;
  file: string;
  outputDir: string;
}

export interface RecordedFile {
  name: string;
  size: number;
  mtime: number;
}
