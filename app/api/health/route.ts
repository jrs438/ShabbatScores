import { NextResponse } from "next/server";

// Upstream health check for external monitoring.
//   200 OK  → every source is reachable and returning JSON
//   503     → at least one source is broken (WAF-blocked, DNS, etc.)
// The response body always says which sources are healthy and which
// aren't, so an alert payload from UptimeRobot / Better Stack / Pingdom
// tells you exactly what to look at without opening the dashboard.
//
// Notes on what we probe:
//   - We only care that the endpoint RESPONDS with valid JSON — an empty
//     scoreboard (off-season, no games today) is still "ok". A 403/500
//     is what we're catching.
//   - CFBD probes /calendar (cheap, single row, always returns for any
//     year). Cheaper than /games and doesn't waste query quota.
//   - ESPN probe uses NFL scoreboard because NFL is on site.web.api and
//     that's the host we're most nervous about. If ESPN 403s again, this
//     probe catches it before your Shabbat panel notices.

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

type Probe = {
  name: string;
  ok: boolean;
  status?: number;
  ms: number;
  hint?: string;
};

async function probe(
  name: string,
  url: string,
  headers: HeadersInit,
  validate: (text: string) => boolean = () => true
): Promise<Probe> {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    const ms = Date.now() - start;
    if (!res.ok) {
      return {
        name,
        ok: false,
        status: res.status,
        ms,
        hint: res.status === 403 ? "WAF-blocked" : `HTTP ${res.status}`,
      };
    }
    const text = await res.text();
    if (!validate(text)) {
      return { name, ok: false, status: res.status, ms, hint: "unexpected body" };
    }
    return { name, ok: true, status: res.status, ms };
  } catch (e) {
    return {
      name,
      ok: false,
      ms: Date.now() - start,
      hint: (e as Error).message ?? "fetch threw",
    };
  }
}

function todayYMD(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

function todayISO(): string {
  const s = todayYMD();
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export async function GET() {
  const date = todayYMD();
  const iso = todayISO();
  const year = date.slice(0, 4);

  const cfbdHdrs: HeadersInit = {
    Accept: "application/json",
    ...(process.env.CFBD_API_KEY
      ? { Authorization: `Bearer ${process.env.CFBD_API_KEY}` }
      : {}),
  };

  const isJson = (t: string) => {
    try {
      JSON.parse(t);
      return true;
    } catch {
      return false;
    }
  };

  const probes = await Promise.all([
    probe(
      "espn:site.web.api",
      `https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${date}`,
      BROWSER_HDRS,
      isJson
    ),
    probe(
      "mlb:statsapi",
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${iso}`,
      { Accept: "application/json" },
      isJson
    ),
    probe(
      "nhl:api-web",
      `https://api-web.nhle.com/v1/score/${iso}`,
      { Accept: "application/json" },
      isJson
    ),
    probe(
      "cfbd:calendar",
      `https://api.collegefootballdata.com/calendar?year=${year}`,
      cfbdHdrs,
      isJson
    ),
  ]);

  const allOk = probes.every((p) => p.ok);
  const body = {
    status: allOk ? "ok" : "degraded",
    checkedAt: new Date().toISOString(),
    probes,
    broken: probes.filter((p) => !p.ok).map((p) => p.name),
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
