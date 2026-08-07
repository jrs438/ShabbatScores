import type { Game, GameStatus } from "./types";
import { teamFullId } from "./teams";

// Free official MLB StatsAPI — no key, works from Vercel (unlike ESPN's WAF).
const MLB_BASE = "https://statsapi.mlb.com/api/v1";

// Map MLB StatsAPI team abbreviations to our canonical ESPN team IDs so
// existing per-team user settings ("mlb:21" = Mets) keep working across the
// data-source swap.
const MLB_ABBR_TO_ESPN_ID: Record<string, string> = {
  ARI: "29", ATL: "15", BAL: "1", BOS: "2", CHC: "16",
  CWS: "4", CHW: "4", CIN: "17", CLE: "5", COL: "27",
  DET: "6", HOU: "18", KC: "7", KCR: "7", LAA: "3",
  LAD: "19", MIA: "28", MIL: "8", MIN: "9", NYM: "21",
  NYY: "10", ATH: "11", OAK: "11", PHI: "22", PIT: "23",
  SD: "25", SDP: "25", SEA: "12", SF: "26", SFG: "26",
  STL: "24", TB: "30", TBR: "30", TEX: "13", TOR: "14",
  WSH: "20", WSN: "20",
};

type MlbTeamSide = {
  score?: number;
  team?: { id?: number; name?: string; abbreviation?: string };
  leagueRecord?: { wins?: number; losses?: number };
};

type MlbGame = {
  gamePk: number;
  gameDate: string;
  gameType?: string; // R=Regular, S=Spring, E=Exhibition, P/F/D/L/W=Postseason variants
  status?: {
    codedGameState?: string;
    detailedState?: string;
    abstractGameState?: string;
  };
  teams?: { away?: MlbTeamSide; home?: MlbTeamSide };
  venue?: { name?: string };
  linescore?: {
    currentInning?: number;
    currentInningOrdinal?: string;
    inningState?: string;
  };
  broadcasts?: { name?: string; type?: string; isNational?: boolean }[];
};

type MlbSchedule = { dates?: { date: string; games?: MlbGame[] }[] };

function mapStatus(code?: string, detailed?: string): GameStatus {
  if (detailed && /postponed/i.test(detailed)) return "postponed";
  if (detailed && /delay/i.test(detailed)) return "delayed";
  switch (code) {
    case "I": case "IH": case "IR": case "M": case "N": return "live";
    case "F": case "O": case "FT": case "FR": return "final";
    case "D": case "DR": case "DI": case "CR": return "delayed";
    case "P": case "PW": case "S": default: return "scheduled";
  }
}

function statusDetail(g: MlbGame): string {
  const abstract = g.status?.abstractGameState;
  const detail = g.status?.detailedState ?? "";
  if (abstract === "Live") {
    const s = g.linescore?.inningState ?? "";
    const ord = g.linescore?.currentInningOrdinal ?? "";
    if (s && ord) return `${s} ${ord}`;
    return detail || "Live";
  }
  if (abstract === "Final") return detail || "Final";
  const t = g.gameDate
    ? new Date(g.gameDate).toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  return t ? `${t} ET` : detail || "Scheduled";
}

function teamInfo(t: MlbTeamSide | undefined) {
  const abbr = t?.team?.abbreviation ?? "";
  const espnId = MLB_ABBR_TO_ESPN_ID[abbr];
  const record = t?.leagueRecord
    ? `${t.leagueRecord.wins ?? 0}-${t.leagueRecord.losses ?? 0}`
    : undefined;
  return {
    id: espnId ? teamFullId("mlb", espnId) : `mlb:unmapped-${abbr}`,
    name: t?.team?.name ?? abbr,
    abbr,
    score: typeof t?.score === "number" ? t.score : null,
    logo: espnId ? `https://a.espncdn.com/i/teamlogos/mlb/500/${espnId}.png` : null,
    record,
  };
}

export async function fetchMlbGames(yyyymmddDates: string[]): Promise<Game[]> {
  const games: Game[] = [];
  for (const d of yyyymmddDates) {
    const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    try {
      const url =
        `${MLB_BASE}/schedule?sportId=1&startDate=${iso}&endDate=${iso}` +
        `&hydrate=linescore,broadcasts(all)`;
      const res = await fetch(url, {
        next: { revalidate: 30 },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as MlbSchedule;
      for (const day of data.dates ?? []) {
        for (const g of day.games ?? []) {
          const home = g.teams?.home;
          const away = g.teams?.away;
          if (!home || !away) continue;
          const status = mapStatus(g.status?.codedGameState, g.status?.detailedState);
          const period = g.linescore?.currentInning;
          const clock = g.linescore?.inningState
            ? `${g.linescore.inningState} ${g.linescore.currentInningOrdinal ?? ""}`.trim()
            : null;
          const nats = (g.broadcasts ?? [])
            .filter((b) => b.isNational && b.type !== "AM" && b.type !== "FM")
            .map((b) => b.name ?? "")
            .filter(Boolean)
            .slice(0, 3);
          const isPlayoff = !!g.gameType && /[PFDLW]/.test(g.gameType);
          games.push({
            id: `mlb-${g.gamePk}`,
            espnEventId: String(g.gamePk),
            league: "MLB",
            leagueKey: "mlb",
            sport: "baseball",
            status,
            statusDetail: statusDetail(g),
            startTime: g.gameDate,
            period: period != null ? String(period) : null,
            clock,
            home: teamInfo(home),
            away: teamInfo(away),
            followed: false,
            primary: false,
            isPlayoff,
            venue: g.venue?.name,
            broadcast: nats.length ? nats.join(", ") : undefined,
          });
        }
      }
    } catch (e) {
      console.error(`MLB schedule ${iso} failed`, e);
    }
  }
  return games;
}
