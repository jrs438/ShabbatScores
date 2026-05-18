"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type WakeLockSentinel = {
  release: () => Promise<void>;
  addEventListener: (e: string, cb: () => void) => void;
};

export default function WakeLockBadge() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
    };
    if (!nav.wakeLock) {
      setSupported(false);
      return;
    }
    try {
      const s = await nav.wakeLock.request("screen");
      sentinelRef.current = s;
      setActive(true);
      s.addEventListener("release", () => setActive(false));
    } catch {
      setActive(false);
    }
  }, []);

  useEffect(() => {
    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sentinelRef.current?.release().catch(() => {});
    };
  }, [acquire]);

  if (!supported) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Wake lock N/A
      </span>
    );
  }

  return (
    <button
      onClick={acquire}
      title={active ? "Screen will stay on" : "Tap to keep screen on"}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        active
          ? "bg-good/20 text-good"
          : "bg-accent2/20 text-accent2 ring-1 ring-accent2/40"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-good" : "bg-accent2"}`} />
      {active ? "Always-on" : "Tap to enable"}
    </button>
  );
}
