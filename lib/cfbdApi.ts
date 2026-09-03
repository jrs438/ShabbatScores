import type { Game, GameStatus } from "./types";
import { teamFullId } from "./teams";

// CollegeFootballData.com — free tier, one Bearer token covers both CFB and
// men's CBB. Set CFBD_API_KEY in the environment.
//
// Endpoint choice:
//   /scoreboard  — only returns games close to game-time; empty for morning
//                  fetches. We use it to *overlay* live status onto games
//                  we already found via /games.
//   /games       — canonical schedule endpoint. Requires (year, week) or
//                  team; returns final scores when the game is over.
//   /calendar    — tells us which week each date falls into.
//
// CFBD ships ESPN numeric team IDs so no mapping table is needed.

const CFBD_BASE = "https://api.collegefootballdata.com";

function auth(): HeadersInit {
  const key = process.env.CFBD_API_KEY;
  return {
    Accept: "application/json",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

// ---------- /calendar (football) ----------

type CfbdCalendarWeek = {
  season: number;
  week: number;
  seasonType: string; // "regular" | "postseason"
  firstGameStart?: string;
  lastGameStart?: string;
};

let calendarCache: { year: number; weeks: CfbdCalendarWeek[]; ts: number } | null = null;

async function fetchCalendar(year: number): Promise<CfbdCalendarWeek[]> {
  const now = Date.now();
  if (
    calendarCache &&
    calendarCache.year === year &&
    now - calendarCache.ts < 24 * 60 * 60 * 1000
  ) {
    return calendarCache.weeks;
  }
  try {
    const res = await fetch(`${CFBD_BASE}/calendar?year=${year}`, {
      next: { revalidate: 86400 },
      headers: auth(),
    });
    if (!res.ok) return [];
    const weeks = (await res.json()) as CfbdCalendarWeek[];
    calendarCache = { year, weeks, ts: now };
    return weeks;
  } catch (e) {
    console.error("CFBD /calendar failed", e);
    return [];
  }
}

// yyyymmdd (ET) -> {year, week, seasonType} using the CFBD calendar.
async function weeksForDates(
  yyyymmddDates: string[]
): Promise<{ year: number; week: number; seasonType: string }[]> {
  if (yyyymmddDates.length === 0) return [];
  // Assume all dates fall in the same calendar year (they always do within
  // a scoreboardDates() window).
  const year = parseInt(yyyymmddDates[0].slice(0, 4), 10);
  const weeks = await fetchCalendar(year);
  if (weeks.length === 0) {
    // No calendar — fall back to a bare guess so we still return something.
    return [{ year, week: 1, seasonType: "regular" }];
  }
  const wanted = yyyymmddDates.map((s) => {
    const y = parseInt(s.slice(0, 4), 10);
    const m = parseInt(s.slice(4, 6), 10) - 1;
    const d = parseInt(s.slice(6, 8), 10);
    return Date.UTC(y, m, d);
  });
  const picks = new Map<string, { year: number; week: number; seasonType: string }>();
  for (const w of weeks) {
    if (!w.firstGameStart || !w.lastGameStart) continue;
    const start = new Date(w.firstGameStart).getTime();
    const end = new Date(w.lastGameStart).getTime();
    if (wanted.some((t) => t >= start - 12 * 3600_000 && t <= end + 12 * 3600_000)) {
      const key = `${w.season}-${w.week}-${w.seasonType}`;
      picks.set(key, { year: w.season, week: w.week, seasonType: w.seasonType });
    }
  }
  if (picks.size === 0) {
    return [{ year, week: 1, seasonType: "regular" }];
  }
  return Array.from(picks.values());
}

// ---------- /games (football) ----------

type CfbdGame = {
  id: number;
  season: number;
  week: number;
  seasonType?: string;
  startDate?: string;
  startTimeTBD?: boolean;
  completed?: boolean;
  neutralSite?: boolean;
  conferenceGame?: boolean;
  attendance?: number | null;
  venueId?: number;
  venue?: string;
  homeId?: number;
  homeTeam?: string;
  homeConference?: string;
  homeDivision?: string;
  homeClassification?: string;
  homePoints?: number | null;
  homeLineScores?: number[] | null;
  awayId?: number;
  awayTeam?: string;
  awayConference?: string;
  awayDivision?: string;
  awayClassification?: string;
  awayPoints?: number | null;
  awayLineScores?: number[] | null;
  notes?: string | null;
};

// ---------- /scoreboard (live overlay, football) ----------

type CfbdScoreboardGame = {
  id: number;
  startDate?: string;
  status?: string;
  period?: number;
  clock?: string;
  possession?: string;
  lastPlay?: string;
  homeTeam?: { id?: number; points?: number | null };
  awayTeam?: { id?: number; points?: number | null };
  tv?: string;
};

function mapCfbdStatus(s?: string, completed?: boolean): GameStatus {
  const v = (s ?? "").toLowerCase();
  if (v === "in_progress" || v === "live") return "live";
  if (v === "completed" || v === "final" || completed === true) return "final";
  if (v === "postponed") return "postponed";
  if (v === "delayed") return "delayed";
  return "scheduled";
}

function statusDetail(
  live: CfbdScoreboardGame | undefined,
  g: CfbdGame,
  league: "cfb" | "cbb"
): string {
  const st = mapCfbdStatus(live?.status, g.completed);
  if (st === "final") return "Final";
  if (st === "live" && live) {
    const p = live.period ?? 0;
    if (league === "cbb") {
      const half = p > 2 ? `OT${p - 2}` : p === 2 ? "2nd" : "1st";
      return live.clock ? `${half} ${live.clock}` : half;
    }
    const q = p > 4 ? `OT${p - 4}` : `Q${p || 1}`;
    return live.clock ? `${q} ${live.clock}` : q;
  }
  if (g.startDate) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(g.startDate));
    } catch {
      /* ignore */
    }
  }
  return "Scheduled";
}

function teamInfo(
  id: number | undefined,
  name: string | undefined,
  points: number | null | undefined,
  sportPath: "college-football" | "mens-college-basketball"
) {
  const espnId = id != null ? String(id) : "";
  const shown = name ?? "";
  return {
    id: espnId ? teamFullId(sportPath, espnId) : `${sportPath}:unmapped`,
    name: shown,
    abbr: shown.slice(0, 4).toUpperCase(),
    score: typeof points === "number" ? points : null,
    logo: espnId ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnId}.png` : null,
    record: undefined,
  };
}

async function fetchScoreboardOverlay(basePath: string): Promise<Map<number, CfbdScoreboardGame>> {
  if (!process.env.CFBD_API_KEY) return new Map();
  try {
    const res = await fetch(`${CFBD_BASE}${basePath}/scoreboard`, {
      next: { revalidate: 30 },
      headers: auth(),
      cache: "no-store",
    });
    if (!res.ok) return new Map();
    const list = (await res.json()) as CfbdScoreboardGame[];
    const m = new Map<number, CfbdScoreboardGame>();
    for (const g of list) m.set(g.id, g);
    return m;
  } catch (e) {
    console.error(`CFBD ${basePath}/scoreboard overlay failed`, e);
    return new Map();
  }
}

// ---------- CFB ----------

export async function fetchCfbGames(yyyymmddDates: string[]): Promise<Game[]> {
  if (!process.env.CFBD_API_KEY) return [];
  const wantedDates = new Set(yyyymmddDates);
  const weeks = await weeksForDates(yyyymmddDates);
  const overlay = await fetchScoreboardOverlay("");
  const out: Game[] = [];
  await Promise.all(
    weeks.map(async (w) => {
      try {
        const url = `${CFBD_BASE}/games?year=${w.year}&week=${w.week}&seasonType=${w.seasonType}&classification=fbs`;
        const res = await fetch(url, {
          next: { revalidate: 60 },
          headers: auth(),
          cache: "no-store",
        });
        if (!res.ok) {
          console.error(`CFBD /games ${w.year}/${w.week} ${res.status}`);
          return;
        }
        const games = (await res.json()) as CfbdGame[];
        for (const g of games) {
          if (!g.startDate || !g.homeTeam || !g.awayTeam) continue;
          const iso = new Date(g.startDate).toISOString();
          const dateKey = iso.slice(0, 10).replace(/-/g, "");
          if (wantedDates.size > 0 && !wantedDates.has(dateKey)) continue;
          const live = overlay.get(g.id);
          const home = teamInfo(
            g.homeId,
            g.homeTeam,
            live?.homeTeam?.points ?? g.homePoints,
            "college-football"
          );
          const away = teamInfo(
            g.awayId,
            g.awayTeam,
            live?.awayTeam?.points ?? g.awayPoints,
            "college-football"
          );
          out.push({
            id: `college-football-${g.id}`,
            espnEventId: String(g.id),
            league: "CFB",
            leagueKey: "college-football",
            sport: "football",
            status: mapCfbdStatus(live?.status, g.completed),
            statusDetail: statusDetail(live, g, "cfb"),
            startTime: iso,
            period: live?.period != null ? String(live.period) : null,
            clock: live?.clock ?? null,
            home,
            away,
            followed: false,
            primary: false,
            isPlayoff: w.seasonType === "postseason",
            venue: g.venue,
            broadcast: live?.tv ?? undefined,
            detail: live?.lastPlay ? { lastPlay: live.lastPlay } : undefined,
          });
        }
      } catch (e) {
        console.error(`CFBD /games ${w.year}/${w.week} failed`, e);
      }
    })
  );
  return out;
}

// ---------- CBB ----------

// CFBD's basketball surface — /basketball/games?season=&startDateRange=&endDateRange=.
// Same Bearer token as football. Only fires during the CBB season (Nov–Apr).

type CfbdCbbGame = {
  id: number;
  seasonLabel?: string;
  startDate?: string;
  gameType?: string;
  status?: string;
  neutralSite?: boolean;
  homeTeamId?: number;
  homeTeam?: string;
  homePoints?: number | null;
  awayTeamId?: number;
  awayTeam?: string;
  awayPoints?: number | null;
  venue?: { name?: string };
  broadcasts?: string[];
};

export async function fetchCbbGames(yyyymmddDates: string[]): Promise<Game[]> {
  if (!process.env.CFBD_API_KEY || yyyymmddDates.length === 0) return [];
  const wanted = new Set(yyyymmddDates);
  // CFBD wants ISO dates; scoreboardDates gives yyyymmdd.
  const isoDates = yyyymmddDates.map(
    (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  );
  const start = isoDates[0];
  const end = isoDates[isoDates.length - 1];
  // Basketball season label straddles two years — pick both to be safe.
  const y = parseInt(start.slice(0, 4), 10);
  const seasons = [y, y - 1];
  const out: Game[] = [];
  await Promise.all(
    seasons.map(async (season) => {
      try {
        const url =
          `${CFBD_BASE}/basketball/games` +
          `?season=${season}&startDateRange=${start}&endDateRange=${end}`;
        const res = await fetch(url, {
          next: { revalidate: 60 },
          headers: auth(),
          cache: "no-store",
        });
        if (!res.ok) return;
        const games = (await res.json()) as CfbdCbbGame[];
        for (const g of games) {
          if (!g.startDate || !g.homeTeam || !g.awayTeam) continue;
          const iso = new Date(g.startDate).toISOString();
          const dateKey = iso.slice(0, 10).replace(/-/g, "");
          if (!wanted.has(dateKey)) continue;
          const home = teamInfo(g.homeTeamId, g.homeTeam, g.homePoints, "mens-college-basketball");
          const away = teamInfo(g.awayTeamId, g.awayTeam, g.awayPoints, "mens-college-basketball");
          out.push({
            id: `mens-college-basketball-${g.id}`,
            espnEventId: String(g.id),
            league: "CBB",
            leagueKey: "mens-college-basketball",
            sport: "basketball",
            status: mapCfbdStatus(g.status, g.status?.toLowerCase() === "completed"),
            statusDetail: statusDetail(undefined, {
              id: g.id,
              season: season,
              week: 0,
              startDate: g.startDate,
              completed: g.status?.toLowerCase() === "completed",
            } as CfbdGame, "cbb"),
            startTime: iso,
            period: null,
            clock: null,
            home,
            away,
            followed: false,
            primary: false,
            isPlayoff: (g.gameType ?? "").toLowerCase().includes("tournament"),
            venue: g.venue?.name,
            broadcast: g.broadcasts?.[0],
          });
        }
      } catch (e) {
        console.error(`CFBD basketball season=${season} failed`, e);
      }
    })
  );
  // Dedupe (both season queries can return the same game)
  const seen = new Set<string>();
  return out.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}
