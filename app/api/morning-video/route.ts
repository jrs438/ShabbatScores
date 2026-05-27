import { NextResponse, type NextRequest } from "next/server";
import { getFullCatalog } from "@/lib/teamCatalog";
import { teamRecap, topPlays, LEAGUE_FALLBACK, type VideoPick } from "@/lib/youtube";

export const revalidate = 1200; // 20 min

const SUPPORTED = new Set(Object.keys(LEAGUE_FALLBACK)); // mlb, nba, nfl, nhl

export async function GET(req: NextRequest) {
  try {
    const teamsParam = req.nextUrl.searchParams.get("teams"); // prefixed ids: nba:18,mlb:21
    const ids = teamsParam ? teamsParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const catalog = await getFullCatalog();
    const byId = new Map(Object.values(catalog).flat().map((t) => [t.id, t]));

    const recaps: (VideoPick & { teamId: string; teamName: string })[] = [];
    await Promise.all(
      ids.map(async (id) => {
        const t = byId.get(id);
        if (!t || !SUPPORTED.has(t.league)) return; // skip college / unknown
        const recap = await teamRecap(t.displayName, t.league);
        if (recap) recaps.push({ ...recap, teamId: id, teamName: t.displayName });
      })
    );

    // Newest recap first
    recaps.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const tp = await topPlays();

    return NextResponse.json(
      { recaps, topPlays: tp, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=2400" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ recaps: [], topPlays: null, error: "fetch_failed" }, { status: 200 });
  }
}
