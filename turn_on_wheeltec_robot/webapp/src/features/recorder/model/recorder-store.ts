import { create } from "zustand";

import type { RecordedFile, RecorderStatus } from "@/shared/types/recorder";

interface RecorderState {
  status: RecorderStatus;
  files: RecordedFile[];
  loadingFiles: boolean;
  error?: string;
  setStatus: (status: RecorderStatus) => void;
  setFiles: (files: RecordedFile[]) => void;
  setLoadingFiles: (loadingFiles: boolean) => void;
  setError: (error?: string) => void;
}

const initialStatus: RecorderStatus = {
  state: "idle",
  count: 0,
  duration: 0,
  rate: 0,
  file: "",
  outputDir: "",
};

export const useRecorderStore = create<RecorderState>((set) => ({
  status: initialStatus,
  files: [],
  loadingFiles: false,
  error: undefined,
  setStatus: (status) => set({ status }),
  setFiles: (files) => set({ files }),
  setLoadingFiles: (loadingFiles) => set({ loadingFiles }),
  setError: (error) => set({ error }),
}));
