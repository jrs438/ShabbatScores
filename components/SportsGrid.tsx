"use client";
import { useEffect, useMemo, useState } from "react";
import { usePolling } from "./usePolling";
import FeaturedGameCard from "./FeaturedGameCard";
import type { Game } from "@/lib/types";
import type { UserSettings } from "@/lib/settings";

type Resp = { games: Game[]; updatedAt?: string };

function applySettings(games: Game[], settings: UserSettings | undefined): Game[] {
  if (!settings) return games;
  const followed = new Set(settings.followed);
  const primary = new Set(settings.primary);
  return games
    .map((g) => {
      const homeIn = followed.has(g.home.id);
      const awayIn = followed.has(g.away.id);
      const homePrimary = primary.has(g.home.id);
      const awayPrimary = primary.has(g.away.id);
      return {
        ...g,
        followed: homeIn || awayIn || g.isPlayoff,
        primary: homePrimary || awayPrimary,
      };
    })
    .filter((g) => g.followed);
}

function GameCard({ g, compact }: { g: Game; compact?: boolean }) {
  const live = g.status === "live";
  if (compact) {
    return (
      <div
        className={`relative rounded-xl border bg-panel/80 px-3 py-2 ${
          live ? "border-bad/60" : "border-zinc-800"
        }`}
      >
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-400">
          <span className="font-semibold text-zinc-300">{g.league}</span>
          <span className="flex items-center gap-1.5">
            {live && <span className="live-dot !h-1.5 !w-1.5" />}
            <span className={live ? "font-semibold text-bad" : ""}>{g.statusDetail}</span>
          </span>
        </div>
        <CompactTeamRow team={g.away} winner={isWinner(g, "away")} />
        <CompactTeamRow team={g.home} winner={isWinner(g, "home")} />
      </div>
    );
  }
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
      {g.broadcast && (
        <div className="mt-1 text-[11px] text-zinc-500">{g.broadcast}</div>
      )}
    </div>
  );
}

function CompactTeamRow({ team, winner }: { team: Game["home"]; winner: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-1.5">
        {team.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt="" className="h-4 w-4" />
        )}
        <span className="text-xs font-semibold">{team.abbr}</span>
      </div>
      <span className={`font-mono text-base tabular-nums ${winner ? "text-good" : ""}`}>
        {team.score ?? "—"}
      </span>
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
          Around the league · playoffs
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

export default function SportsGrid({
  settings,
  compact,
  wide,
}: {
  settings?: UserSettings;
  compact?: boolean;
  wide?: boolean;
}) {
  // Pass team IDs to the server so it knows which games to return (saves us
  // pulling every game across every league).
  const url = useMemo(() => {
    if (!settings) return "/api/sports";
    const params = new URLSearchParams();
    if (settings.followed.length) params.set("teams", settings.followed.join(","));
    if (settings.primary.length) params.set("primary", settings.primary.join(","));
    return `/api/sports?${params.toString()}`;
  }, [settings]);
  const { data, lastFetched } = usePolling<Resp>(url, 60_000, { games: [] });
  const games = useMemo(() => applySettings(data?.games ?? [], settings), [data, settings]);

  const { featuredGames, followedGames, leaguePlayoffs } = useMemo(() => {
    const sortByStart = (a: Game, b: Game) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    const sortByLiveness = (a: Game, b: Game) => {
      const order = { live: 0, delayed: 1, scheduled: 2, final: 3, postponed: 4 } as const;
      const d = order[a.status] - order[b.status];
      return d !== 0 ? d : sortByStart(a, b);
    };
    const featuredGames = games.filter((g) => g.primary && g.status === "live");
    const featuredSet = new Set(featuredGames);
    const followedGames = games
      .filter((g) => g.followed && !featuredSet.has(g))
      .sort(sortByLiveness);
    const leaguePlayoffs = games
      .filter((g) => !g.followed && g.isPlayoff)
      .sort(sortByLiveness);
    return { featuredGames, followedGames, leaguePlayoffs };
  }, [games]);

  // Cycle hero between all live primary games (e.g. Mets + Rangers both live).
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    setHeroIdx(0);
  }, [featuredGames.length, featuredGames[0]?.id]);
  useEffect(() => {
    if (featuredGames.length <= 1) return;
    const id = setInterval(
      () => setHeroIdx((i) => (i + 1) % featuredGames.length),
      18_000
    );
    return () => clearInterval(id);
  }, [featuredGames.length]);
  const featured = featuredGames[heroIdx % Math.max(featuredGames.length, 1)] ?? null;

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

      {featured && (
        <div>
          <FeaturedGameCard g={featured} />
          {featuredGames.length > 1 && (
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
              <span>
                Live · {heroIdx + 1}/{featuredGames.length}
              </span>
              <div className="flex gap-1.5">
                {featuredGames.map((g, i) => (
                  <span
                    key={g.id}
                    className={`h-1 rounded-full transition-all ${
                      i === heroIdx ? "w-5 bg-bad" : "w-1.5 bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {followedGames.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Your teams
          </h3>
          {featured || compact ? (
            <div
              className={
                wide
                  ? "grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                  : "grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4"
              }
            >
              {followedGames.map((g) => (
                <GameCard key={g.id} g={g} compact />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {followedGames.map((g) => (
                <GameCard key={g.id} g={g} />
              ))}
            </div>
          )}
        </div>
      )}

      {leaguePlayoffs.length > 0 && <CyclingPanel games={leaguePlayoffs} />}
    </div>
  );
}
