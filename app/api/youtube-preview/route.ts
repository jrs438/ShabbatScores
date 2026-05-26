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

// Title words that signal NOT a standard game-highlight recap. Note we do NOT
// exclude "full game" — the NBA titles its official condensed highlights
// "FULL GAME HIGHLIGHTS". The much longer "EXTENDED" cut and "replay" are
// excluded (and the duration cap catches them anyway).
const EXCLUDE =
  /press conf|interview|preview|reaction|mic'?d|podcast|pregame|post-?game show|media availability|extended|replay|live ?stream|top \d+ plays|trailer/i;

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
  const handle = sp.get("handle"); // e.g. nyknicks — resolves to a channel and lists its uploads

  // Resolve a @handle to a channel id (1 unit). Lets us inspect a team's own
  // channel or the top-plays channel without knowing the UC… id.
  let resolvedChannelId: string | undefined =
    sp.get("channelId") ?? (league ? OFFICIAL_CHANNELS[league] : undefined);
  let handleInfo: { handle: string; channelId: string; title: string } | null = null;
  if (handle) {
    const chUrl =
      `https://www.googleapis.com/youtube/v3/channels?part=id,snippet` +
      `&forHandle=${encodeURIComponent(handle.replace(/^@/, ""))}&key=${key}`;
    const chRes = await fetch(chUrl, { cache: "no-store" });
    const chData = (await chRes.json()) as {
      items?: { id: string; snippet?: { title?: string } }[];
    };
    const ch = chData.items?.[0];
    if (ch) {
      resolvedChannelId = ch.id;
      handleInfo = { handle, channelId: ch.id, title: ch.snippet?.title ?? "" };
    } else {
      return NextResponse.json({ error: `Could not resolve handle @${handle}`, raw: chData });
    }
  }

  const channelId = resolvedChannelId;
  // In handle mode we list the channel's recent uploads (no search query),
  // since a team's own channel doesn't put "highlights" in titles.
  const q = sp.get("q") ?? (handle ? "" : channelId ? team : `${team} highlights`);
  // Team-channel listing doesn't require the word "highlight"; league search does.
  const requireHighlight = sp.get("reqHl")
    ? sp.get("reqHl") === "1"
    : !handle;
  const hours = parseInt(sp.get("hours") ?? "36", 10);
  const order = sp.get("order") ?? "date";
  const publishedAfter = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  // Title-match terms: the full team string + its last word (nickname).
  const lower = team.toLowerCase();
  const lastWord = lower.split(/\s+/).slice(-1)[0];

  try {
    const searchUrl =
      `${SEARCH}?part=snippet&type=video&order=${order}&maxResults=15` +
      (q ? `&q=${encodeURIComponent(q)}` : "") +
      `&publishedAfter=${publishedAfter}` +
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
      return NextResponse.json({
        team,
        q,
        handleInfo,
        channelId: channelId ?? null,
        publishedAfter,
        candidates: [],
        note: "no results",
      });
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
      const goodDuration = durationSec >= 120 && durationSec <= 1200;
      // In handle (team-channel) mode we trust the channel and don't require
      // the word "highlight" in the title — just duration + not-excluded.
      const passes =
        (handle ? true : hasTeam) &&
        (requireHighlight ? hasHighlight : true) &&
        !excluded &&
        goodDuration;
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
      handleInfo,
      channelId: channelId ?? null,
      requireHighlight,
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
