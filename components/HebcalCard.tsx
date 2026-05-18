"use client";
import { usePolling } from "./usePolling";
import type { HebcalInfo } from "@/lib/types";

export default function HebcalCard() {
  const { data } = usePolling<HebcalInfo>("/api/hebcal", 60 * 60_000);
  if (!data || !("parashah" in data)) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-panel/60 p-4 text-zinc-500">
        Loading Shabbat times…
      </div>
    );
  }
  return (
    <div className={`rounded-2xl border p-4 ${data.isShabbat ? "border-accent2/60 bg-accent2/5" : "border-zinc-800 bg-panel/80"}`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Shabbat</h2>
        {data.isShabbat && (
          <span className="rounded bg-accent2/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent2">
            Shabbat now
          </span>
        )}
      </div>
      {data.parashah && (
        <div className="text-lg font-semibold">{data.parashah}</div>
      )}
      {data.hdate && <div className="text-sm text-zinc-400">{data.hdate}</div>}
      <div className="mt-3 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-panel2 p-2">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Candle Lighting</div>
          <div className="font-mono text-xl tabular-nums">{data.candleLighting ?? "—"}</div>
        </div>
        <div className="rounded-lg bg-panel2 p-2">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Havdalah</div>
          <div className="font-mono text-xl tabular-nums">{data.havdalah ?? "—"}</div>
        </div>
      </div>
      {data.holidays.length > 0 && (
        <div className="mt-3 text-sm text-zinc-300">
          {data.holidays.map((h) => (
            <div key={h}>🕯 {h}</div>
          ))}
        </div>
      )}
    </div>
  );
}
