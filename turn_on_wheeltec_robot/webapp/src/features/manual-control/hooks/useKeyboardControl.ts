import { useEffect } from "react";

import { useControlStore } from "@/features/manual-control/model/control-store";

const movementKeys = new Set([
  "w",
  "a",
  "s",
  "d",
  "q",
  "e",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "shift",
  " ",
]);

export function useKeyboardControl() {
  useEffect(() => {
    const pressed = new Set<string>();

    const syncFromKeys = () => {
      const state = useControlStore.getState();
      if (state.touchActive || state.activeInput === "gamepad") {
        return;
      }

      const forward = pressed.has("w") || pressed.has("arrowup");
      const backward = pressed.has("s") || pressed.has("arrowdown");
      const left = pressed.has("a") || pressed.has("arrowleft");
      const right = pressed.has("d") || pressed.has("arrowright");
      const lateralLeft = pressed.has("q");
      const lateralRight = pressed.has("e");

      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (backward ? 1 : 0) - (forward ? 1 : 0);
      const lateral = (lateralRight ? 1 : 0) - (lateralLeft ? 1 : 0);

      if (x !== 0 || y !== 0 || lateral !== 0) {
        state.setAxes({ x, y }, "keyboard");
        state.setLateral(lateral, "keyboard");
      } else if (state.activeInput === "keyboard") {
        state.stop("touch");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key === " " ? " " : event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }
      if (!movementKeys.has(key)) {
        return;
      }
      event.preventDefault();
      pressed.add(key);

      const state = useControlStore.getState();
      if (key === "shift") {
        state.setTurbo(true);
      } else if (key === " ") {
        state.stop("touch");
      }
      syncFromKeys();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key === " " ? " " : event.key.toLowerCase();
      pressed.delete(key);

      const state = useControlStore.getState();
      if (key === "shift") {
        state.setTurbo(false);
      }
      syncFromKeys();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}
