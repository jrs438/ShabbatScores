import type { Game, GameStatus } from "./types";
import { FOLLOWED_TEAMS, LEAGUE_LABEL, LEAGUE_SPORT_PATH, LeagueKey } from "./teams";

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
    name: c.team.shortDisplayName || c.team.displayName,
    abbr: c.team.abbreviation,
    score: Number.isFinite(score) ? score : null,
    logo: c.team.logo ?? null,
    record,
  };
}

export function toGame(league: LeagueKey, ev: EspnEvent): Game {
  const comp = ev.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home")!;
  const away = comp.competitors.find((c) => c.homeAway === "away")!;
  const followedHome = FOLLOWED_TEAMS.some((t) => t.espnId === home.team.id);
  const followedAway = FOLLOWED_TEAMS.some((t) => t.espnId === away.team.id);
  const playoff = isPlayoffEvent(league, ev);
  return {
    id: `${league}-${ev.id}`,
    league: LEAGUE_LABEL[league],
    status: mapStatus(ev.status.type.state, ev.status.type.name),
    statusDetail: ev.status.type.shortDetail,
    startTime: ev.date,
    period: ev.status.period != null ? String(ev.status.period) : null,
    clock: ev.status.displayClock ?? null,
    home: teamFromCompetitor(home),
    away: teamFromCompetitor(away),
    followed: followedHome || followedAway,
    isPlayoff: playoff,
    venue: comp.venue?.fullName,
    broadcast: comp.broadcasts?.[0]?.names?.join(", "),
  };
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
  const games = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  // Keep all followed-team games + all playoff games across major leagues.
  return games.filter((g) => g.followed || g.isPlayoff);
}
