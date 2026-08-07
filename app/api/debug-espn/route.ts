import { NextResponse } from "next/server";
import { fetchMlbGames } from "@/lib/mlbApi";
import { fetchNhlGames } from "@/lib/nhlApi";
import { todayInEastern } from "@/lib/scoreboardDates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Verifies our replacement sources for the ESPN-blocked leagues:
//   MLB → statsapi.mlb.com
//   NHL → api-web.nhle.com
// Returns per-source game counts + a sample so we can confirm data flow.

export async function GET() {
  const date = todayInEastern();
  const [mlb, nhl] = await Promise.allSettled([
    fetchMlbGames([date]),
    fetchNhlGames([date]),
  ]);

  const summarize = (r: PromiseSettledResult<Awaited<ReturnType<typeof fetchMlbGames>>>) => {
    if (r.status !== "fulfilled") return { ok: false, error: String(r.reason) };
    const games = r.value;
    return {
      ok: true,
      count: games.length,
      sample: games.slice(0, 5).map((g) => ({
        matchup: `${g.away.abbr} @ ${g.home.abbr}`,
        status: g.status,
        detail: g.statusDetail,
        score: `${g.away.score ?? "-"}-${g.home.score ?? "-"}`,
        homeId: g.home.id,
      })),
    };
  };

  return NextResponse.json({
    date,
    sources: { mlb: summarize(mlb), nhl: summarize(nhl) },
  });
}
