import { create } from "zustand";

import { deriveFaultSummary } from "@/shared/lib/ros/adapters";
import type { FaultSummary } from "@/shared/types/fault";
import type { TelemetrySnapshot } from "@/shared/types/telemetry";

interface FaultState {
  summary: FaultSummary;
  refreshFaultSummary: (snapshot: TelemetrySnapshot) => void;
}

export const useFaultStore = create<FaultState>((set) => ({
  summary: {
    label: "Initializing",
    score: 0.15,
    severity: "unknown",
    advice: "等待 ROS 数据流和状态回传。",
    tags: ["boot"],
  },
  refreshFaultSummary: (snapshot) => set({ summary: deriveFaultSummary(snapshot) }),
}));
