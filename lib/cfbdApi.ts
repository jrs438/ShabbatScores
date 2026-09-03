import type { Game, GameStatus } from "./types";
import { teamFullId } from "./teams";

// CollegeFootballData.com — free tier, one Bearer token covers both CFB and
// men's CBB. Set CFBD_API_KEY in the environment.
//   CFB scoreboard:  GET /scoreboard  (returns today + very-near games)
//   CBB scoreboard:  GET /scoreboard  under the /basketball prefix
// The scoreboard endpoint is the cheapest, so we use it and filter locally.
//
// CFBD IDs are the same numeric IDs ESPN uses for teams, so we can map
// straight into our canonical `league:espnId` scheme without a lookup table.

const CFBD_BASE = "https://api.collegefootballdata.com";

function auth(): HeadersInit {
  const key = process.env.CFBD_API_KEY;
  return {
    Accept: "application/json",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

type CfbdTeamSide = {
  id?: number;
  name?: string;
  conference?: string;
  homeAway?: "home" | "away";
  points?: number | null;
  lineScores?: number[];
};

type CfbdScoreboardGame = {
  id: number;
  startDate?: string;
  startTimeTBD?: boolean;
  tv?: string;
  neutralSite?: boolean;
  conferenceGame?: boolean;
  status?: string; // "scheduled" | "in_progress" | "completed"
  period?: number;
  clock?: string;
  possession?: string;
  lastPlay?: string;
  homeTeam?: CfbdTeamSide & { classification?: string };
  awayTeam?: CfbdTeamSide & { classification?: string };
  venue?: { name?: string; city?: string; state?: string };
  weather?: unknown;
  city?: string;
  state?: string;
};

function mapCfbdStatus(s?: string): GameStatus {
  const v = (s ?? "").toLowerCase();
  if (v === "in_progress" || v === "live") return "live";
  if (v === "completed" || v === "final") return "final";
  if (v === "postponed") return "postponed";
  if (v === "delayed") return "delayed";
  return "scheduled";
}

function statusDetail(g: CfbdScoreboardGame, league: "cfb" | "cbb"): string {
  const st = mapCfbdStatus(g.status);
  if (st === "final") return "Final";
  if (st === "live") {
    const p = g.period ?? 0;
    if (league === "cbb") {
      const half = p > 2 ? `OT${p - 2}` : p === 2 ? "2nd" : "1st";
      return g.clock ? `${half} ${g.clock}` : half;
    }
    // Football quarters
    const q = p > 4 ? `OT${p - 4}` : `Q${p || 1}`;
    return g.clock ? `${q} ${g.clock}` : q;
  }
  if (g.startDate) {
    try {
      const d = new Date(g.startDate);
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
      }).format(d);
    } catch {
      /* ignore */
    }
  }
  return "Scheduled";
}

function teamInfo(
  side: CfbdTeamSide | undefined,
  sportPath: "college-football" | "mens-college-basketball"
) {
  const espnId = side?.id != null ? String(side.id) : "";
  const name = side?.name ?? "";
  // ESPN CDN keys logos under the sport path.
  const logoPath =
    sportPath === "college-football" ? "ncaa" : "ncaa";
  return {
    id: espnId ? teamFullId(sportPath, espnId) : `${sportPath}:unmapped`,
    name,
    abbr: name.slice(0, 4).toUpperCase(),
    score: typeof side?.points === "number" ? side.points : null,
    logo: espnId
      ? `https://a.espncdn.com/i/teamlogos/${logoPath}/500/${espnId}.png`
      : null,
    record: undefined,
  };
}

async function fetchCfbdScoreboard(
  path: string,
  yyyymmddDates: string[],
  league: "cfb" | "cbb"
): Promise<Game[]> {
  if (!process.env.CFBD_API_KEY) return [];
  try {
    const res = await fetch(`${CFBD_BASE}${path}`, {
      next: { revalidate: 60 },
      headers: auth(),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`CFBD ${path} ${res.status}`);
      return [];
    }
    const data = (await res.json()) as CfbdScoreboardGame[];
    const wanted = new Set(yyyymmddDates);
    const sportPath: "college-football" | "mens-college-basketball" =
      league === "cfb" ? "college-football" : "mens-college-basketball";
    const label = league === "cfb" ? "CFB" : "CBB";
    const sport = league === "cfb" ? "football" : "basketball";
    const out: Game[] = [];
    for (const g of data) {
      if (!g.homeTeam || !g.awayTeam) continue;
      const iso = g.startDate ? new Date(g.startDate).toISOString() : "";
      const dateKey = iso ? iso.slice(0, 10).replace(/-/g, "") : "";
      if (dateKey && wanted.size > 0 && !wanted.has(dateKey)) continue;
      const home = teamInfo(g.homeTeam, sportPath);
      const away = teamInfo(g.awayTeam, sportPath);
      out.push({
        id: `${sportPath}-${g.id}`,
        espnEventId: String(g.id),
        league: label,
        leagueKey: sportPath,
        sport,
        status: mapCfbdStatus(g.status),
        statusDetail: statusDetail(g, league),
        startTime: iso,
        period: g.period != null ? String(g.period) : null,
        clock: g.clock ?? null,
        home,
        away,
        followed: false,
        primary: false,
        isPlayoff: false,
        venue: g.venue?.name,
        broadcast: g.tv ?? undefined,
        detail: g.lastPlay ? { lastPlay: g.lastPlay } : undefined,
      });
    }
    return out;
  } catch (e) {
    console.error(`CFBD ${path} failed`, e);
    return [];
  }
}

export async function fetchCfbGames(yyyymmddDates: string[]): Promise<Game[]> {
  return fetchCfbdScoreboard("/scoreboard", yyyymmddDates, "cfb");
}

export async function fetchCbbGames(yyyymmddDates: string[]): Promise<Game[]> {
  // CFBD's basketball surface lives under the same host with a /basketball prefix.
  return fetchCfbdScoreboard("/basketball/scoreboard", yyyymmddDates, "cbb");
}
