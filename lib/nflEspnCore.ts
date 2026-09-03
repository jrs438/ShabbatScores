import type { Game, GameStatus } from "./types";
import { teamFullId } from "./teams";

// ESPN's "core" API subdomain — sports.core.api.espn.com — is NOT behind
// the same Akamai WAF as site.api.espn.com. It uses a ref-based structure:
// /events?dates=YYYYMMDD returns a page of {$ref} pointers we have to
// follow. More requests than site.api, but returns real live data.

const CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

const HDRS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
};

type Ref = { $ref: string };

type EventsPage = {
  count?: number;
  items?: Ref[];
  pageIndex?: number;
  pageSize?: number;
  pageCount?: number;
};

type CoreEvent = {
  id: string;
  date: string;
  name: string;
  shortName: string;
  competitions: Ref[]; // ref-based
  season?: { $ref?: string; type?: number; year?: number };
};

type CoreCompetition = {
  id: string;
  date: string;
  competitors: Ref[];
  status: Ref;
  venue?: { fullName?: string };
  broadcasts?: { names?: string[] }[];
};

type CoreCompetitor = {
  id: string;
  homeAway: "home" | "away";
  team: Ref;
  score: Ref | { value?: number; displayValue?: string };
  records?: Ref[];
};

type CoreTeam = {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName?: string;
  logos?: { href: string }[];
};

type CoreStatus = {
  clock?: number;
  displayClock?: string;
  period?: number;
  type?: {
    id?: string;
    name?: string;
    state?: string;
    completed?: boolean;
    description?: string;
    detail?: string;
    shortDetail?: string;
  };
};

type CoreScore = { value?: number; displayValue?: string };
type CoreRecord = { type?: string; summary?: string };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: HDRS,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error(`ESPN core fetch failed ${url}`, e);
    return null;
  }
}

function mapStatus(state?: string, name?: string): GameStatus {
  if (state === "in") return "live";
  if (state === "post") return "final";
  if (name && /DELAY/i.test(name)) return "delayed";
  if (name && /POSTPONE/i.test(name)) return "postponed";
  return "scheduled";
}

async function toGame(ev: CoreEvent): Promise<Game | null> {
  const compRef = ev.competitions?.[0]?.$ref;
  if (!compRef) return null;
  const comp = await getJson<CoreCompetition>(compRef);
  if (!comp) return null;

  const status = await getJson<CoreStatus>(comp.status.$ref);

  const competitorObjs = await Promise.all(
    comp.competitors.map((r) => getJson<CoreCompetitor>(r.$ref))
  );
  const home = competitorObjs.find((c) => c?.homeAway === "home");
  const away = competitorObjs.find((c) => c?.homeAway === "away");
  if (!home || !away) return null;

  const [homeTeam, awayTeam] = await Promise.all([
    getJson<CoreTeam>(home.team.$ref),
    getJson<CoreTeam>(away.team.$ref),
  ]);
  if (!homeTeam || !awayTeam) return null;

  // Scores are refs on core; site.api returns them inline. Handle both.
  async function resolveScore(s: CoreCompetitor["score"]): Promise<number | null> {
    if (s && typeof s === "object" && "value" in s && typeof s.value === "number") return s.value;
    if (s && "$ref" in s) {
      const v = await getJson<CoreScore>(s.$ref);
      if (typeof v?.value === "number") return v.value;
    }
    return null;
  }
  const [homeScore, awayScore] = await Promise.all([
    resolveScore(home.score),
    resolveScore(away.score),
  ]);

  async function resolveRecord(refs?: Ref[]): Promise<string | undefined> {
    if (!refs || refs.length === 0) return undefined;
    const first = await getJson<CoreRecord>(refs[0].$ref);
    return first?.summary;
  }
  const [homeRecord, awayRecord] = await Promise.all([
    resolveRecord(home.records),
    resolveRecord(away.records),
  ]);

  const state = status?.type?.state;
  const name = status?.type?.name;

  return {
    id: `nfl-${ev.id}`,
    espnEventId: ev.id,
    league: "NFL",
    leagueKey: "nfl",
    sport: "football",
    status: mapStatus(state, name),
    statusDetail: status?.type?.shortDetail ?? "Scheduled",
    startTime: ev.date,
    period: status?.period != null ? String(status.period) : null,
    clock: status?.displayClock ?? null,
    home: {
      id: teamFullId("nfl", homeTeam.id),
      name: homeTeam.shortDisplayName ?? homeTeam.displayName,
      abbr: homeTeam.abbreviation,
      score: homeScore,
      logo: homeTeam.logos?.[0]?.href ?? null,
      record: homeRecord,
    },
    away: {
      id: teamFullId("nfl", awayTeam.id),
      name: awayTeam.shortDisplayName ?? awayTeam.displayName,
      abbr: awayTeam.abbreviation,
      score: awayScore,
      logo: awayTeam.logos?.[0]?.href ?? null,
      record: awayRecord,
    },
    followed: false,
    primary: false,
    isPlayoff: ev.season?.type === 3,
    venue: comp.venue?.fullName,
    broadcast: comp.broadcasts?.[0]?.names?.join(", "),
  };
}

export async function fetchNflGames(yyyymmddDates: string[]): Promise<Game[]> {
  const all: Game[] = [];
  const seen = new Set<string>();
  for (const date of yyyymmddDates) {
    const page = await getJson<EventsPage>(`${CORE}/events?dates=${date}&limit=100`);
    if (!page?.items || page.items.length === 0) continue;
    const events = await Promise.all(page.items.map((r) => getJson<CoreEvent>(r.$ref)));
    const games = await Promise.all(
      events.filter((e): e is CoreEvent => e != null).map(toGame)
    );
    for (const g of games) {
      if (!g || seen.has(g.id)) continue;
      seen.add(g.id);
      all.push(g);
    }
  }
  return all;
}
