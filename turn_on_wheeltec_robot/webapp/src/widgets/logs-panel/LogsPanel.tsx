import { TerminalSquare } from "lucide-react";

import { useRobotStore } from "@/entities/robot/model/robot-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function LogsPanel() {
  const logs = useRobotStore((state) => state.logs);

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardDescription>浏览器端连接与控制日志</CardDescription>
          <CardTitle className="mt-1">Logs & Alerts</CardTitle>
        </div>
        <TerminalSquare className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="max-h-72 space-y-2 overflow-auto rounded-3xl border border-border/70 bg-slate-950 p-4 font-mono text-xs text-slate-200">
          {logs.length === 0 ? <p>等待日志输出...</p> : null}
          {logs
            .slice()
            .reverse()
            .map((log) => (
              <div key={log.id}>
                [{new Date(log.timestamp).toLocaleTimeString("zh-CN", { hour12: false })}] {log.message}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
