import type { Game, GameStatus } from "./types";
import { teamFullId } from "./teams";

// Free official NHL API — works from Vercel (proven by the draft card).
const NHL_BASE = "https://api-web.nhle.com/v1";

// Map NHL team abbreviations to our canonical ESPN team IDs so existing
// per-team user settings ("nhl:13" = Rangers) keep working.
const NHL_ABBR_TO_ESPN_ID: Record<string, string> = {
  ANA: "25", ARI: "24", BOS: "1", BUF: "2", CAR: "7",
  CBJ: "29", CGY: "3", CHI: "4", COL: "17", DAL: "9",
  DET: "5", EDM: "6", FLA: "26", LAK: "8", MIN: "30",
  MTL: "10", NJD: "11", NSH: "27", NYI: "12", NYR: "13",
  OTT: "14", PHI: "15", PIT: "16", SEA: "124292", SJS: "18",
  STL: "19", TBL: "20", TOR: "21", UTA: "129764", VAN: "22",
  VGK: "37", WPG: "28", WSH: "23",
};

type NhlSideTeam = {
  id?: number;
  abbrev?: string;
  name?: { default?: string };
  commonName?: { default?: string };
  placeName?: { default?: string };
  score?: number;
  logo?: string;
  record?: string;
};

type NhlClock = {
  timeRemaining?: string;
  running?: boolean;
  inIntermission?: boolean;
};

type NhlGame = {
  id: number;
  gameType?: number; // 1=Preseason, 2=Regular, 3=Playoffs
  startTimeUTC?: string;
  gameState?: string; // FUT | PRE | LIVE | CRIT | OFF | FINAL | PPD
  gameScheduleState?: string;
  period?: number;
  periodDescriptor?: { periodType?: string; number?: number };
  clock?: NhlClock;
  awayTeam?: NhlSideTeam;
  homeTeam?: NhlSideTeam;
  venue?: { default?: string };
  tvBroadcasts?: { network?: string; countryCode?: string }[];
};

type NhlScoreResponse = { games?: NhlGame[] };

function mapStatus(state?: string): GameStatus {
  switch (state) {
    case "LIVE":
    case "CRIT":
      return "live";
    case "OFF":
    case "FINAL":
      return "final";
    case "PPD":
      return "postponed";
    case "FUT":
    case "PRE":
    default:
      return "scheduled";
  }
}

function statusDetail(g: NhlGame): string {
  const st = mapStatus(g.gameState);
  const perNum = g.periodDescriptor?.number ?? g.period ?? 0;
  const perType = g.periodDescriptor?.periodType ?? "REG";
  if (st === "live") {
    const label = perType === "REG" ? `P${perNum}` : perType; // OT/SO
    if (g.clock?.inIntermission) return `INT ${label}`;
    const t = g.clock?.timeRemaining;
    return t ? `${label} ${t}` : label;
  }
  if (st === "final") return perType && perType !== "REG" ? `Final/${perType}` : "Final";
  if (g.startTimeUTC) {
    const t = new Date(g.startTimeUTC).toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${t} ET`;
  }
  return "Scheduled";
}

function teamInfo(t: NhlSideTeam | undefined) {
  const abbr = t?.abbrev ?? "";
  const espnId = NHL_ABBR_TO_ESPN_ID[abbr];
  const name = t?.commonName?.default ?? t?.name?.default ?? abbr;
  return {
    id: espnId ? teamFullId("nhl", espnId) : `nhl:unmapped-${abbr}`,
    name,
    abbr,
    score: typeof t?.score === "number" ? t.score : null,
    logo: t?.logo ?? (espnId ? `https://a.espncdn.com/i/teamlogos/nhl/500/${espnId}.png` : null),
    record: undefined,
  };
}

export async function fetchNhlGames(yyyymmddDates: string[]): Promise<Game[]> {
  const games: Game[] = [];
  for (const d of yyyymmddDates) {
    const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    try {
      const url = `${NHL_BASE}/score/${iso}`;
      const res = await fetch(url, {
        next: { revalidate: 30 },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as NhlScoreResponse;
      for (const g of data.games ?? []) {
        const home = g.homeTeam;
        const away = g.awayTeam;
        if (!home || !away) continue;
        games.push({
          id: `nhl-${g.id}`,
          espnEventId: String(g.id),
          league: "NHL",
          leagueKey: "nhl",
          sport: "hockey",
          status: mapStatus(g.gameState),
          statusDetail: statusDetail(g),
          startTime: g.startTimeUTC ?? "",
          period: g.period != null ? String(g.period) : null,
          clock: g.clock?.timeRemaining ?? null,
          home: teamInfo(home),
          away: teamInfo(away),
          followed: false,
          primary: false,
          isPlayoff: g.gameType === 3,
          venue: g.venue?.default,
          broadcast: (g.tvBroadcasts ?? [])
            .map((b) => b.network ?? "")
            .filter(Boolean)
            .slice(0, 3)
            .join(", "),
        });
      }
    } catch (e) {
      console.error(`NHL score ${iso} failed`, e);
    }
  }
  return games;
}
