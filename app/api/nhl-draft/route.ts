import { NextResponse } from "next/server";

export const revalidate = 60;

// Pulls live picks from the NHL's public draft API. Updates in near-real-time
// during the draft; returns empty arrays outside the window.

type RawPick = {
  round?: number;
  pickInRound?: number;
  overallPick?: number;
  teamAbbrev?: string;
  firstName?: { default?: string } | string;
  lastName?: { default?: string } | string;
  positionCode?: string;
  countryCode?: string;
  height?: number;
  weight?: number;
  pickDateTime?: string;
};

function textOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.default === "string") return obj.default;
  }
  return "";
}

export async function GET() {
  try {
    // NHL fiscal "season" for the upcoming draft sometimes lags the calendar
    // year, so try this year and last year and combine. The API tends to
    // 404 cleanly on a year with no draft data.
    const year = new Date().getUTCFullYear();
    const candidates = [year, year - 1];
    const lists: RawPick[][] = await Promise.all(
      candidates.map(async (y) => {
        try {
          const res = await fetch(
            `https://api-web.nhle.com/v1/draft/picks/${y}/all`,
            {
              next: { revalidate: 60 },
              headers: { "User-Agent": "ShabbatScores/1.0", Accept: "application/json" },
            }
          );
          if (!res.ok) return [];
          const data = (await res.json()) as { picks?: RawPick[] };
          return data.picks ?? [];
        } catch {
          return [];
        }
      })
    );

    // Prefer whichever year actually has picks; fall back to the union.
    let raw = lists.find((l) => l.length > 0) ?? [];
    if (raw.length === 0) raw = lists.flat();

    const picks = raw
      .map((p) => ({
        round: p.round ?? 0,
        pickInRound: p.pickInRound ?? 0,
        overallPick: p.overallPick ?? 0,
        teamAbbrev: p.teamAbbrev ?? "",
        playerName: `${textOf(p.firstName)} ${textOf(p.lastName)}`.trim(),
        position: p.positionCode ?? "",
        country: p.countryCode ?? "",
        pickDateTime: p.pickDateTime ?? null,
      }))
      .filter((p) => p.playerName); // drop unmade picks

    // Newest pick first
    picks.sort((a, b) => b.overallPick - a.overallPick);

    return NextResponse.json(
      { picks, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (e) {
    console.error("nhl-draft fetch failed", e);
    return NextResponse.json({ picks: [], error: "fetch_failed" }, { status: 200 });
  }
}
