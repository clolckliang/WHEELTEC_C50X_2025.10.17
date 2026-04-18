import { useEffect, useRef } from "react";

import { useControlStore } from "@/features/manual-control/model/control-store";
import { GamepadManager } from "@/features/gamepad/lib/GamepadManager";
import { HapticsManager } from "@/features/gamepad/lib/HapticsManager";
import { useGamepadStore } from "@/features/gamepad/model/gamepad-store";
import { robotConfig } from "@/shared/config/robot";
import { rosClient } from "@/shared/lib/ros/client";

function filterAxis(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude <= robotConfig.gamepadDeadzone) {
    return 0;
  }
  return Math.sign(value) * Math.min(1, (magnitude - robotConfig.gamepadDeadzone) / (1 - robotConfig.gamepadDeadzone));
}

export function useGamepadBridge() {
  const setSnapshot = useGamepadStore((state) => state.setSnapshot);
  const previousButtons = useRef({
    a: false,
    b: false,
    x: false,
    y: false,
    lb: false,
    rb: false,
  });

  useEffect(() => {
    const manager = new GamepadManager();
    const haptics = new HapticsManager();

    manager.setListener(async (snapshot, gamepad) => {
      setSnapshot(snapshot);
      const control = useControlStore.getState();

      const justPressed = {
        a: snapshot.buttons.a && !previousButtons.current.a,
        b: snapshot.buttons.b && !previousButtons.current.b,
        x: snapshot.buttons.x && !previousButtons.current.x,
        y: snapshot.buttons.y && !previousButtons.current.y,
        lb: snapshot.buttons.lb && !previousButtons.current.lb,
        rb: snapshot.buttons.rb && !previousButtons.current.rb,
      };
      previousButtons.current = {
        a: snapshot.buttons.a,
        b: snapshot.buttons.b,
        x: snapshot.buttons.x,
        y: snapshot.buttons.y,
        lb: snapshot.buttons.lb,
        rb: snapshot.buttons.rb,
      };

      if (!snapshot.connected) {
        if (!control.touchActive && control.activeInput === "gamepad") {
          control.stop("touch");
        }
        return;
      }

      if (justPressed.a) {
        control.stop("touch");
      }
      if (justPressed.b) {
        control.setEstopActive(true);
        rosClient.publish(robotConfig.topics.estop.name, robotConfig.topics.estop.type, { data: true });
        await haptics.pulse(gamepad, 0.8, 120);
      }
      if (justPressed.x) {
        control.setEstopActive(false);
        rosClient.publish(robotConfig.topics.estop.name, robotConfig.topics.estop.type, { data: false });
        await haptics.pulse(gamepad, 0.35, 90);
      }
      if (justPressed.y) {
        control.toggleTurbo();
      }
      if (justPressed.lb) {
        control.nudgeSpeedMultiplier(-robotConfig.speedMultiplier.step);
      }
      if (justPressed.rb) {
        control.nudgeSpeedMultiplier(robotConfig.speedMultiplier.step);
      }

      if (control.touchActive) {
        return;
      }

      const leftX = filterAxis(snapshot.leftStick.x);
      const leftY = filterAxis(snapshot.leftStick.y);
      const rightX = filterAxis(snapshot.rightStick.x);
      const triggerDrive = snapshot.triggers.rt > 0.05 ? -snapshot.triggers.rt : snapshot.triggers.lt > 0.05 ? snapshot.triggers.lt : leftY;
      const active = Math.abs(leftX) > 0 || Math.abs(triggerDrive) > 0 || Math.abs(rightX) > 0;

      if (active) {
        control.setAxes({ x: leftX, y: triggerDrive }, "gamepad");
        control.setLateral(rightX, "gamepad");
      } else if (control.activeInput === "gamepad") {
        control.stop("touch");
      }
    });

    manager.start();
    return () => manager.stop();
  }, [setSnapshot]);
}
