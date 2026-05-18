"use client";
import { usePolling } from "./usePolling";
import type { WeatherNow } from "@/lib/types";
import type { UserSettings } from "@/lib/settings";

export default function WeatherCard({ settings }: { settings?: UserSettings }) {
  const zip = settings?.locationZip ?? "07652";
  const { data } = usePolling<WeatherNow>(`/api/weather?zip=${zip}`, 10 * 60_000);
  if (!data || !("temp" in data)) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-panel/60 p-4 text-zinc-500">
        Loading weather…
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-zinc-800 bg-panel/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {settings?.locationLabel ?? "Paramus, NJ"}
        </h2>
        <span className="text-[10px] text-zinc-600">NWS</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-5xl tabular-nums">{Math.round(data.temp)}°</span>
        <span className="text-lg text-zinc-300">{data.condition}</span>
      </div>
      <div className="mt-1 text-sm text-zinc-500">Wind {data.wind}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {data.forecast.slice(0, 6).map((p) => (
          <div key={p.name} className="rounded-lg bg-panel2 p-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">
              {p.name.length > 9 ? p.name.slice(0, 9) : p.name}
            </div>
            <div className="font-mono text-lg tabular-nums">{p.temp}°</div>
            <div className="truncate text-[10px] text-zinc-400">{p.short}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
