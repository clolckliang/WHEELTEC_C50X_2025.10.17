import { Activity, Compass, Cpu, Waves } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useRobotStore } from "@/entities/robot/model/robot-store";
import { FaultDiagnosisCard } from "@/features/fault-diagnosis/ui/FaultDiagnosisCard";
import { GamepadStatusCard } from "@/features/gamepad/ui/GamepadStatusCard";
import { RecorderCard } from "@/features/recorder/ui/RecorderCard";
import { formatAngleRate, formatCurrent, formatNumber, formatSpeed } from "@/shared/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { MetricCard } from "@/entities/telemetry/ui/MetricCard";
import { AgentPanel } from "@/widgets/agent-panel/AgentPanel";
import { LogsPanel } from "@/widgets/logs-panel/LogsPanel";
import { VideoPanel } from "@/widgets/video-panel/VideoPanel";

export function TelemetryGrid() {
  const telemetry = useRobotStore((state) => state.telemetry);
  const velocityHistory = useRobotStore((state) => state.velocityHistory);
  const currentHistory = useRobotStore((state) => state.currentHistory);

  return (
    <div className="panel-grid xl:grid-cols-12">
      <div className="grid gap-4 md:grid-cols-2 xl:col-span-12 xl:grid-cols-4">
        <MetricCard title="Linear Velocity" description="前向实时速度" value={formatSpeed(telemetry.linearX)} secondary={`Vy ${formatSpeed(telemetry.linearY)}`} icon={<Activity className="h-5 w-5 text-primary" />} />
        <MetricCard title="Angular Velocity" description="实时角速度" value={formatAngleRate(telemetry.angularZ)} secondary={`IMU Gz ${formatNumber(telemetry.imuGz, 3)}`} icon={<Waves className="h-5 w-5 text-primary" />} />
        <MetricCard title="Motor Current" description="最高电机电流" value={formatCurrent(Math.max(...telemetry.currents))} secondary={`L ${formatCurrent(telemetry.currents[0])} · R ${formatCurrent(telemetry.currents[1])}`} icon={<Cpu className="h-5 w-5 text-primary" />} />
        <MetricCard title="Odometry" description="位姿追踪" value={`X ${formatNumber(telemetry.odomX, 3)}`} secondary={`Y ${formatNumber(telemetry.odomY, 3)}`} icon={<Compass className="h-5 w-5 text-primary" />} />
      </div>

      <Card className="xl:col-span-6">
        <CardHeader>
          <div>
            <CardDescription>速度状态曲线</CardDescription>
            <CardTitle className="mt-1">Velocity Trends</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={velocityHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
              <XAxis dataKey="timestamp" hide />
              <YAxis stroke="currentColor" tick={{ fill: "currentColor", fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="vx" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="vy" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="wz" stroke="#fb923c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-6">
        <CardHeader>
          <div>
            <CardDescription>左右电机电流与负载变化</CardDescription>
            <CardTitle className="mt-1">Current Trends</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
              <XAxis dataKey="timestamp" hide />
              <YAxis stroke="currentColor" tick={{ fill: "currentColor", fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="i0" stroke="#f87171" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="i1" stroke="#c084fc" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="i2" stroke="#fde047" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="xl:col-span-4">
        <FaultDiagnosisCard />
      </div>
      <div className="xl:col-span-4">
        <RecorderCard compact />
      </div>
      <div className="xl:col-span-4">
        <GamepadStatusCard />
      </div>

      <div className="xl:col-span-6">
        <VideoPanel />
      </div>
      <div className="xl:col-span-6">
        <AgentPanel />
      </div>

      <div className="xl:col-span-12">
        <LogsPanel />
      </div>
    </div>
  );
}
