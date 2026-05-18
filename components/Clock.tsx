"use client";
import { useEffect, useState } from "react";

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="font-mono text-2xl tabular-nums opacity-0">--:--:--</div>;

  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  return (
    <div className="text-right leading-tight">
      <div className="font-mono text-3xl tabular-nums">{time}</div>
      <div className="text-sm text-zinc-400">{date}</div>
    </div>
  );
}
