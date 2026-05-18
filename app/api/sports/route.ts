import { NextResponse } from "next/server";
import { getAllRelevantGames } from "@/lib/espn";

export const revalidate = 30;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const games = await getAllRelevantGames();
    games.sort((a, b) => {
      const order = { live: 0, delayed: 1, scheduled: 2, final: 3, postponed: 4 } as const;
      const diff = order[a.status] - order[b.status];
      if (diff !== 0) return diff;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
    return NextResponse.json(
      { games, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ games: [], error: "fetch_failed" }, { status: 200 });
  }
}
