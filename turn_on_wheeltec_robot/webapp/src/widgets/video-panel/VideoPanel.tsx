import { Camera, Radar } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function VideoPanel() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardDescription>前视视频 / 视觉流预留</CardDescription>
          <CardTitle className="mt-1">Video</CardTitle>
        </div>
        <Badge variant="neutral">Placeholder</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/80 bg-gradient-to-br from-background to-muted/80 text-center">
          <Camera className="h-10 w-10 text-primary" />
          <div className="mt-4 text-lg font-semibold">Video stream staging area</div>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            这里预留 RTSP/WebRTC/MJPEG 或视觉感知面板，后续可以直接替换为实时视频卡片。
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Radar className="h-3.5 w-3.5" />
            Ready for camera pipeline
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
