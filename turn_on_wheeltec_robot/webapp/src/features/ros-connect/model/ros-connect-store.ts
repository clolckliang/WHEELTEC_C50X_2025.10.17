import { create } from "zustand";

import { robotConfig } from "@/shared/config/robot";
import type { RosConnectionSnapshot } from "@/shared/types/ros";

interface RosConnectState extends RosConnectionSnapshot {
  manualDisconnect: boolean;
  setUrl: (url: string) => void;
  setSnapshot: (snapshot: RosConnectionSnapshot) => void;
  setManualDisconnect: (manualDisconnect: boolean) => void;
}

export const useRosConnectStore = create<RosConnectState>((set) => ({
  status: "disconnected",
  url: robotConfig.rosbridgeUrl,
  error: undefined,
  manualDisconnect: false,
  setUrl: (url) => set({ url }),
  setSnapshot: (snapshot) => set(snapshot),
  setManualDisconnect: (manualDisconnect) => set({ manualDisconnect }),
}));
