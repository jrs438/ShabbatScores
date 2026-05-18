export type GameStatus = "scheduled" | "live" | "final" | "delayed" | "postponed";

export type LiveDetail = {
  // Baseball
  inning?: string;
  outs?: number;
  balls?: number;
  strikes?: number;
  onFirst?: boolean;
  onSecond?: boolean;
  onThird?: boolean;
  batter?: string;
  pitcher?: string;
  // Football
  down?: string;
  possession?: string; // team abbr with the ball
  yardLine?: string;
  // Common
  lastPlay?: string;
  winProb?: { home: number; away: number };
};

export type Game = {
  id: string;
  espnEventId: string;
  league: string;
  leagueKey: string;
  sport: string;
  status: GameStatus;
  statusDetail: string;
  startTime: string;
  period: string | null;
  clock: string | null;
  home: { name: string; abbr: string; score: number | null; logo: string | null; record?: string; id: string };
  away: { name: string; abbr: string; score: number | null; logo: string | null; record?: string; id: string };
  followed: boolean;
  primary: boolean;
  isPlayoff: boolean;
  venue?: string;
  broadcast?: string;
  detail?: LiveDetail;
};

export type WeatherNow = {
  temp: number;
  feelsLike: number | null;
  condition: string;
  icon: string;
  wind: string;
  humidity: number | null;
  forecast: { name: string; temp: number; short: string; icon: string }[];
  updatedAt: string;
};

export type HebcalInfo = {
  parashah: string | null;
  candleLighting: string | null;
  havdalah: string | null;
  hdate: string | null;
  holidays: string[];
  isShabbat: boolean;
  shabbatStartsAt: string | null;
  shabbatEndsAt: string | null;
};

export type NewsItem = {
  title: string;
  source: string;
  link: string;
  pubDate: string;
  category: "israel" | "us" | "world";
};
