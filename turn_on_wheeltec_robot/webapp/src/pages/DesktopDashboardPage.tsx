import { StatusOverview } from "@/widgets/status-overview/StatusOverview";
import { TelemetryGrid } from "@/widgets/telemetry-grid/TelemetryGrid";

export function DesktopDashboardPage() {
  return (
    <main className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-5 lg:px-6">
      <StatusOverview />
      <TelemetryGrid />
    </main>
  );
}
