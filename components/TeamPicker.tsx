"use client";
import { useEffect, useMemo, useState } from "react";
import { LEAGUE_LABEL, type LeagueKey } from "@/lib/teams";
import type { CatalogTeam } from "@/lib/teamCatalog";

type CatalogResp = { byLeague: Record<LeagueKey, CatalogTeam[]> };

const LEAGUE_FILTERS: { key: LeagueKey | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mlb", label: "MLB" },
  { key: "nfl", label: "NFL" },
  { key: "nba", label: "NBA" },
  { key: "nhl", label: "NHL" },
  { key: "college-football", label: "CFB" },
  { key: "mens-college-basketball", label: "CBB" },
];

type Props = {
  followed: string[];
  primary: string[];
  onToggleFollow: (id: string) => void;
  onTogglePrimary: (id: string) => void;
};

export default function TeamPicker({ followed, primary, onToggleFollow, onTogglePrimary }: Props) {
  const [catalog, setCatalog] = useState<CatalogResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeLeague, setActiveLeague] = useState<LeagueKey | "all">("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((data: CatalogResp) => {
        if (!cancelled) {
          setCatalog(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allTeams: CatalogTeam[] = useMemo(() => {
    if (!catalog?.byLeague) return [];
    return Object.values(catalog.byLeague).flat();
  }, [catalog]);

  const teamById = useMemo(() => {
    const m = new Map<string, CatalogTeam>();
    for (const t of allTeams) m.set(t.id, t);
    return m;
  }, [allTeams]);

  const followedSet = new Set(followed);
  const primarySet = new Set(primary);

  const selectedTeams = useMemo(
    () =>
      followed
        .map((id) => teamById.get(id))
        .filter((t): t is CatalogTeam => !!t),
    [followed, teamById]
  );

  const searchResults = useMemo(() => {
    if (!query.trim() && activeLeague === "all") return [];
    const q = query.trim().toLowerCase();
    let base = activeLeague === "all" ? allTeams : catalog?.byLeague[activeLeague] ?? [];
    if (q) {
      base = base.filter(
        (t) =>
          t.displayName.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.abbr.toLowerCase().includes(q)
      );
    }
    // Show non-selected first, then selected at bottom
    base = [...base].sort((a, b) => {
      const fa = followedSet.has(a.id) ? 1 : 0;
      const fb = followedSet.has(b.id) ? 1 : 0;
      if (fa !== fb) return fa - fb;
      return a.displayName.localeCompare(b.displayName);
    });
    return base.slice(0, 60);
  }, [query, activeLeague, allTeams, catalog, followedSet]);

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Your teams ({selectedTeams.length})
      </h4>
      <div className="flex flex-col gap-1.5">
        {selectedTeams.length === 0 ? (
          <p className="rounded-md bg-panel2/60 px-3 py-2 text-xs text-zinc-500">
            No teams selected. Search below to add some.
          </p>
        ) : (
          selectedTeams.map((t) => (
            <TeamRow
              key={t.id}
              team={t}
              isFollowed
              isPrimary={primarySet.has(t.id)}
              onToggleFollow={() => onToggleFollow(t.id)}
              onTogglePrimary={() => onTogglePrimary(t.id)}
            />
          ))
        )}
      </div>

      <h4 className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Add or remove
      </h4>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by team name, city, or abbreviation"
        className="rounded-md bg-bg px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-accent"
      />
      <div className="flex flex-wrap gap-1.5">
        {LEAGUE_FILTERS.map((l) => (
          <button
            key={l.key}
            onClick={() => setActiveLeague(l.key)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              activeLeague === l.key
                ? "bg-accent text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {loading ? (
          <p className="rounded-md bg-panel2/60 px-3 py-2 text-xs text-zinc-500">
            Loading team catalog…
          </p>
        ) : searchResults.length === 0 ? (
          <p className="rounded-md bg-panel2/60 px-3 py-2 text-xs text-zinc-500">
            {query || activeLeague !== "all"
              ? "No teams match."
              : "Type to search, or filter by league."}
          </p>
        ) : (
          searchResults.map((t) => (
            <TeamRow
              key={t.id}
              team={t}
              isFollowed={followedSet.has(t.id)}
              isPrimary={primarySet.has(t.id)}
              onToggleFollow={() => onToggleFollow(t.id)}
              onTogglePrimary={() => onTogglePrimary(t.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TeamRow({
  team,
  isFollowed,
  isPrimary,
  onToggleFollow,
  onTogglePrimary,
}: {
  team: CatalogTeam;
  isFollowed: boolean;
  isPrimary: boolean;
  onToggleFollow: () => void;
  onTogglePrimary: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-panel2 px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {team.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt="" className="h-6 w-6 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{team.displayName}</div>
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">
            {LEAGUE_LABEL[team.league]} · {team.abbr}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={onToggleFollow}
          className={`rounded px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            isFollowed ? "bg-good/20 text-good" : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {isFollowed ? "✓" : "+"}
        </button>
        <button
          onClick={onTogglePrimary}
          disabled={!isFollowed}
          className={`rounded px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
            isPrimary
              ? "bg-accent2/30 text-accent2"
              : "bg-zinc-800 text-zinc-500 disabled:opacity-40"
          }`}
        >
          ★
        </button>
      </div>
    </div>
  );
}
