"use client";
import { usePolling } from "./usePolling";

type Pick = {
  round: number;
  pickInRound: number;
  overallPick: number;
  teamAbbrev: string;
  playerName: string;
  position: string;
  country: string;
  pickDateTime: string | null;
};
type Resp = { picks: Pick[]; updatedAt?: string };

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function NhlDraftCard() {
  const { data, lastFetched } = usePolling<Resp>("/api/nhl-draft", 60_000, { picks: [] });
  const picks = data?.picks ?? [];
  const latest = picks.slice(0, 12);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-accent2/40 bg-panel/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent2 animate-pulse" />
          NHL Draft
        </h2>
        <span className="text-[10px] text-zinc-600">
          {lastFetched
            ? `updated ${lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
            : ""}
        </span>
      </div>

      {latest.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Waiting for first pick…
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
          {latest.map((p) => (
            <div
              key={p.overallPick}
              className="flex items-center gap-3 rounded-lg bg-panel2/70 px-2.5 py-1.5"
            >
              <div className="flex w-12 shrink-0 flex-col items-center">
                <span className="font-mono text-base font-bold tabular-nums text-accent2">
                  {p.round}.{p.pickInRound}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                  #{p.overallPick}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-zinc-100">
                  {p.playerName}
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                  <span className="rounded bg-bad/20 px-1 font-bold text-bad">
                    {p.teamAbbrev}
                  </span>
                  {p.position && <span>{p.position}</span>}
                  {p.country && <span>{p.country}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
