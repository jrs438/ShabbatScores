"use client";
import { useEffect, useState } from "react";

type WakeLockSentinel = { release: () => Promise<void>; addEventListener: (e: string, cb: () => void) => void };

export function useWakeLock(enabled = true) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } };
    if (!nav.wakeLock) return;

    const acquire = async () => {
      try {
        sentinel = await nav.wakeLock!.request("screen");
        setActive(true);
        sentinel.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !released) acquire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);

  return active;
}
