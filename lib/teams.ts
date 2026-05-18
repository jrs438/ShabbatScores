export type LeagueKey =
  | "mlb"
  | "nfl"
  | "nba"
  | "nhl"
  | "college-football"
  | "mens-college-basketball";

export type SportKey = "baseball" | "football" | "basketball" | "hockey";

export type FollowedTeam = {
  league: LeagueKey;
  sport: SportKey;
  espnId: string;
  abbr: string;
  name: string;
  displayName: string;
  serpQuery: string;
  primary?: boolean;
};

export const FOLLOWED_TEAMS: FollowedTeam[] = [
  {
    league: "mlb",
    sport: "baseball",
    espnId: "21",
    abbr: "NYM",
    name: "Mets",
    displayName: "New York Mets",
    serpQuery: "New York Mets",
    primary: true,
  },
  {
    league: "mlb",
    sport: "baseball",
    espnId: "10",
    abbr: "NYY",
    name: "Yankees",
    displayName: "New York Yankees",
    serpQuery: "New York Yankees",
  },
  {
    league: "nfl",
    sport: "football",
    espnId: "20",
    abbr: "NYJ",
    name: "Jets",
    displayName: "New York Jets",
    serpQuery: "New York Jets",
    primary: true,
  },
  {
    league: "nfl",
    sport: "football",
    espnId: "19",
    abbr: "NYG",
    name: "Giants",
    displayName: "New York Giants",
    serpQuery: "New York Giants",
  },
  {
    league: "nhl",
    sport: "hockey",
    espnId: "13",
    abbr: "NYR",
    name: "Rangers",
    displayName: "New York Rangers",
    serpQuery: "New York Rangers",
    primary: true,
  },
  {
    league: "nhl",
    sport: "hockey",
    espnId: "1",
    abbr: "NJD",
    name: "Devils",
    displayName: "New Jersey Devils",
    serpQuery: "New Jersey Devils",
  },
  {
    league: "nba",
    sport: "basketball",
    espnId: "18",
    abbr: "NYK",
    name: "Knicks",
    displayName: "New York Knicks",
    serpQuery: "New York Knicks",
    primary: true,
  },
  {
    league: "college-football",
    sport: "football",
    espnId: "333",
    abbr: "ALA",
    name: "Alabama",
    displayName: "Alabama Crimson Tide",
    serpQuery: "Alabama Crimson Tide football",
  },
  {
    league: "mens-college-basketball",
    sport: "basketball",
    espnId: "2599",
    abbr: "SJU",
    name: "St. John's",
    displayName: "St. John's Red Storm",
    serpQuery: "St. John's basketball",
  },
];

export const LEAGUE_SPORT_PATH: Record<LeagueKey, string> = {
  mlb: "baseball/mlb",
  nfl: "football/nfl",
  nba: "basketball/nba",
  nhl: "hockey/nhl",
  "college-football": "football/college-football",
  "mens-college-basketball": "basketball/mens-college-basketball",
};

export const LEAGUE_LABEL: Record<LeagueKey, string> = {
  mlb: "MLB",
  nfl: "NFL",
  nba: "NBA",
  nhl: "NHL",
  "college-football": "CFB",
  "mens-college-basketball": "CBB",
};

export const FOLLOWED_TEAM_ESPN_IDS = new Set(FOLLOWED_TEAMS.map((t) => t.espnId));
export const PRIMARY_TEAM_ESPN_IDS = new Set(
  FOLLOWED_TEAMS.filter((t) => t.primary).map((t) => t.espnId)
);
