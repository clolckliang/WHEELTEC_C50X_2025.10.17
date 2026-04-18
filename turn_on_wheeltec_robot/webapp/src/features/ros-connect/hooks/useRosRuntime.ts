import { useEffect } from "react";

import { useRobotStore } from "@/entities/robot/model/robot-store";
import { registerRosTopics } from "@/features/ros-connect/lib/register-ros-topics";
import { useRosConnectStore } from "@/features/ros-connect/model/ros-connect-store";
import { rosClient } from "@/shared/lib/ros/client";

export function useRosRuntime() {
  const url = useRosConnectStore((state) => state.url);
  const manualDisconnect = useRosConnectStore((state) => state.manualDisconnect);
  const setSnapshot = useRosConnectStore((state) => state.setSnapshot);
  const appendLog = useRobotStore((state) => state.appendLog);

  useEffect(() => {
    const unsubscribeState = rosClient.onStateChange((snapshot) => {
      setSnapshot(snapshot);
    });
    const unsubscribeLog = rosClient.onLog((message) => {
      appendLog({ level: "info", message });
    });
    const unregisterTopics = registerRosTopics();

    if (!manualDisconnect) {
      rosClient.connect(url);
    }

    return () => {
      unsubscribeState();
      unsubscribeLog();
      unregisterTopics();
    };
  }, [appendLog, manualDisconnect, setSnapshot, url]);
}
