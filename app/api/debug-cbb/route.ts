import { NextRequest, NextResponse } from "next/server";

// Diagnostic: probe every candidate men's-college-basketball endpoint on a
// given date. Hit: /api/debug-cbb?date=YYYYMMDD  (defaults to 20260220,
// a mid-season Friday guaranteed to have many CBB games).

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BROWSER_HDRS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.espn.com/",
  Origin: "https://www.espn.com",
};

function cfbdHdrs(): HeadersInit {
  const key = process.env.CFBD_API_KEY;
  return {
    Accept: "application/json",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

async function probe(label: string, url: string, headers: HeadersInit) {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    const shape: Record<string, unknown> = {};
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj)) {
        shape.arrayLen = obj.length;
        shape.firstItemKeys =
          typeof obj[0] === "object" && obj[0]
            ? Object.keys(obj[0] as Record<string, unknown>).slice(0, 10)
            : undefined;
      } else {
        if (Array.isArray(obj.events)) shape.eventsLen = obj.events.length;
        if (Array.isArray(obj.items)) shape.itemsLen = obj.items.length;
        if (typeof obj.count === "number") shape.count = obj.count;
        shape.topKeys = Object.keys(obj).slice(0, 8);
      }
    }
    return {
      label,
      url,
      ok: res.ok,
      status: res.status,
      contentLength: text.length,
      shape,
      preview: text.slice(0, 300),
    };
  } catch (e) {
    return { label, url, ok: false, error: String(e) };
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "20260220";
  const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  const y = date.slice(0, 4);

  const probes = await Promise.all([
    // ESPN via the un-WAF'd sibling subdomain — same shape as NBA
    probe(
      "espn: site.web.api mens-college-basketball scoreboard",
      `https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${date}&groups=50&limit=300`,
      BROWSER_HDRS
    ),
    // CFBD basketball surfaces — try a few variants
    probe(
      "cfbd: /basketball/games?season&startDateRange&endDateRange",
      `https://api.collegefootballdata.com/basketball/games?season=${y}&startDateRange=${iso}&endDateRange=${iso}`,
      cfbdHdrs()
    ),
    probe(
      "cfbd: /basketball/games?season only",
      `https://api.collegefootballdata.com/basketball/games?season=${y}`,
      cfbdHdrs()
    ),
    probe(
      "cfbd: /basketball/games/season with different casing",
      `https://api.collegefootballdata.com/basketball/games?year=${y}&startDateRange=${iso}&endDateRange=${iso}`,
      cfbdHdrs()
    ),
    probe(
      "cfbd: /basketball root (check what's there)",
      `https://api.collegefootballdata.com/basketball`,
      cfbdHdrs()
    ),
    // NCAA's own data feed — no key required
    probe(
      "ncaa: data.ncaa.com scoreboard",
      `https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/${y}/${date.slice(4, 6)}/${date.slice(6, 8)}/scoreboard.json`,
      { Accept: "application/json" }
    ),
  ]);

  return NextResponse.json({ date, iso, probes });
}
