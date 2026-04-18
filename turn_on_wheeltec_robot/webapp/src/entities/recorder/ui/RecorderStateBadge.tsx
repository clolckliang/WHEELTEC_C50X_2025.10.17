import type { RecorderState } from "@/shared/types/recorder";
import { Badge } from "@/shared/ui/badge";

export function RecorderStateBadge({ state }: { state: RecorderState }) {
  const variant = state === "recording" ? "danger" : state === "processing" ? "warning" : "neutral";
  return <Badge variant={variant}>{state}</Badge>;
}
