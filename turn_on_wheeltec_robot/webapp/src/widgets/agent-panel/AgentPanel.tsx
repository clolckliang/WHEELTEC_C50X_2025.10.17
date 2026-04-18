import { Bot, PlugZap, Workflow } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function AgentPanel() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardDescription>后续 LangGraph / Agent 能力接入预留</CardDescription>
          <CardTitle className="mt-1">Agent Panel</CardTitle>
        </div>
        <Badge variant="info">Placeholder</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-3xl border border-dashed border-border/80 bg-background/50 p-5">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">下一阶段能力</div>
              <p className="text-sm text-muted-foreground">故障解释、策略建议、自动巡检、远程协同</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
            <PlugZap className="h-4 w-4 text-primary" />
            <div className="mt-2 text-sm font-semibold">ROS Hooks Ready</div>
            <p className="mt-1 text-xs text-muted-foreground">当前页面已经保留 telemetry、fault、recorder 的 typed interface。</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
            <Workflow className="h-4 w-4 text-primary" />
            <div className="mt-2 text-sm font-semibold">Planner Surface</div>
            <p className="mt-1 text-xs text-muted-foreground">适合后续挂载聊天、诊断链、动作建议和回放工作流。</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
