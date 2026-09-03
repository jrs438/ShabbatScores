import { NextResponse } from "next/server";
import { fetchMlbGames } from "@/lib/mlbApi";
import { fetchNhlGames } from "@/lib/nhlApi";
import { fetchNbaGames } from "@/lib/nbaApi";
import { fetchCfbGames, fetchCbbGames } from "@/lib/cfbdApi";
import { todayInEastern } from "@/lib/scoreboardDates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Verifies our replacement sources for the ESPN-blocked leagues:
//   MLB → statsapi.mlb.com
//   NHL → api-web.nhle.com
//   NBA → cdn.nba.com (public static CDN)
//   CFB → api.collegefootballdata.com (Bearer token)
//   CBB → api.collegefootballdata.com/basketball (same Bearer token)
// Also probes sports.core.api.espn.com for NFL to see whether the ESPN
// "core" subdomain is WAF-blocked from Vercel the same way site.api is.
// Returns per-source game counts + a sample so we can confirm data flow.

type Sample = {
  matchup: string;
  status: string;
  detail: string;
  score: string;
  homeId: string;
};

async function probeEspnCoreNfl(date: string) {
  const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events?dates=${date}&limit=200`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json()) as { count?: number; items?: unknown[] };
    return {
      ok: true,
      status: res.status,
      count: data.count ?? data.items?.length ?? 0,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function GET() {
  const date = todayInEastern();
  const [mlb, nhl, nba, cfb, cbb, nfl] = await Promise.allSettled([
    fetchMlbGames([date]),
    fetchNhlGames([date]),
    fetchNbaGames([date]),
    fetchCfbGames([date]),
    fetchCbbGames([date]),
    probeEspnCoreNfl(date),
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
    sources: {
      mlb: summarize(mlb),
      nhl: summarize(nhl),
      nba: summarize(nba),
      cfb: summarize(cfb),
      cbb: summarize(cbb),
      nfl_espn_core:
        nfl.status === "fulfilled" ? nfl.value : { ok: false, error: String(nfl.reason) },
      cfbd_key_present: Boolean(process.env.CFBD_API_KEY),
    },
  });
}
