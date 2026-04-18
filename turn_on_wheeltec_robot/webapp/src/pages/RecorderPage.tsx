import { RecorderPanel } from "@/widgets/recorder-panel/RecorderPanel";

export function RecorderPage() {
  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 py-5 lg:px-6">
      <RecorderPanel />
    </main>
  );
}
