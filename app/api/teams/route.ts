import { NextResponse } from "next/server";
import { getFullCatalog } from "@/lib/teamCatalog";

export const revalidate = 86400;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const byLeague = await getFullCatalog();
    return NextResponse.json(
      { byLeague, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ byLeague: {}, error: "fetch_failed" }, { status: 200 });
  }
}
