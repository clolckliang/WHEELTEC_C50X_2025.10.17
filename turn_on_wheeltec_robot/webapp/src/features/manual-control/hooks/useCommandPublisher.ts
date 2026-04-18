import { useEffect, useEffectEvent } from "react";

import { useControlStore, selectManualCommand } from "@/features/manual-control/model/control-store";
import { useRosConnectStore } from "@/features/ros-connect/model/ros-connect-store";
import { robotConfig } from "@/shared/config/robot";
import { rosClient } from "@/shared/lib/ros/client";

export function useCommandPublisher() {
  const status = useRosConnectStore((state) => state.status);

  const tick = useEffectEvent(() => {
    if (status !== "connected") {
      return;
    }

    const command = selectManualCommand(useControlStore.getState());
    rosClient.publish(robotConfig.topics.cmdVelWeb.name, robotConfig.topics.cmdVelWeb.type, command.twist);
    rosClient.publish(robotConfig.topics.heartbeat.name, robotConfig.topics.heartbeat.type, {});
  });

  useEffect(() => {
    if (status !== "connected") {
      return undefined;
    }

    tick();
    const timer = window.setInterval(tick, robotConfig.commandMs);
    return () => window.clearInterval(timer);
  }, [status, tick]);
}
