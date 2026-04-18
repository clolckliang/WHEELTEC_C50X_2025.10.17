import { PlugZap, Power, Unplug } from "lucide-react";

import { useRobotStore } from "@/entities/robot/model/robot-store";
import { useControlArbitrationStore } from "@/features/control-arbitration/model/control-arbitration-store";
import { useRosConnectStore } from "@/features/ros-connect/model/ros-connect-store";
import { rosClient } from "@/shared/lib/ros/client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ConnectionBadge } from "@/entities/robot/ui/ConnectionBadge";

export function RosConnectionControls() {
  const status = useRosConnectStore((state) => state.status);
  const url = useRosConnectStore((state) => state.url);
  const draftUrl = useRosConnectStore((state) => state.draftUrl);
  const error = useRosConnectStore((state) => state.error);
  const setDraftUrl = useRosConnectStore((state) => state.setDraftUrl);
  const applyDraftUrl = useRosConnectStore((state) => state.applyDraftUrl);
  const setManualDisconnect = useRosConnectStore((state) => state.setManualDisconnect);
  const clientId = useControlArbitrationStore((state) => state.clientId);
  const clientName = useControlArbitrationStore((state) => state.clientName);
  const wantsControl = useControlArbitrationStore((state) => state.wantsControl);
  const requestTakeover = useControlArbitrationStore((state) => state.requestTakeover);
  const setWantsControl = useControlArbitrationStore((state) => state.setWantsControl);
  const ownerId = useRobotStore((state) => state.telemetry.controlOwnerId);
  const ownerName = useRobotStore((state) => state.telemetry.controlOwnerName);
  const isOwner = ownerId !== "" && ownerId === clientId;
  const ownerLabel = isOwner ? "我" : ownerName || "无";

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <Input value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="ws://robot-ip:9090" />
        {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
        {draftUrl !== url ? <p className="mt-1 text-xs text-muted-foreground">当前连接仍在使用 {url}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">
          客户端 {clientName} · 当前控制持有者 {ownerLabel}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ConnectionBadge status={status} />
        <Button
          variant={isOwner ? "secondary" : "default"}
          onClick={() => requestTakeover()}
          disabled={status !== "connected"}
        >
          {isOwner ? "Holding Control" : "Take Control"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setWantsControl(!wantsControl)}
          disabled={status !== "connected" && !wantsControl}
        >
          {wantsControl ? "Observe" : "Request Lease"}
        </Button>
        <Button
          variant="default"
          onClick={() => {
            applyDraftUrl();
            setManualDisconnect(false);
            rosClient.connect(draftUrl);
          }}
        >
          <PlugZap className="h-4 w-4" />
          Connect
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setManualDisconnect(true);
            rosClient.disconnect();
          }}
        >
          <Unplug className="h-4 w-4" />
          Disconnect
        </Button>
        <Button
          variant="danger"
          onClick={() => rosClient.publish("/web/estop", "std_msgs/Bool", { data: true })}
        >
          <Power className="h-4 w-4" />
          E-Stop
        </Button>
      </div>
    </div>
  );
}
