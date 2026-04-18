import { useEffect } from "react";

import { getSystemTheme } from "@/shared/lib/browser";
import { useThemeStore } from "@/features/theme/hooks/useThemeStore";

export function useThemeSync() {
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const resolved = mode === "system" ? getSystemTheme() : mode;
      root.classList.toggle("dark", resolved === "dark");
      root.dataset.theme = resolved;
    };

    apply();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);
}
