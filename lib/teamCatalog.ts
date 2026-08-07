import type { LeagueKey } from "./teams";
import { STATIC_CATALOG } from "./staticCatalog";

const CATALOG_LEAGUES: LeagueKey[] = [
  "mlb",
  "nfl",
  "nba",
  "nhl",
  "college-football",
  "mens-college-basketball",
  "world-cup",
];

export type CatalogTeam = {
  id: string;
  league: LeagueKey;
  abbr: string;
  name: string;
  displayName: string;
  logo: string | null;
};

// Team catalog now comes from a hardcoded table (lib/staticCatalog.ts). We
// previously fetched from ESPN's /teams endpoint, but ESPN's WAF started
// 403-blocking Vercel across the board — the settings picker went empty and
// morning-video couldn't resolve team names. Static data is more reliable
// anyway: team names change rarely, and we control canonical IDs.
export async function getFullCatalog(): Promise<Record<LeagueKey, CatalogTeam[]>> {
  const out: Record<string, CatalogTeam[]> = {};
  for (const l of CATALOG_LEAGUES) {
    out[l] = STATIC_CATALOG[l] ?? [];
  }
  return out as Record<LeagueKey, CatalogTeam[]>;
}
