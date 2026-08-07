// Hardcoded team catalogs for the picker so it works even when ESPN's /teams
// endpoint is blocked. IDs match our canonical "league:espnId" scheme; logos
// come from ESPN's public CDN (a.espncdn.com/i/teamlogos/...) which serves
// image files from a separate host that isn't behind the API's WAF.
//
// Teams rarely change — update by hand when a franchise relocates/rebrands.

import type { CatalogTeam } from "./teamCatalog";

const logoMlb = (id: string) => `https://a.espncdn.com/i/teamlogos/mlb/500/${id}.png`;
const logoNfl = (id: string) => `https://a.espncdn.com/i/teamlogos/nfl/500/${id}.png`;
const logoNba = (id: string) => `https://a.espncdn.com/i/teamlogos/nba/500/${id}.png`;
const logoNhl = (id: string) => `https://a.espncdn.com/i/teamlogos/nhl/500/${id}.png`;
const logoCollege = (id: string) => `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;

type Row = [espnId: string, abbr: string, name: string, displayName: string];

const MLB: Row[] = [
  ["1", "BAL", "Orioles", "Baltimore Orioles"],
  ["2", "BOS", "Red Sox", "Boston Red Sox"],
  ["3", "LAA", "Angels", "Los Angeles Angels"],
  ["4", "CWS", "White Sox", "Chicago White Sox"],
  ["5", "CLE", "Guardians", "Cleveland Guardians"],
  ["6", "DET", "Tigers", "Detroit Tigers"],
  ["7", "KC", "Royals", "Kansas City Royals"],
  ["8", "MIL", "Brewers", "Milwaukee Brewers"],
  ["9", "MIN", "Twins", "Minnesota Twins"],
  ["10", "NYY", "Yankees", "New York Yankees"],
  ["11", "ATH", "Athletics", "Athletics"],
  ["12", "SEA", "Mariners", "Seattle Mariners"],
  ["13", "TEX", "Rangers", "Texas Rangers"],
  ["14", "TOR", "Blue Jays", "Toronto Blue Jays"],
  ["15", "ATL", "Braves", "Atlanta Braves"],
  ["16", "CHC", "Cubs", "Chicago Cubs"],
  ["17", "CIN", "Reds", "Cincinnati Reds"],
  ["18", "HOU", "Astros", "Houston Astros"],
  ["19", "LAD", "Dodgers", "Los Angeles Dodgers"],
  ["20", "WSH", "Nationals", "Washington Nationals"],
  ["21", "NYM", "Mets", "New York Mets"],
  ["22", "PHI", "Phillies", "Philadelphia Phillies"],
  ["23", "PIT", "Pirates", "Pittsburgh Pirates"],
  ["24", "STL", "Cardinals", "St. Louis Cardinals"],
  ["25", "SD", "Padres", "San Diego Padres"],
  ["26", "SF", "Giants", "San Francisco Giants"],
  ["27", "COL", "Rockies", "Colorado Rockies"],
  ["28", "MIA", "Marlins", "Miami Marlins"],
  ["29", "ARI", "Diamondbacks", "Arizona Diamondbacks"],
  ["30", "TB", "Rays", "Tampa Bay Rays"],
];

const NFL: Row[] = [
  ["1", "ATL", "Falcons", "Atlanta Falcons"],
  ["2", "BUF", "Bills", "Buffalo Bills"],
  ["3", "CHI", "Bears", "Chicago Bears"],
  ["4", "CIN", "Bengals", "Cincinnati Bengals"],
  ["5", "CLE", "Browns", "Cleveland Browns"],
  ["6", "DAL", "Cowboys", "Dallas Cowboys"],
  ["7", "DEN", "Broncos", "Denver Broncos"],
  ["8", "DET", "Lions", "Detroit Lions"],
  ["9", "GB", "Packers", "Green Bay Packers"],
  ["10", "TEN", "Titans", "Tennessee Titans"],
  ["11", "IND", "Colts", "Indianapolis Colts"],
  ["12", "KC", "Chiefs", "Kansas City Chiefs"],
  ["13", "LV", "Raiders", "Las Vegas Raiders"],
  ["14", "LAR", "Rams", "Los Angeles Rams"],
  ["15", "MIA", "Dolphins", "Miami Dolphins"],
  ["16", "MIN", "Vikings", "Minnesota Vikings"],
  ["17", "NE", "Patriots", "New England Patriots"],
  ["18", "NO", "Saints", "New Orleans Saints"],
  ["19", "NYG", "Giants", "New York Giants"],
  ["20", "NYJ", "Jets", "New York Jets"],
  ["21", "PHI", "Eagles", "Philadelphia Eagles"],
  ["22", "ARI", "Cardinals", "Arizona Cardinals"],
  ["23", "PIT", "Steelers", "Pittsburgh Steelers"],
  ["24", "LAC", "Chargers", "Los Angeles Chargers"],
  ["25", "SF", "49ers", "San Francisco 49ers"],
  ["26", "SEA", "Seahawks", "Seattle Seahawks"],
  ["27", "TB", "Buccaneers", "Tampa Bay Buccaneers"],
  ["28", "WSH", "Commanders", "Washington Commanders"],
  ["29", "CAR", "Panthers", "Carolina Panthers"],
  ["30", "JAX", "Jaguars", "Jacksonville Jaguars"],
  ["33", "BAL", "Ravens", "Baltimore Ravens"],
  ["34", "HOU", "Texans", "Houston Texans"],
];

const NBA: Row[] = [
  ["1", "ATL", "Hawks", "Atlanta Hawks"],
  ["2", "BOS", "Celtics", "Boston Celtics"],
  ["3", "NOP", "Pelicans", "New Orleans Pelicans"],
  ["4", "CHI", "Bulls", "Chicago Bulls"],
  ["5", "CLE", "Cavaliers", "Cleveland Cavaliers"],
  ["6", "DAL", "Mavericks", "Dallas Mavericks"],
  ["7", "DEN", "Nuggets", "Denver Nuggets"],
  ["8", "DET", "Pistons", "Detroit Pistons"],
  ["9", "GSW", "Warriors", "Golden State Warriors"],
  ["10", "HOU", "Rockets", "Houston Rockets"],
  ["11", "IND", "Pacers", "Indiana Pacers"],
  ["12", "LAC", "Clippers", "LA Clippers"],
  ["13", "LAL", "Lakers", "Los Angeles Lakers"],
  ["14", "MIA", "Heat", "Miami Heat"],
  ["15", "MIL", "Bucks", "Milwaukee Bucks"],
  ["16", "MIN", "Timberwolves", "Minnesota Timberwolves"],
  ["17", "BKN", "Nets", "Brooklyn Nets"],
  ["18", "NYK", "Knicks", "New York Knicks"],
  ["19", "ORL", "Magic", "Orlando Magic"],
  ["20", "PHI", "76ers", "Philadelphia 76ers"],
  ["21", "PHX", "Suns", "Phoenix Suns"],
  ["22", "POR", "Trail Blazers", "Portland Trail Blazers"],
  ["23", "SAC", "Kings", "Sacramento Kings"],
  ["24", "SAS", "Spurs", "San Antonio Spurs"],
  ["25", "OKC", "Thunder", "Oklahoma City Thunder"],
  ["26", "UTAH", "Jazz", "Utah Jazz"],
  ["27", "WAS", "Wizards", "Washington Wizards"],
  ["28", "TOR", "Raptors", "Toronto Raptors"],
  ["29", "MEM", "Grizzlies", "Memphis Grizzlies"],
  ["30", "CHA", "Hornets", "Charlotte Hornets"],
];

const NHL: Row[] = [
  ["1", "BOS", "Bruins", "Boston Bruins"],
  ["2", "BUF", "Sabres", "Buffalo Sabres"],
  ["3", "CGY", "Flames", "Calgary Flames"],
  ["4", "CHI", "Blackhawks", "Chicago Blackhawks"],
  ["5", "DET", "Red Wings", "Detroit Red Wings"],
  ["6", "EDM", "Oilers", "Edmonton Oilers"],
  ["7", "CAR", "Hurricanes", "Carolina Hurricanes"],
  ["8", "LAK", "Kings", "Los Angeles Kings"],
  ["9", "DAL", "Stars", "Dallas Stars"],
  ["10", "MTL", "Canadiens", "Montréal Canadiens"],
  ["11", "NJD", "Devils", "New Jersey Devils"],
  ["12", "NYI", "Islanders", "New York Islanders"],
  ["13", "NYR", "Rangers", "New York Rangers"],
  ["14", "OTT", "Senators", "Ottawa Senators"],
  ["15", "PHI", "Flyers", "Philadelphia Flyers"],
  ["16", "PIT", "Penguins", "Pittsburgh Penguins"],
  ["17", "COL", "Avalanche", "Colorado Avalanche"],
  ["18", "SJS", "Sharks", "San Jose Sharks"],
  ["19", "STL", "Blues", "St. Louis Blues"],
  ["20", "TBL", "Lightning", "Tampa Bay Lightning"],
  ["21", "TOR", "Maple Leafs", "Toronto Maple Leafs"],
  ["22", "VAN", "Canucks", "Vancouver Canucks"],
  ["23", "WSH", "Capitals", "Washington Capitals"],
  ["25", "ANA", "Ducks", "Anaheim Ducks"],
  ["26", "FLA", "Panthers", "Florida Panthers"],
  ["27", "NSH", "Predators", "Nashville Predators"],
  ["28", "WPG", "Jets", "Winnipeg Jets"],
  ["29", "CBJ", "Blue Jackets", "Columbus Blue Jackets"],
  ["30", "MIN", "Wild", "Minnesota Wild"],
  ["37", "VGK", "Golden Knights", "Vegas Golden Knights"],
  ["124292", "SEA", "Kraken", "Seattle Kraken"],
  ["129764", "UTA", "Mammoth", "Utah Mammoth"],
];

// A small starter set for college — the picker only needs the teams users
// actually follow. Expand by hand as needed.
const CFB: Row[] = [
  ["333", "ALA", "Crimson Tide", "Alabama Crimson Tide"],
];
const CBB: Row[] = [
  ["2599", "SJU", "Red Storm", "St. John's Red Storm"],
];

function toCatalog(
  league: CatalogTeam["league"],
  rows: Row[],
  logo: (id: string) => string
): CatalogTeam[] {
  return rows.map(([espnId, abbr, name, displayName]) => ({
    id: `${league}:${espnId}`,
    league,
    abbr,
    name,
    displayName,
    logo: logo(espnId),
  }));
}

export const STATIC_CATALOG: Record<string, CatalogTeam[]> = {
  mlb: toCatalog("mlb", MLB, logoMlb),
  nfl: toCatalog("nfl", NFL, logoNfl),
  nba: toCatalog("nba", NBA, logoNba),
  nhl: toCatalog("nhl", NHL, logoNhl),
  "college-football": toCatalog("college-football", CFB, logoCollege),
  "mens-college-basketball": toCatalog("mens-college-basketball", CBB, logoCollege),
  "world-cup": [],
};
