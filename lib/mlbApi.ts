import type { Game, GameStatus } from "./types";
import { teamFullId } from "./teams";

// Free official MLB StatsAPI — no key, works from Vercel (unlike ESPN's WAF).
const MLB_BASE = "https://statsapi.mlb.com/api/v1";

// Map MLB StatsAPI team IDs (the ones in the schedule response) to our
// canonical ESPN team IDs + abbreviations. The schedule endpoint doesn't
// include abbreviation by default, so we look it up from team.id.
const MLB_API_TEAM: Record<number, { abbr: string; espnId: string }> = {
  108: { abbr: "LAA", espnId: "3" },
  109: { abbr: "ARI", espnId: "29" },
  110: { abbr: "BAL", espnId: "1" },
  111: { abbr: "BOS", espnId: "2" },
  112: { abbr: "CHC", espnId: "16" },
  113: { abbr: "CIN", espnId: "17" },
  114: { abbr: "CLE", espnId: "5" },
  115: { abbr: "COL", espnId: "27" },
  116: { abbr: "DET", espnId: "6" },
  117: { abbr: "HOU", espnId: "18" },
  118: { abbr: "KC", espnId: "7" },
  119: { abbr: "LAD", espnId: "19" },
  120: { abbr: "WSH", espnId: "20" },
  121: { abbr: "NYM", espnId: "21" },
  133: { abbr: "ATH", espnId: "11" },
  134: { abbr: "PIT", espnId: "23" },
  135: { abbr: "SD", espnId: "25" },
  136: { abbr: "SEA", espnId: "12" },
  137: { abbr: "SF", espnId: "26" },
  138: { abbr: "STL", espnId: "24" },
  139: { abbr: "TB", espnId: "30" },
  140: { abbr: "TEX", espnId: "13" },
  141: { abbr: "TOR", espnId: "14" },
  142: { abbr: "MIN", espnId: "9" },
  143: { abbr: "PHI", espnId: "22" },
  144: { abbr: "ATL", espnId: "15" },
  145: { abbr: "CWS", espnId: "4" },
  146: { abbr: "MIA", espnId: "28" },
  147: { abbr: "NYY", espnId: "10" },
  158: { abbr: "MIL", espnId: "8" },
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
  const meta = t?.team?.id ? MLB_API_TEAM[t.team.id] : undefined;
  const abbr = meta?.abbr ?? t?.team?.abbreviation ?? "";
  const espnId = meta?.espnId;
  const record = t?.leagueRecord
    ? `${t.leagueRecord.wins ?? 0}-${t.leagueRecord.losses ?? 0}`
    : undefined;
  return {
    id: espnId ? teamFullId("mlb", espnId) : `mlb:unmapped-${t?.team?.id ?? ""}`,
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
