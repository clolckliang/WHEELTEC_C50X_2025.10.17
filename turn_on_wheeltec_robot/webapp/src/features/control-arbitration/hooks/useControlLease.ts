import { useEffect, useEffectEvent, useRef } from "react";

import { useRobotStore } from "@/entities/robot/model/robot-store";
import { useControlArbitrationStore } from "@/features/control-arbitration/model/control-arbitration-store";
import { useRosConnectStore } from "@/features/ros-connect/model/ros-connect-store";
import { robotConfig } from "@/shared/config/robot";
import { rosClient } from "@/shared/lib/ros/client";
import type { ControlLeaseState } from "@/shared/types/control";

function selectLeaseState(ownerId: string, clientId: string, wantsControl: boolean): ControlLeaseState {
  if (ownerId && ownerId === clientId) {
    return "owner";
  }
  if (wantsControl) {
    return "pending";
  }
  return "observer";
}

export function useControlLease() {
  const rosStatus = useRosConnectStore((state) => state.status);
  const clientId = useControlArbitrationStore((state) => state.clientId);
  const clientName = useControlArbitrationStore((state) => state.clientName);
  const wantsControl = useControlArbitrationStore((state) => state.wantsControl);
  const takeoverNonce = useControlArbitrationStore((state) => state.takeoverNonce);
  const ownerId = useRobotStore((state) => state.telemetry.controlOwnerId);
  const appendLog = useRobotStore((state) => state.appendLog);
  const lastLoggedLeaseRef = useRef<ControlLeaseState | "">("");
  const lastTakeoverSentRef = useRef(0);

  const tick = useEffectEvent(() => {
    if (rosStatus !== "connected") {
      return;
    }

    const shouldTakeover = takeoverNonce > 0 && lastTakeoverSentRef.current !== takeoverNonce;
    rosClient.publish(robotConfig.topics.clientHeartbeat.name, robotConfig.topics.clientHeartbeat.type, {
      data: JSON.stringify({
        client_id: clientId,
        client_name: clientName,
        source: "react-console",
        wants_control: wantsControl,
        takeover: shouldTakeover,
      }),
    });

    if (shouldTakeover) {
      lastTakeoverSentRef.current = takeoverNonce;
    }
  });

  useEffect(() => {
    if (rosStatus !== "connected") {
      return undefined;
    }

    tick();
    const timer = window.setInterval(tick, robotConfig.controlLeaseMs);
    return () => window.clearInterval(timer);
  }, [rosStatus, tick]);

  useEffect(() => {
    const leaseState = selectLeaseState(ownerId, clientId, wantsControl);
    if (leaseState === lastLoggedLeaseRef.current) {
      return;
    }

    lastLoggedLeaseRef.current = leaseState;
    if (leaseState === "owner") {
      appendLog({ level: "info", message: `控制租约已授予当前客户端 ${clientName}` });
      return;
    }

    if (leaseState === "pending") {
      appendLog({ level: "warning", message: "当前客户端正在等待控制租约，可使用 Take Control 手动抢占。" });
      return;
    }

    appendLog({ level: "info", message: `当前客户端切换为观察模式 ${clientName}` });
  }, [appendLog, clientId, clientName, ownerId, wantsControl]);
}
