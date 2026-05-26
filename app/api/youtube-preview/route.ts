import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Dry-run for the morning full-game-highlight selector. Searches YouTube for
// "{team} highlights", pulls durations, applies the candidate heuristics, and
// shows every candidate with its flags + which one would be selected — without
// rendering anything. Used to validate selection across leagues/teams.
//
//   /api/youtube-preview?team=New York Mets
//   /api/youtube-preview?team=New York Knicks&hours=36
//   /api/youtube-preview?team=Alabama Crimson Tide&q=Alabama football highlights

const SEARCH = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS = "https://www.googleapis.com/youtube/v3/videos";

// Official league channels — searching WITHIN these (channelId param) avoids
// the spam/re-uploader flood that pollutes an open "team highlights" search.
const OFFICIAL_CHANNELS: Record<string, string> = {
  mlb: "UCoLrcjPV5PbUrUyXq5mjc_A",
  nba: "UCWJ2lWNubArHWmf3FIHbfcQ",
  nfl: "UCDVYQ4Zhbm3S2dlz7P1GBDg",
  nhl: "UCqFMzb-4AUf6WAIbl132QKA",
};

// Title words that signal NOT a game-highlight recap.
const EXCLUDE =
  /press conf|interview|preview|reaction|mic'?d|podcast|pregame|post-?game show|full game|replay|live stream|livestream|top \d+ plays|every|best of|trailer/i;

function parseDuration(iso: string): number {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    parseInt(m[1] ?? "0", 10) * 3600 +
    parseInt(m[2] ?? "0", 10) * 60 +
    parseInt(m[3] ?? "0", 10)
  );
}

export async function GET(req: NextRequest) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not set in Vercel env. Add it and redeploy." },
      { status: 200 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const team = sp.get("team") ?? "New York Mets";
  const league = sp.get("league"); // mlb | nba | nfl | nhl — restricts to official channel
  const channelId = sp.get("channelId") ?? (league ? OFFICIAL_CHANNELS[league] : undefined);
  // When searching within an official channel, query the team name alone;
  // otherwise append "highlights" to a broad search.
  const q = sp.get("q") ?? (channelId ? team : `${team} highlights`);
  const hours = parseInt(sp.get("hours") ?? "36", 10);
  const order = sp.get("order") ?? "date";
  const publishedAfter = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  // Title-match terms: the full team string + its last word (nickname).
  const lower = team.toLowerCase();
  const lastWord = lower.split(/\s+/).slice(-1)[0];

  try {
    const searchUrl =
      `${SEARCH}?part=snippet&type=video&order=${order}&maxResults=15` +
      `&q=${encodeURIComponent(q)}&publishedAfter=${publishedAfter}` +
      (channelId ? `&channelId=${channelId}` : "") +
      `&key=${key}`;
    const sres = await fetch(searchUrl, { cache: "no-store" });
    if (!sres.ok) {
      const t = await sres.text();
      return NextResponse.json({ step: "search", status: sres.status, body: t.slice(0, 600) });
    }
    const sdata = (await sres.json()) as {
      items?: { id?: { videoId?: string } }[];
    };
    const ids = (sdata.items ?? [])
      .map((i) => i.id?.videoId)
      .filter((x): x is string => !!x);

    if (ids.length === 0) {
      return NextResponse.json({ team, q, publishedAfter, candidates: [], note: "no results" });
    }

    const vUrl = `${VIDEOS}?part=snippet,contentDetails&id=${ids.join(",")}&key=${key}`;
    const vres = await fetch(vUrl, { cache: "no-store" });
    const vdata = (await vres.json()) as {
      items?: {
        id: string;
        snippet?: { title?: string; channelTitle?: string; publishedAt?: string };
        contentDetails?: { duration?: string };
      }[];
    };

    const candidates = (vdata.items ?? []).map((v) => {
      const title = v.snippet?.title ?? "";
      const tl = title.toLowerCase();
      const channel = v.snippet?.channelTitle ?? "";
      const published = v.snippet?.publishedAt ?? "";
      const durationSec = parseDuration(v.contentDetails?.duration ?? "");
      const hasTeam = tl.includes(lower) || (lastWord.length >= 3 && tl.includes(lastWord));
      const hasHighlight = /highlight/i.test(title);
      const excluded = EXCLUDE.test(title);
      const goodDuration = durationSec >= 180 && durationSec <= 1200;
      const passes = hasTeam && hasHighlight && !excluded && goodDuration;
      return {
        title,
        channel,
        published,
        durationSec,
        mins: +(durationSec / 60).toFixed(1),
        url: `https://www.youtube.com/watch?v=${v.id}`,
        flags: { hasTeam, hasHighlight, excluded, goodDuration },
        passes,
      };
    });

    const selected = candidates.find((c) => c.passes) ?? null;

    return NextResponse.json({
      team,
      q,
      league: league ?? null,
      channelId: channelId ?? null,
      publishedAfter,
      selected: selected
        ? { title: selected.title, channel: selected.channel, mins: selected.mins, url: selected.url }
        : null,
      candidateCount: candidates.length,
      candidates,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 200 });
  }
}
