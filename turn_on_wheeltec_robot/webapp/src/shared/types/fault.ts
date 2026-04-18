export type FaultSeverity = "normal" | "warning" | "critical" | "unknown";

export interface FaultSummary {
  label: string;
  score: number;
  severity: FaultSeverity;
  advice: string;
  tags: string[];
}
