import { MonitorCog, MoonStar, SunMedium } from "lucide-react";

import { useThemeStore, type ThemeMode } from "@/features/theme/hooks/useThemeStore";
import { Button } from "@/shared/ui/button";

const options: Array<{ value: ThemeMode; icon: typeof SunMedium; label: string }> = [
  { value: "light", icon: SunMedium, label: "Light" },
  { value: "dark", icon: MoonStar, label: "Dark" },
  { value: "system", icon: MonitorCog, label: "System" },
];

export function ThemeToggle() {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/70 p-1">
      {options.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          size="sm"
          variant={mode === value ? "default" : "ghost"}
          className="rounded-full"
          onClick={() => setMode(value)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
