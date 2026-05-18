import type { Game, GameStatus, LiveDetail } from "./types";
import {
  FOLLOWED_TEAMS,
  LEAGUE_LABEL,
  LEAGUE_SPORT_PATH,
  LeagueKey,
  PRIMARY_TEAM_ESPN_IDS,
} from "./teams";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

function todayInEastern(): string {
  // YYYYMMDD in America/New_York
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

function easternDateString(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

type EspnTeam = {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logo?: string;
};

type EspnCompetitor = {
  id: string;
  homeAway: "home" | "away";
  score: string;
  team: EspnTeam;
  records?: { type: string; summary: string }[];
};

type EspnEvent = {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: {
    type: { id: string; name: string; state: string; completed: boolean; description: string; detail: string; shortDetail: string };
    period?: number;
    displayClock?: string;
  };
  competitions: {
    competitors: EspnCompetitor[];
    venue?: { fullName?: string };
    broadcasts?: { names: string[] }[];
    notes?: { type: string; headline: string }[];
  }[];
  season?: { type: number };
};

function mapStatus(state: string, name: string): GameStatus {
  if (state === "in") return "live";
  if (state === "post") return "final";
  if (name?.toUpperCase().includes("DELAY")) return "delayed";
  if (name?.toUpperCase().includes("POSTPONE")) return "postponed";
  return "scheduled";
}

export async function fetchLeagueScoreboard(league: LeagueKey): Promise<EspnEvent[]> {
  const date = todayInEastern();
  const url = `${ESPN_BASE}/${LEAGUE_SPORT_PATH[league]}/scoreboard?dates=${date}`;
  const res = await fetch(url, {
    next: { revalidate: 30 },
    headers: { "User-Agent": "ShabbatScores/1.0" },
  });
  if (!res.ok) throw new Error(`ESPN ${league} responded ${res.status}`);
  const data = (await res.json()) as { events?: EspnEvent[] };
  const today = todayInEastern();
  return (data.events ?? []).filter((ev) => {
    // Belt-and-suspenders: drop anything ESPN smuggles in from another day.
    return easternDateString(ev.date).replace(/-/g, "") === today;
  });
}

function isPlayoffEvent(league: LeagueKey, ev: EspnEvent): boolean {
  // seasonType 3 = playoffs in MLB/NBA/NHL, postseason in NFL
  if (ev.season?.type === 3) return true;
  const notes = ev.competitions[0]?.notes ?? [];
  return notes.some((n) =>
    /playoff|postseason|world series|stanley cup|conference final|championship/i.test(n.headline ?? "")
  );
}

function teamFromCompetitor(c: EspnCompetitor) {
  const record = c.records?.find((r) => r.type === "total")?.summary ?? c.records?.[0]?.summary;
  const score = c.score === "" || c.score == null ? null : Number(c.score);
  return {
    id: c.team.id,
    name: c.team.shortDisplayName || c.team.displayName,
    abbr: c.team.abbreviation,
    score: Number.isFinite(score) ? score : null,
    logo: c.team.logo ?? null,
    record,
  };
}

const SPORT_FROM_LEAGUE: Record<LeagueKey, string> = {
  mlb: "baseball",
  nfl: "football",
  nba: "basketball",
  nhl: "hockey",
  "college-football": "football",
  "mens-college-basketball": "basketball",
};

export function toGame(league: LeagueKey, ev: EspnEvent): Game {
  const comp = ev.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home")!;
  const away = comp.competitors.find((c) => c.homeAway === "away")!;
  const followedHome = FOLLOWED_TEAMS.some((t) => t.espnId === home.team.id);
  const followedAway = FOLLOWED_TEAMS.some((t) => t.espnId === away.team.id);
  const isPrimary =
    PRIMARY_TEAM_ESPN_IDS.has(home.team.id) || PRIMARY_TEAM_ESPN_IDS.has(away.team.id);
  const playoff = isPlayoffEvent(league, ev);
  return {
    id: `${league}-${ev.id}`,
    espnEventId: ev.id,
    league: LEAGUE_LABEL[league],
    leagueKey: league,
    sport: SPORT_FROM_LEAGUE[league],
    status: mapStatus(ev.status.type.state, ev.status.type.name),
    statusDetail: ev.status.type.shortDetail,
    startTime: ev.date,
    period: ev.status.period != null ? String(ev.status.period) : null,
    clock: ev.status.displayClock ?? null,
    home: teamFromCompetitor(home),
    away: teamFromCompetitor(away),
    followed: followedHome || followedAway,
    primary: isPrimary,
    isPlayoff: playoff,
    venue: comp.venue?.fullName,
    broadcast: comp.broadcasts?.[0]?.names?.join(", "),
  };
}

type EspnSummary = {
  situation?: {
    lastPlay?: { text?: string };
    balls?: number;
    strikes?: number;
    outs?: number;
    onFirst?: boolean;
    onSecond?: boolean;
    onThird?: boolean;
    batter?: { athlete?: { displayName?: string; shortName?: string } };
    pitcher?: { athlete?: { displayName?: string; shortName?: string } };
    down?: number;
    distance?: number;
    yardLine?: number;
    possessionText?: string;
    possession?: string;
    downDistanceText?: string;
  };
  header?: {
    competitions?: { status?: { type?: { detail?: string } } }[];
  };
  winprobability?: { homeWinPercentage: number }[];
  predictor?: { homeTeam?: { gameProjection?: string }; awayTeam?: { gameProjection?: string } };
  plays?: { text?: string }[];
};

export async function fetchLiveDetail(league: LeagueKey, eventId: string): Promise<LiveDetail | null> {
  const url = `${ESPN_BASE}/${LEAGUE_SPORT_PATH[league]}/summary?event=${eventId}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 20 },
      headers: { "User-Agent": "ShabbatScores/1.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as EspnSummary;
    const sit = data.situation;
    const detail: LiveDetail = {};
    if (sit) {
      if (sit.lastPlay?.text) detail.lastPlay = sit.lastPlay.text;
      // Baseball
      if (sit.balls != null) detail.balls = sit.balls;
      if (sit.strikes != null) detail.strikes = sit.strikes;
      if (sit.outs != null) detail.outs = sit.outs;
      if (sit.onFirst) detail.onFirst = true;
      if (sit.onSecond) detail.onSecond = true;
      if (sit.onThird) detail.onThird = true;
      if (sit.batter?.athlete) detail.batter = sit.batter.athlete.shortName ?? sit.batter.athlete.displayName;
      if (sit.pitcher?.athlete) detail.pitcher = sit.pitcher.athlete.shortName ?? sit.pitcher.athlete.displayName;
      // Football
      if (sit.downDistanceText) detail.down = sit.downDistanceText;
      else if (sit.down && sit.distance) detail.down = `${ordinal(sit.down)} & ${sit.distance}`;
      if (sit.possessionText) detail.possession = sit.possessionText;
    }
    if (!detail.lastPlay && data.plays && data.plays.length > 0) {
      detail.lastPlay = data.plays[data.plays.length - 1]?.text;
    }
    const inningDetail = data.header?.competitions?.[0]?.status?.type?.detail;
    if (inningDetail) detail.inning = inningDetail;
    const wp = data.winprobability;
    if (wp && wp.length > 0) {
      const last = wp[wp.length - 1].homeWinPercentage;
      if (typeof last === "number") {
        detail.winProb = { home: Math.round(last * 100), away: Math.round((1 - last) * 100) };
      }
    }
    return detail;
  } catch (e) {
    console.error(`ESPN summary ${league}/${eventId} failed`, e);
    return null;
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const ALL_LEAGUES: LeagueKey[] = [
  "mlb",
  "nfl",
  "nba",
  "nhl",
  "college-football",
  "mens-college-basketball",
];

export async function getAllRelevantGames(): Promise<Game[]> {
  const results = await Promise.allSettled(
    ALL_LEAGUES.map(async (league) => {
      try {
        const events = await fetchLeagueScoreboard(league);
        return events.map((ev) => toGame(league, ev));
      } catch (e) {
        console.error(`ESPN ${league} failed`, e);
        return [] as Game[];
      }
    })
  );
  const games = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((g) => g.followed || g.isPlayoff);

  // For any live primary-team game, also fetch the summary endpoint to enrich
  // it with situation data (inning/down/last play/win probability).
  const livePrimary = games.filter((g) => g.primary && g.status === "live");
  if (livePrimary.length > 0) {
    const details = await Promise.allSettled(
      livePrimary.map((g) => fetchLiveDetail(g.leagueKey as LeagueKey, g.espnEventId))
    );
    livePrimary.forEach((g, i) => {
      const d = details[i];
      if (d.status === "fulfilled" && d.value) g.detail = d.value;
    });
  }
  return games;
}
