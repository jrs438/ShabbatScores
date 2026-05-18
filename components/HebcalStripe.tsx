"use client";
import { usePolling } from "./usePolling";
import type { HebcalInfo } from "@/lib/types";
import type { UserSettings } from "@/lib/settings";

export default function HebcalStripe({ settings }: { settings?: UserSettings }) {
  const zip = settings?.locationZip ?? "07652";
  const { data } = usePolling<HebcalInfo>(`/api/hebcal?zip=${zip}`, 60 * 60_000);

  if (!data || !("parashah" in data)) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-panel2/60 px-3 py-1.5 text-xs text-zinc-500">
        <span>🕯</span>
        <span>Loading Shabbat times…</span>
      </div>
    );
  }

  // When the upcoming Shabbat coincides with a holiday (no parashah), the
  // holiday name itself is the "what's happening" label. Otherwise show the
  // parashah and demote the holiday to a footnote.
  const primaryLabel = data.parashah ?? data.holidays[0] ?? null;
  const secondaryHoliday = data.parashah ? data.holidays[0] : data.holidays[1];

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg px-3 py-1.5 text-sm ${
        data.isShabbat ? "bg-accent2/15 ring-1 ring-accent2/40" : "bg-panel2/60"
      }`}
    >
      {data.isShabbat && (
        <span className="rounded bg-accent2/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent2">
          Shabbat now
        </span>
      )}
      {primaryLabel && (
        <span className="font-semibold text-zinc-200">{primaryLabel}</span>
      )}
      {data.candleLighting && (
        <span className="flex items-center gap-1 text-zinc-300">
          <span>🕯</span>
          <span className="font-mono tabular-nums">{data.candleLighting}</span>
        </span>
      )}
      {data.havdalah && (
        <span className="flex items-center gap-1 text-zinc-300">
          <span>✨</span>
          <span className="font-mono tabular-nums">{data.havdalah}</span>
        </span>
      )}
      {data.hdate && <span className="text-xs text-zinc-500">{data.hdate}</span>}
      {secondaryHoliday && (
        <span className="text-xs text-accent2">· {secondaryHoliday}</span>
      )}
    </div>
  );
}
