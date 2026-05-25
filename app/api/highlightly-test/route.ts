import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Probe for the Highlightly contract. Auth is solved: x-rapidapi-key +
// x-rapidapi-host (host = the direct domain). The unified API needs a sport
// prefix in the path, e.g. /basketball/highlights, /baseball/highlights.
//
//   /api/highlightly-test                          -> basketball highlights
//   /api/highlightly-test?path=/baseball/highlights
//   /api/highlightly-test?path=/basketball/highlights&query=limit=5

export async function GET(req: NextRequest) {
  const key = process.env.HIGHLIGHTLY_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "HIGHLIGHTLY_API_KEY is not set in Vercel env." },
      { status: 200 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const base = sp.get("base") ?? "https://sports.highlightly.net";
  const path = sp.get("path") ?? "/basketball/highlights";
  const query = sp.get("query") ?? "limit=5";
  const url = `${base}${path}?${query}`;
  const host = new URL(base).host;

  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": host,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 1200);
    }
    return NextResponse.json({
      requestedUrl: url,
      status: res.status,
      ok: res.ok,
      body,
    });
  } catch (e) {
    return NextResponse.json({ requestedUrl: url, error: String(e) }, { status: 200 });
  }
}
