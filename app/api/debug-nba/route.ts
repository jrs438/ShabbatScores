import { NextRequest, NextResponse } from "next/server";

// Diagnostic: try every candidate ESPN endpoint for NBA on a given date and
// report status + shape so we can see which one actually returns games.
// Hit: /api/debug-nba?date=YYYYMMDD

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HDRS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.espn.com/",
  Origin: "https://www.espn.com",
};

async function probe(label: string, url: string) {
  try {
    const res = await fetch(url, { headers: HDRS, cache: "no-store" });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    const obj = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
    const events = (obj.events as unknown[] | undefined)?.length;
    const items = (obj.items as unknown[] | undefined)?.length;
    const sbData = (
      obj.content as { sbData?: { events?: unknown[] } } | undefined
    )?.sbData?.events?.length;
    return {
      label,
      url,
      ok: res.ok,
      status: res.status,
      contentLength: text.length,
      shape: {
        count: obj.count,
        itemsLen: items,
        eventsLen: events,
        sbDataEventsLen: sbData,
        firstRef: (obj.items as { $ref?: string }[] | undefined)?.[0]?.$ref,
      },
      preview: text.slice(0, 300),
    };
  } catch (e) {
    return { label, url, ok: false, error: String(e) };
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "20260620";
  const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

  const probes = await Promise.all([
    probe(
      "core: /events?dates=YYYYMMDD",
      `https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events?dates=${date}&limit=100`
    ),
    probe(
      "core: /events?dates=YYYYMMDD-YYYYMMDD",
      `https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events?dates=${date}-${date}&limit=100`
    ),
    probe(
      "core: /seasons/YYYY/events?dates=YYYYMMDD (regular)",
      `https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/${date.slice(0, 4)}/types/2/events?dates=${date}&limit=100`
    ),
    probe(
      "core: /seasons/YYYY/events?dates=YYYYMMDD (post)",
      `https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/${date.slice(0, 4)}/types/3/events?dates=${date}&limit=100`
    ),
    probe(
      "cdn.espn.com scoreboard XHR",
      `https://cdn.espn.com/core/nba/scoreboard?xhr=1&limit=50&dates=${date}`
    ),
    probe(
      "site.api.espn.com scoreboard (control — expected 403)",
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`
    ),
    probe(
      "site.web.api.espn.com scoreboard",
      `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`
    ),
  ]);

  return NextResponse.json({ date, iso, probes });
}
