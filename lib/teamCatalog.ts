import { LEAGUE_SPORT_PATH, teamFullId, type LeagueKey } from "./teams";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const CATALOG_LEAGUES: LeagueKey[] = [
  "mlb",
  "nfl",
  "nba",
  "nhl",
  "college-football",
  "mens-college-basketball",
];

export type CatalogTeam = {
  id: string;
  league: LeagueKey;
  abbr: string;
  name: string;
  displayName: string;
  logo: string | null;
};

type EspnTeamRaw = {
  id: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  name?: string;
  logos?: { href: string }[];
};
type EspnTeamsResp = {
  sports?: { leagues?: { teams?: { team: EspnTeamRaw }[] }[] }[];
};

async function fetchLeagueCatalog(league: LeagueKey): Promise<CatalogTeam[]> {
  const url = `${ESPN_BASE}/${LEAGUE_SPORT_PATH[league]}/teams?limit=500`;
  const res = await fetch(url, {
    next: { revalidate: 86400 },
    headers: { "User-Agent": "ShabbatScores/1.0" },
  });
  if (!res.ok) throw new Error(`Catalog ${league} -> ${res.status}`);
  const data = (await res.json()) as EspnTeamsResp;
  const teams = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams.map((t) => {
    const team = t.team;
    return {
      id: teamFullId(league, team.id),
      league,
      abbr: team.abbreviation ?? "",
      name: team.shortDisplayName ?? team.name ?? team.displayName ?? "",
      displayName: team.displayName ?? team.name ?? "",
      logo: team.logos?.[0]?.href ?? null,
    };
  });
}

export async function getFullCatalog(): Promise<Record<LeagueKey, CatalogTeam[]>> {
  const results = await Promise.allSettled(CATALOG_LEAGUES.map(fetchLeagueCatalog));
  const out: Record<string, CatalogTeam[]> = {};
  CATALOG_LEAGUES.forEach((l, i) => {
    const r = results[i];
    out[l] = r.status === "fulfilled" ? r.value : [];
  });
  return out as Record<LeagueKey, CatalogTeam[]>;
}
