"use client";
import type { Game } from "@/lib/types";

function TeamBlock({
  team,
  winner,
  hasBall,
}: {
  team: Game["home"];
  winner: boolean;
  hasBall?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {team.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="h-12 w-12" />
      )}
      <div className="text-center">
        <div className={`text-base font-bold ${winner ? "text-good" : ""}`}>{team.name}</div>
        {team.record && <div className="text-[10px] text-zinc-500">{team.record}</div>}
      </div>
      <div className={`font-mono text-4xl tabular-nums ${winner ? "text-good" : ""}`}>
        {team.score ?? "—"}
        {hasBall && <span className="ml-1 text-accent2">●</span>}
      </div>
    </div>
  );
}

function Diamond({ d }: { d: NonNullable<Game["detail"]> }) {
  const base = (on: boolean | undefined) =>
    `h-4 w-4 rotate-45 border ${on ? "border-accent2 bg-accent2" : "border-zinc-600 bg-transparent"}`;
  return (
    <div className="relative h-20 w-20">
      <div className={`absolute left-1/2 top-0 -translate-x-1/2 ${base(d.onSecond)}`} />
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 ${base(d.onThird)}`} />
      <div className={`absolute right-0 top-1/2 -translate-y-1/2 ${base(d.onFirst)}`} />
      <div className={`absolute left-1/2 bottom-0 -translate-x-1/2 ${base(false)}`} />
    </div>
  );
}

function Outs({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full ${i < count ? "bg-bad" : "border border-zinc-600"}`}
        />
      ))}
    </div>
  );
}

export default function FeaturedGameCard({ g }: { g: Game }) {
  const isWinner = (side: "home" | "away") => {
    if (g.status !== "final") return false;
    const a = g.away.score ?? -1;
    const h = g.home.score ?? -1;
    return side === "home" ? h > a : a > h;
  };
  const isBaseball = g.sport === "baseball";
  const isFootball = g.sport === "football";
  const d = g.detail;

  return (
    <div className="rounded-2xl border-2 border-bad/60 bg-gradient-to-br from-panel via-panel2 to-panel p-4 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="live-dot" />
          <span className="font-bold text-bad uppercase tracking-wider">{g.statusDetail}</span>
          <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">
            {g.league}
          </span>
          {g.isPlayoff && (
            <span className="rounded bg-accent2/20 px-2 py-0.5 text-xs font-bold text-accent2">
              PLAYOFFS
            </span>
          )}
        </div>
        {g.broadcast && <span className="text-xs text-zinc-500">{g.broadcast}</span>}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <TeamBlock
          team={g.away}
          winner={isWinner("away")}
          hasBall={isFootball && d?.possession === g.away.abbr}
        />
        <div className="flex flex-col items-center gap-2 text-zinc-500">
          {isBaseball && d && (
            <>
              <Diamond d={d} />
              {d.outs != null && <Outs count={d.outs} />}
              {d.balls != null && d.strikes != null && (
                <div className="font-mono text-sm">
                  {d.balls}-{d.strikes}
                </div>
              )}
            </>
          )}
          {isFootball && d && (
            <div className="text-center">
              {d.down && <div className="text-lg font-bold text-zinc-200">{d.down}</div>}
              {d.possession && <div className="text-xs text-zinc-500">{d.possession} ball</div>}
            </div>
          )}
          {!isBaseball && !isFootball && (
            <div className="text-center">
              {g.clock && <div className="font-mono text-2xl tabular-nums">{g.clock}</div>}
              {g.period && <div className="text-xs uppercase text-zinc-500">P{g.period}</div>}
            </div>
          )}
        </div>
        <TeamBlock
          team={g.home}
          winner={isWinner("home")}
          hasBall={isFootball && d?.possession === g.home.abbr}
        />
      </div>

      {d?.lastPlay && (
        <div className="mt-3 rounded-lg bg-bg/60 p-2 text-xs">
          <div className="mb-0.5 text-[10px] uppercase tracking-wider text-zinc-500">Last play</div>
          <div className="line-clamp-2 text-zinc-200">{d.lastPlay}</div>
        </div>
      )}

      {isBaseball && d && (d.batter || d.pitcher) && (
        <div className="mt-3 flex justify-around text-xs">
          {d.pitcher && (
            <div>
              <span className="text-zinc-500">P: </span>
              <span className="text-zinc-200">{d.pitcher}</span>
            </div>
          )}
          {d.batter && (
            <div>
              <span className="text-zinc-500">AB: </span>
              <span className="text-zinc-200">{d.batter}</span>
            </div>
          )}
        </div>
      )}

      {d?.winProb && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-zinc-500">
            <span>Win prob</span>
            <span>
              {g.away.abbr} {d.winProb.away}% · {g.home.abbr} {d.winProb.home}%
            </span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-bg">
            <div className="bg-accent" style={{ width: `${d.winProb.away}%` }} />
            <div className="bg-accent2" style={{ width: `${d.winProb.home}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
