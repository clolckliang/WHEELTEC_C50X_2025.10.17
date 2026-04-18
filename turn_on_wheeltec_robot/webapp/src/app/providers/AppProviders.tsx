import type { PropsWithChildren } from "react";
import { BrowserRouter } from "react-router-dom";

import { useGamepadBridge } from "@/features/gamepad/hooks/useGamepadBridge";
import { useCommandPublisher } from "@/features/manual-control/hooks/useCommandPublisher";
import { useKeyboardControl } from "@/features/manual-control/hooks/useKeyboardControl";
import { useRosRuntime } from "@/features/ros-connect/hooks/useRosRuntime";
import { useThemeSync } from "@/features/theme/hooks/useThemeSync";

function RuntimeBootstrap() {
  useThemeSync();
  useRosRuntime();
  useCommandPublisher();
  useKeyboardControl();
  useGamepadBridge();
  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <RuntimeBootstrap />
      {children}
    </BrowserRouter>
  );
}
