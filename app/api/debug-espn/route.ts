import { NextResponse } from "next/server";
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

type Sample = {
  matchup: string;
  status: string;
  detail: string;
  score: string;
  homeId: string;
};

export async function GET() {
  const date = todayInEastern();
  const dates = scoreboardDates();
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
    date,
    dates,
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
