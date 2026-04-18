import { useEffect, useState } from "react";

import { isBrowser } from "@/shared/lib/browser";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (!isBrowser()) {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!isBrowser()) {
      return undefined;
    }
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
