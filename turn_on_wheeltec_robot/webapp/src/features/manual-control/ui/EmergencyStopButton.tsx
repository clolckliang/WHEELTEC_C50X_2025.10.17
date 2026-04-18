import { ShieldAlert, ShieldCheck } from "lucide-react";

import { useControlStore } from "@/features/manual-control/model/control-store";
import { robotConfig } from "@/shared/config/robot";
import { rosClient } from "@/shared/lib/ros/client";
import { Button } from "@/shared/ui/button";

export function EmergencyStopButton() {
  const estopActive = useControlStore((state) => state.estopActive);
  const setEstopActive = useControlStore((state) => state.setEstopActive);

  const toggle = () => {
    const next = !estopActive;
    setEstopActive(next);
    rosClient.publish(robotConfig.topics.estop.name, robotConfig.topics.estop.type, { data: next });
  };

  return (
    <Button variant={estopActive ? "outline" : "danger"} size="lg" className="w-full justify-center" onClick={toggle}>
      {estopActive ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
      {estopActive ? "解除急停" : "急停"}
    </Button>
  );
}
