import { NextResponse } from "next/server";
import { getAllLeagueGamesToday } from "@/lib/espn";

export const revalidate = 30;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const games = await getAllLeagueGamesToday();
    // Group by league
    const byLeague: Record<string, typeof games> = {};
    for (const g of games) {
      (byLeague[g.league] ??= []).push(g);
    }
    // Sort each league: live first, then upcoming, then final
    const order = { live: 0, delayed: 1, scheduled: 2, final: 3, postponed: 4 } as const;
    for (const k of Object.keys(byLeague)) {
      byLeague[k].sort((a, b) => order[a.status] - order[b.status]);
    }
    return NextResponse.json(
      { byLeague, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ byLeague: {}, error: "fetch_failed" }, { status: 200 });
  }
}
