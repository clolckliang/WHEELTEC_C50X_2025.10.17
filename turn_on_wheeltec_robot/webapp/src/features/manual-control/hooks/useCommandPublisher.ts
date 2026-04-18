import { useEffect, useEffectEvent } from "react";

import { useRobotStore } from "@/entities/robot/model/robot-store";
import { useControlArbitrationStore } from "@/features/control-arbitration/model/control-arbitration-store";
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

    const arbitration = useControlArbitrationStore.getState();
    if (!arbitration.wantsControl) {
      return;
    }

    const telemetry = useRobotStore.getState().telemetry;
    const ownerId = telemetry.controlOwnerId;
    if (ownerId && ownerId !== arbitration.clientId) {
      return;
    }

    const command = selectManualCommand(useControlStore.getState());
    rosClient.publish(robotConfig.topics.cmdVelEnvelope.name, robotConfig.topics.cmdVelEnvelope.type, {
      data: JSON.stringify({
        client_id: arbitration.clientId,
        client_name: arbitration.clientName,
        source: command.source,
        wants_control: arbitration.wantsControl,
        twist: command.twist,
      }),
    });
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
