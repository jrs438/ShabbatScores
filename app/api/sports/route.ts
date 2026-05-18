import { NextResponse, type NextRequest } from "next/server";
import { getAllRelevantGames } from "@/lib/espn";

export const revalidate = 30;
export const dynamic = "force-dynamic";

function idSet(value: string | null): Set<string> | undefined {
  if (!value) return undefined;
  const ids = value.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? new Set(ids) : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const followedIds = idSet(req.nextUrl.searchParams.get("teams"));
    const primaryIds = idSet(req.nextUrl.searchParams.get("primary"));
    const games = await getAllRelevantGames(
      followedIds ? { followedIds, primaryIds } : undefined
    );
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
