import type { Game, GameStatus } from "./types";
import { teamFullId } from "./teams";

// NBA's own live-data CDN. Public, no key, works from cloud IPs (it's a
// static-file CDN, not their API subdomain that has the WAF).
const NBA_SCOREBOARD =
  "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json";

// NBA team tricode -> our canonical ESPN team ID.
const NBA_TRICODE_TO_ESPN: Record<string, string> = {
  ATL: "1", BOS: "2", NOP: "3", CHI: "4", CLE: "5",
  DAL: "6", DEN: "7", DET: "8", GSW: "9", HOU: "10",
  IND: "11", LAC: "12", LAL: "13", MIA: "14", MIL: "15",
  MIN: "16", BKN: "17", NYK: "18", ORL: "19", PHI: "20",
  PHX: "21", POR: "22", SAC: "23", SAS: "24", OKC: "25",
  UTA: "26", UTAH: "26", WAS: "27", TOR: "28", MEM: "29", CHA: "30",
};

type NbaSideTeam = {
  teamId?: number;
  teamName?: string;
  teamCity?: string;
  teamTricode?: string;
  wins?: number;
  losses?: number;
  score?: number;
};

type NbaGame = {
  gameId: string;
  gameStatus?: number; // 1 = scheduled, 2 = live, 3 = final
  gameStatusText?: string;
  gameTimeUTC?: string;
  period?: number;
  gameClock?: string; // "PT05M23.00S" (ISO 8601 duration)
  gameEt?: string;
  regulationPeriods?: number;
  homeTeam?: NbaSideTeam;
  awayTeam?: NbaSideTeam;
};

type NbaScoreboardResp = {
  scoreboard?: { gameDate?: string; games?: NbaGame[] };
};

function mapStatus(code?: number, text?: string): GameStatus {
  if (text && /postponed/i.test(text)) return "postponed";
  if (text && /ppd|delay/i.test(text)) return "delayed";
  if (code === 2) return "live";
  if (code === 3) return "final";
  return "scheduled";
}

function parseClock(s?: string): string | null {
  if (!s) return null;
  // "PT05M23.00S" -> "5:23"
  const m = s.match(/PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!m) return s;
  const min = parseInt(m[1] ?? "0", 10);
  const sec = Math.floor(parseFloat(m[2] ?? "0"));
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function statusDetail(g: NbaGame): string {
  const st = mapStatus(g.gameStatus, g.gameStatusText);
  if (st === "final") return g.gameStatusText?.trim() || "Final";
  if (st === "live") {
    const p = g.period ?? 0;
    const label = p > 4 ? `OT${p - 4}` : `Q${p || 1}`;
    const c = parseClock(g.gameClock);
    return c ? `${label} ${c}` : label;
  }
  return g.gameStatusText?.trim() || "Scheduled";
}

function teamInfo(t: NbaSideTeam | undefined) {
  const tri = t?.teamTricode ?? "";
  const espnId = NBA_TRICODE_TO_ESPN[tri];
  const record =
    typeof t?.wins === "number" && typeof t?.losses === "number"
      ? `${t.wins}-${t.losses}`
      : undefined;
  const name = t?.teamName ?? tri;
  return {
    id: espnId ? teamFullId("nba", espnId) : `nba:unmapped-${tri}`,
    name,
    abbr: tri,
    score: typeof t?.score === "number" ? t.score : null,
    logo: espnId ? `https://a.espncdn.com/i/teamlogos/nba/500/${espnId}.png` : null,
    record,
  };
}

export async function fetchNbaGames(yyyymmddDates: string[]): Promise<Game[]> {
  try {
    const res = await fetch(NBA_SCOREBOARD, {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NbaScoreboardResp;
    const games = data.scoreboard?.games ?? [];
    // NBA CDN only exposes today's games. Filter so we only include those
    // whose local date matches one of the requested date windows.
    const wantedDates = new Set(yyyymmddDates);
    const out: Game[] = [];
    for (const g of games) {
      const home = g.homeTeam;
      const away = g.awayTeam;
      if (!home || !away) continue;
      const iso = g.gameTimeUTC ? new Date(g.gameTimeUTC).toISOString() : "";
      const gameDate = iso ? iso.slice(0, 10).replace(/-/g, "") : "";
      if (gameDate && wantedDates.size > 0 && !wantedDates.has(gameDate)) continue;
      out.push({
        id: `nba-${g.gameId}`,
        espnEventId: g.gameId,
        league: "NBA",
        leagueKey: "nba",
        sport: "basketball",
        status: mapStatus(g.gameStatus, g.gameStatusText),
        statusDetail: statusDetail(g),
        startTime: iso,
        period: g.period != null ? String(g.period) : null,
        clock: parseClock(g.gameClock),
        home: teamInfo(home),
        away: teamInfo(away),
        followed: false,
        primary: false,
        isPlayoff: false, // no reliable field here; postseason handled separately
        venue: undefined,
        broadcast: undefined,
      });
    }
    return out;
  } catch (e) {
    console.error("NBA scoreboard failed", e);
    return [];
  }
}
