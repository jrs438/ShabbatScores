"use client";
import { useEffect, useMemo, useState } from "react";
import { usePolling } from "./usePolling";
import type { Game } from "@/lib/types";

type Resp = { byLeague: Record<string, Game[]> };

const LEAGUE_ORDER = ["MLB", "NBA", "NHL", "NFL", "CFB", "CBB"];

function ScoreLine({ g }: { g: Game }) {
  const isLive = g.status === "live";
  const isFinal = g.status === "final";
  const wAway = isFinal && (g.away.score ?? -1) > (g.home.score ?? -1);
  const wHome = isFinal && (g.home.score ?? -1) > (g.away.score ?? -1);
  return (
    <div className="flex h-full flex-1 flex-col justify-center px-3 py-1.5">
      <div className="flex items-center justify-between gap-3 leading-tight">
        <span className={`text-sm font-semibold ${wAway ? "text-good" : ""}`}>
          {g.away.abbr}
        </span>
        <span className={`font-mono text-base tabular-nums ${wAway ? "text-good" : ""}`}>
          {g.away.score ?? "—"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 leading-tight">
        <span className={`text-sm font-semibold ${wHome ? "text-good" : ""}`}>
          {g.home.abbr}
        </span>
        <span className={`font-mono text-base tabular-nums ${wHome ? "text-good" : ""}`}>
          {g.home.score ?? "—"}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wider">
        {isLive && <span className="live-dot !h-1.5 !w-1.5" />}
        <span className={isLive ? "text-bad" : "text-zinc-500"}>{g.statusDetail}</span>
      </div>
    </div>
  );
}

export default function ScoreTickerBox() {
  const { data } = usePolling<Resp>("/api/scoreticker", 90_000, { byLeague: {} });
  const byLeague = data?.byLeague ?? {};

  // Only show leagues that have at least one game today.
  const availableLeagues = useMemo(
    () => LEAGUE_ORDER.filter((l) => (byLeague[l]?.length ?? 0) > 0),
    [byLeague]
  );

  const [leagueIdx, setLeagueIdx] = useState(0);
  const [gameIdx, setGameIdx] = useState(0);

  // Cycle: advance through games within a league, then jump to next league.
  useEffect(() => {
    if (availableLeagues.length === 0) return;
    const id = setInterval(() => {
      setGameIdx((gi) => {
        const league = availableLeagues[leagueIdx];
        const total = byLeague[league]?.length ?? 0;
        if (total === 0 || gi + 1 >= total) {
          setLeagueIdx((li) => (li + 1) % availableLeagues.length);
          return 0;
        }
        return gi + 1;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [availableLeagues, leagueIdx, byLeague]);

  if (availableLeagues.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-panel2/80 px-3 text-[10px] text-zinc-500">
        No games
      </div>
    );
  }

  const activeLeague = availableLeagues[leagueIdx % availableLeagues.length];
  const games = byLeague[activeLeague] ?? [];
  const activeGame = games[gameIdx % games.length];

  return (
    <div className="flex h-full items-stretch bg-panel2/95">
      {/* League selector strip */}
      <div className="flex flex-col bg-bg/80 px-1.5 py-1 text-[10px] font-bold">
        {availableLeagues.map((l, i) => (
          <div
            key={l}
            className={`flex h-full items-center justify-center px-1 transition ${
              i === leagueIdx ? "text-white" : "text-zinc-600"
            }`}
            style={{ minHeight: i === leagueIdx ? 0 : "auto" }}
          >
            <span
              className={
                i === leagueIdx
                  ? "rounded bg-accent/40 px-1.5 py-0.5 text-white"
                  : ""
              }
            >
              {l}
            </span>
          </div>
        ))}
      </div>
      {/* Score readout */}
      {activeGame ? <ScoreLine g={activeGame} /> : null}
    </div>
  );
}
