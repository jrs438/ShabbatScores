"use client";
import { usePolling } from "./usePolling";
import type { WeatherNow } from "@/lib/types";
import type { UserSettings } from "@/lib/settings";
import { shortPeriodName, weatherIcon } from "@/lib/weatherIcons";

export default function WeatherStripe({ settings }: { settings?: UserSettings }) {
  const zip = settings?.locationZip ?? "07652";
  const { data } = usePolling<WeatherNow>(`/api/weather?zip=${zip}`, 10 * 60_000);

  if (!data || !("temp" in data)) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-panel2/60 px-3 py-1.5 text-xs text-zinc-500">
        <span>🌤️</span>
        <span>Loading weather…</span>
      </div>
    );
  }

  const items = [
    { name: "Now", temp: data.temp, condition: data.condition },
    ...data.forecast.slice(0, 4).map((p) => ({
      name: shortPeriodName(p.name),
      temp: p.temp,
      condition: p.short,
    })),
  ];

  return (
    <div className="flex items-center gap-3 rounded-lg bg-panel2/60 px-3 py-1.5">
      {items.map((p, i) => (
        <div
          key={p.name + i}
          className={`flex items-center gap-1.5 ${i === 0 ? "" : "border-l border-zinc-700 pl-3"}`}
          title={p.condition}
        >
          <span className="text-lg leading-none">{weatherIcon(p.condition)}</span>
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500">{p.name}</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {Math.round(p.temp)}°
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
