import { AlertTriangle, Siren } from "lucide-react";

import { useFaultStore } from "@/entities/fault/model/fault-store";
import { FaultSeverityBadge } from "@/entities/fault/ui/FaultSeverityBadge";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function FaultDiagnosisCard() {
  const summary = useFaultStore((state) => state.summary);

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardDescription>故障摘要与 Agent 接入预留</CardDescription>
          <CardTitle className="mt-1">Fault Diagnosis</CardTitle>
        </div>
        <FaultSeverityBadge severity={summary.severity} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xl font-semibold">{summary.label}</div>
              <p className="mt-1 text-sm text-muted-foreground">{summary.advice}</p>
            </div>
            {summary.severity === "critical" ? <Siren className="h-6 w-6 text-red-500" /> : <AlertTriangle className="h-6 w-6 text-amber-500" />}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fault Score</div>
            <div className="mt-2 text-3xl font-semibold">{summary.score.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recommended Action</div>
            <div className="mt-2 text-sm font-medium">{summary.advice}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.tags.map((tag) => (
            <Badge key={tag} variant="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
