import { PlugZap, Power, Unplug } from "lucide-react";

import { useRosConnectStore } from "@/features/ros-connect/model/ros-connect-store";
import { rosClient } from "@/shared/lib/ros/client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ConnectionBadge } from "@/entities/robot/ui/ConnectionBadge";

export function RosConnectionControls() {
  const status = useRosConnectStore((state) => state.status);
  const url = useRosConnectStore((state) => state.url);
  const error = useRosConnectStore((state) => state.error);
  const setUrl = useRosConnectStore((state) => state.setUrl);
  const setManualDisconnect = useRosConnectStore((state) => state.setManualDisconnect);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="ws://robot-ip:9090" />
        {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ConnectionBadge status={status} />
        <Button
          variant="default"
          onClick={() => {
            setManualDisconnect(false);
            rosClient.connect(url);
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
