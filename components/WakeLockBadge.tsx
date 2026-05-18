"use client";
import { useWakeLock } from "./useWakeLock";

export default function WakeLockBadge() {
  const active = useWakeLock(true);
  return (
    <span
      title={active ? "Screen lock prevented (wake lock active)" : "Wake lock unavailable"}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        active ? "bg-good/20 text-good" : "bg-zinc-800 text-zinc-500"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-good" : "bg-zinc-500"}`} />
      {active ? "Always-on" : "Idle"}
    </span>
  );
}
