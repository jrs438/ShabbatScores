import { NextResponse } from "next/server";
import { LEAGUE_SPORT_PATH, type LeagueKey } from "@/lib/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const LEAGUES: LeagueKey[] = [
  "mlb",
  "nfl",
  "nba",
  "nhl",
  "college-football",
  "mens-college-basketball",
  "world-cup",
];

function todayInEastern(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

export async function GET() {
  const date = todayInEastern();
  const rows: unknown[] = [];
  for (const league of LEAGUES) {
    const url = `${ESPN_BASE}/${LEAGUE_SPORT_PATH[league]}/scoreboard?dates=${date}`;
    try {
      const started = Date.now();
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": "ShabbatScores/1.0" },
      });
      const ms = Date.now() - started;
      if (!res.ok) {
        const body = (await res.text()).slice(0, 200);
        rows.push({ league, url, status: res.status, ms, body });
        continue;
      }
      const data = (await res.json()) as { events?: { date?: string; shortName?: string }[] };
      const events = data.events ?? [];
      rows.push({
        league,
        url,
        status: res.status,
        ms,
        eventCount: events.length,
        sampleTitles: events.slice(0, 3).map((e) => e.shortName ?? ""),
        sampleDates: events.slice(0, 3).map((e) => e.date ?? ""),
      });
    } catch (e) {
      rows.push({ league, url, error: String(e) });
    }
  }
  return NextResponse.json({ date, rows });
}
