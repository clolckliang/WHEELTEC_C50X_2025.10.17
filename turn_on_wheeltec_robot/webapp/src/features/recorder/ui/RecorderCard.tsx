import { useState } from "react";
import { Download, FolderSync, Play, Square } from "lucide-react";

import { RecorderStateBadge } from "@/entities/recorder/ui/RecorderStateBadge";
import { useRecorderFiles } from "@/features/recorder/hooks/useRecorderFiles";
import { useRecorderStore } from "@/features/recorder/model/recorder-store";
import { robotConfig } from "@/shared/config/robot";
import { buildRecorderDownloadUrl } from "@/features/recorder/api/files-api";
import { formatBytes, formatDuration, formatRelativeDate } from "@/shared/lib/format";
import { rosClient } from "@/shared/lib/ros/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

interface RecorderCardProps {
  autoLoad?: boolean;
  compact?: boolean;
}

export function RecorderCard({ autoLoad = true, compact = false }: RecorderCardProps) {
  const [label, setLabel] = useState("");
  const status = useRecorderStore((state) => state.status);
  const files = useRecorderStore((state) => state.files);
  const loadingFiles = useRecorderStore((state) => state.loadingFiles);
  const error = useRecorderStore((state) => state.error);
  const { refresh } = useRecorderFiles(autoLoad);

  const sendCommand = (command: "start" | "stop") => {
    const payload = command === "start" && label.trim() ? `${command}:${label.trim()}` : command;
    rosClient.publish(robotConfig.topics.recorderCommand.name, robotConfig.topics.recorderCommand.type, { data: payload });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardDescription>ROS 数据录制与 CSV 下载</CardDescription>
          <CardTitle className="mt-1">Recorder</CardTitle>
        </div>
        <RecorderStateBadge state={status.state} />
      </CardHeader>
      <CardContent className="space-y-4">
        <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="录制标签，例如 normal / overload" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Button onClick={() => sendCommand("start")}>
            <Play className="h-4 w-4" />
            开始
          </Button>
          <Button variant="danger" onClick={() => sendCommand("stop")}>
            <Square className="h-4 w-4" />
            停止
          </Button>
          <Button variant="outline" onClick={() => void refresh()}>
            <FolderSync className="h-4 w-4" />
            刷新
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Samples</div>
            <div className="mt-2 text-2xl font-semibold">{status.count}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Duration</div>
            <div className="mt-2 text-2xl font-semibold">{formatDuration(status.duration)}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rate</div>
            <div className="mt-2 text-2xl font-semibold">{status.rate || "--"} Hz</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current File</div>
            <div className="mt-2 truncate text-sm font-semibold">{status.file || "--"}</div>
          </div>
        </div>
        {!compact ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">最近文件</div>
              {loadingFiles ? <span className="text-xs text-muted-foreground">加载中...</span> : null}
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {files.length === 0 ? <p className="text-sm text-muted-foreground">暂无 CSV 文件。</p> : null}
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/65 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{file.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatBytes(file.size)} · {formatRelativeDate(file.mtime)}
                    </div>
                  </div>
                  <Button asChild size="sm">
                    <a href={buildRecorderDownloadUrl(file.name)}>
                      <Download className="h-4 w-4" />
                      下载
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
