import type { FaultSeverity } from "@/shared/types/fault";
import { Badge } from "@/shared/ui/badge";

export function FaultSeverityBadge({ severity }: { severity: FaultSeverity }) {
  const variant =
    severity === "critical" ? "danger" : severity === "warning" ? "warning" : severity === "normal" ? "success" : "neutral";
  return <Badge variant={variant}>{severity}</Badge>;
}
