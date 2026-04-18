import { useControlStore } from "@/features/manual-control/model/control-store";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function DriveModeTabs() {
  const driveMode = useControlStore((state) => state.driveMode);
  const setDriveMode = useControlStore((state) => state.setDriveMode);

  return (
    <Tabs value={driveMode} onValueChange={(value) => setDriveMode(value as typeof driveMode)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="standard">Standard</TabsTrigger>
        <TabsTrigger value="precision">Precision</TabsTrigger>
        <TabsTrigger value="inspection">Inspection</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
