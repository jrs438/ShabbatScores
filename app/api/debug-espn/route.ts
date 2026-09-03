import { NextRequest, NextResponse } from "next/server";
import { fetchMlbGames } from "@/lib/mlbApi";
import { fetchNhlGames } from "@/lib/nhlApi";
import { fetchCfbGames, fetchCbbGames } from "@/lib/cfbdApi";
import { fetchNflGames, fetchNbaGames } from "@/lib/espnCore";
import { scoreboardDates, todayInEastern } from "@/lib/scoreboardDates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Verifies our per-league sources:
//   MLB → statsapi.mlb.com
//   NHL → api-web.nhle.com
//   NBA → sports.core.api.espn.com (ESPN core, works for any date)
//   NFL → sports.core.api.espn.com (ESPN core, not WAF-blocked)
//   CFB → api.collegefootballdata.com/games (Bearer token)
//   CBB → api.collegefootballdata.com/basketball/games (same key)
//
// Query params:
//   ?date=YYYYMMDD     — single date override (skips scoreboardDates)
//   ?dates=YYYYMMDD,YYYYMMDD  — explicit multi-date list
// With no params, uses the same window the production dashboard uses.

type Sample = {
  matchup: string;
  status: string;
  detail: string;
  score: string;
  homeId: string;
};

const YMD_RE = /^\d{8}$/;

function parseDates(req: NextRequest): { dates: string[]; source: string } {
  const url = new URL(req.url);
  const multi = url.searchParams.get("dates");
  if (multi) {
    const parts = multi.split(",").map((s) => s.trim()).filter((s) => YMD_RE.test(s));
    if (parts.length > 0) return { dates: parts, source: "query:dates" };
  }
  const single = url.searchParams.get("date");
  if (single && YMD_RE.test(single)) {
    return { dates: [single], source: "query:date" };
  }
  return { dates: scoreboardDates(), source: "phase-default" };
}

export async function GET(req: NextRequest) {
  const today = todayInEastern();
  const { dates, source } = parseDates(req);

  const [mlb, nhl, nba, nfl, cfb, cbb] = await Promise.allSettled([
    fetchMlbGames(dates),
    fetchNhlGames(dates),
    fetchNbaGames(dates),
    fetchNflGames(dates),
    fetchCfbGames(dates),
    fetchCbbGames(dates),
  ]);

  const summarize = (
    r: PromiseSettledResult<Awaited<ReturnType<typeof fetchMlbGames>>>
  ) => {
    if (r.status !== "fulfilled") return { ok: false, error: String(r.reason) };
    const games = r.value;
    const sample: Sample[] = games.slice(0, 5).map((g) => ({
      matchup: `${g.away.abbr} @ ${g.home.abbr}`,
      status: g.status,
      detail: g.statusDetail,
      score: `${g.away.score ?? "-"}-${g.home.score ?? "-"}`,
      homeId: g.home.id,
    }));
    return { ok: true, count: games.length, sample };
  };

  return NextResponse.json({
    today,
    dates,
    dateSource: source,
    sources: {
      mlb: summarize(mlb),
      nhl: summarize(nhl),
      nba: summarize(nba),
      nfl: summarize(nfl),
      cfb: summarize(cfb),
      cbb: summarize(cbb),
      cfbd_key_present: Boolean(process.env.CFBD_API_KEY),
    },
  });
}
