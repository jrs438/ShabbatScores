export type GameStatus = "scheduled" | "live" | "final" | "delayed" | "postponed";

export type Game = {
  id: string;
  league: string;
  status: GameStatus;
  statusDetail: string;
  startTime: string;
  period: string | null;
  clock: string | null;
  home: { name: string; abbr: string; score: number | null; logo: string | null; record?: string };
  away: { name: string; abbr: string; score: number | null; logo: string | null; record?: string };
  followed: boolean;
  isPlayoff: boolean;
  venue?: string;
  broadcast?: string;
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
