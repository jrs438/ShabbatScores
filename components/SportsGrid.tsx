"use client";
import { usePolling } from "./usePolling";
import type { Game } from "@/lib/types";

type Resp = { games: Game[]; updatedAt?: string };

function GameCard({ g }: { g: Game }) {
  const live = g.status === "live";
  return (
    <div
      className={`relative rounded-2xl border bg-panel/80 px-4 py-3 ${
        live ? "border-bad/60 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]" : "border-zinc-800"
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">{g.league}</span>
          {g.isPlayoff && (
            <span className="rounded bg-accent2/20 px-1.5 py-0.5 text-[10px] font-bold text-accent2">PLAYOFFS</span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {live && <span className="live-dot" />}
          <span className={live ? "font-semibold text-bad" : ""}>{g.statusDetail}</span>
        </span>
      </div>
      <TeamRow team={g.away} score={g.away.score} winner={isWinner(g, "away")} />
      <TeamRow team={g.home} score={g.home.score} winner={isWinner(g, "home")} />
      {g.broadcast && <div className="mt-1 text-[11px] text-zinc-500">{g.broadcast}</div>}
    </div>
  );
}

function isWinner(g: Game, side: "home" | "away"): boolean {
  if (g.status !== "final") return false;
  const a = g.away.score ?? -1;
  const h = g.home.score ?? -1;
  if (side === "home") return h > a;
  return a > h;
}

function TeamRow({
  team,
  score,
  winner,
}: {
  team: Game["home"];
  score: number | null;
  winner: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1 ${winner ? "" : "opacity-90"}`}>
      <div className="flex items-center gap-2">
        {team.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt="" className="h-6 w-6" />
        )}
        <span className="font-medium">{team.name}</span>
        {team.record && <span className="text-xs text-zinc-500">{team.record}</span>}
      </div>
      <span className={`font-mono text-xl tabular-nums ${winner ? "text-good" : ""}`}>
        {score ?? "—"}
      </span>
    </div>
  );
}

export default function SportsGrid() {
  // 30s refresh — ESPN cache is 30s anyway, this keeps live games near-realtime.
  const { data, lastFetched } = usePolling<Resp>("/api/sports", 30_000, { games: [] });
  const games = data?.games ?? [];
  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-panel/60 p-6 text-center text-zinc-500">
        No followed teams or playoff games today.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Scores</h2>
        {lastFetched && (
          <span className="text-[10px] text-zinc-600">
            updated {lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {games.map((g) => (
          <GameCard key={g.id} g={g} />
        ))}
      </div>
    </div>
  );
}
