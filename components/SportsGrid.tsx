"use client";
import { useEffect, useMemo, useState } from "react";
import { usePolling } from "./usePolling";
import FeaturedGameCard from "./FeaturedGameCard";
import type { Game } from "@/lib/types";

type Resp = { games: Game[]; updatedAt?: string };

function GameCard({ g, compact }: { g: Game; compact?: boolean }) {
  const live = g.status === "live";
  return (
    <div
      className={`relative rounded-2xl border bg-panel/80 px-4 py-3 ${
        live ? "border-bad/60" : "border-zinc-800"
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">{g.league}</span>
          {g.isPlayoff && (
            <span className="rounded bg-accent2/20 px-1.5 py-0.5 text-[10px] font-bold text-accent2">
              PLAYOFFS
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {live && <span className="live-dot" />}
          <span className={live ? "font-semibold text-bad" : ""}>{g.statusDetail}</span>
        </span>
      </div>
      <TeamRow team={g.away} winner={isWinner(g, "away")} />
      <TeamRow team={g.home} winner={isWinner(g, "home")} />
      {!compact && g.broadcast && (
        <div className="mt-1 text-[11px] text-zinc-500">{g.broadcast}</div>
      )}
    </div>
  );
}

function isWinner(g: Game, side: "home" | "away"): boolean {
  if (g.status !== "final") return false;
  const a = g.away.score ?? -1;
  const h = g.home.score ?? -1;
  return side === "home" ? h > a : a > h;
}

function TeamRow({ team, winner }: { team: Game["home"]; winner: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {team.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt="" className="h-6 w-6" />
        )}
        <span className="font-medium">{team.name}</span>
        {team.record && <span className="text-xs text-zinc-500">{team.record}</span>}
      </div>
      <span className={`font-mono text-xl tabular-nums ${winner ? "text-good" : ""}`}>
        {team.score ?? "—"}
      </span>
    </div>
  );
}

function CyclingPanel({ games }: { games: Game[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (games.length <= 1) return;
    const id = setInterval(() => setI((x) => (x + 1) % games.length), 7000);
    return () => clearInterval(id);
  }, [games.length]);

  if (games.length === 0) return null;
  const visible = games[i % games.length];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Other games
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>
            {((i % games.length) + 1)}/{games.length}
          </span>
          <div className="flex gap-1">
            {games.map((_, idx) => (
              <span
                key={idx}
                className={`h-1 w-1 rounded-full ${
                  idx === i % games.length ? "bg-accent" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <GameCard g={visible} />
    </div>
  );
}

export default function SportsGrid() {
  const { data, lastFetched } = usePolling<Resp>("/api/sports", 30_000, { games: [] });
  const games = data?.games ?? [];

  const { featured, primaryOther, otherGames } = useMemo(() => {
    const primary = games.filter((g) => g.primary);
    const liveOrFinal = (g: Game) => g.status === "live" || g.status === "final";
    const featured = primary.find((g) => g.status === "live") ?? null;
    // Primary games not featured: shown as small cards (today's not-yet-live + finals)
    const primaryOther = primary.filter((g) => g !== featured);
    const otherGames = games.filter((g) => !g.primary).sort((a, b) => {
      const live = Number(b.status === "live") - Number(a.status === "live");
      if (live !== 0) return live;
      const fin = Number(liveOrFinal(b)) - Number(liveOrFinal(a));
      if (fin !== 0) return fin;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
    return { featured, primaryOther, otherGames };
  }, [games]);

  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-panel/60 p-6 text-center text-zinc-500">
        No followed teams or playoff games today.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Scores</h2>
        {lastFetched && (
          <span className="text-[10px] text-zinc-600">
            updated{" "}
            {lastFetched.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>

      {featured && <FeaturedGameCard g={featured} />}

      {primaryOther.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {primaryOther.map((g) => (
            <GameCard key={g.id} g={g} />
          ))}
        </div>
      )}

      {otherGames.length > 0 && <CyclingPanel games={otherGames} />}
    </div>
  );
}
