import { NextResponse, type NextRequest } from "next/server";
import { fetchHighlights } from "@/lib/highlights";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const teamsParam = req.nextUrl.searchParams.get("teams");
    const teamIds = teamsParam
      ? teamsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const highlights = await fetchHighlights(teamIds);
    return NextResponse.json(
      { highlights, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ highlights: [], error: "fetch_failed" }, { status: 200 });
  }
}
