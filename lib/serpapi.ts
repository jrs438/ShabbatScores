// SerpAPI fallback for niche cases ESPN's free feed misses or is slow on
// (e.g. between-period college games). Only used when SERPAPI_KEY is set.

import type { Game } from "./types";

const SERP_BASE = "https://serpapi.com/search.json";

type SerpGameSpotlight = {
  league?: string;
  game_spotlight?: {
    league?: string;
    status?: string;
    date?: string;
    venue?: string;
    teams?: {
      name?: string;
      thumbnail?: string;
      score?: string;
      record?: string;
    }[];
  };
};

export async function fetchSerpScore(query: string): Promise<Partial<Game> | null> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return null;
  const url = new URL(SERP_BASE);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", `${query} score`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = (await res.json()) as SerpGameSpotlight;
    const spot = data.game_spotlight;
    if (!spot?.teams || spot.teams.length < 2) return null;
    const [away, home] = spot.teams;
    return {
      id: `serp-${query.replace(/\s+/g, "_").toLowerCase()}`,
      league: spot.league ?? data.league ?? "",
      status: /final/i.test(spot.status ?? "")
        ? "final"
        : /live|in progress|inning|quarter|period/i.test(spot.status ?? "")
        ? "live"
        : "scheduled",
      statusDetail: spot.status ?? "",
      startTime: spot.date ?? "",
      period: null,
      clock: null,
      home: {
        name: home.name ?? "",
        abbr: (home.name ?? "").slice(0, 3).toUpperCase(),
        score: home.score != null ? Number(home.score) : null,
        logo: home.thumbnail ?? null,
        record: home.record,
      },
      away: {
        name: away.name ?? "",
        abbr: (away.name ?? "").slice(0, 3).toUpperCase(),
        score: away.score != null ? Number(away.score) : null,
        logo: away.thumbnail ?? null,
        record: away.record,
      },
      followed: true,
      isPlayoff: false,
      venue: spot.venue,
    };
  } catch {
    return null;
  }
}
