// YouTube Data API helpers for the morning highlights feature.
// Quota strategy: resolve a team's official channel once a month (search,
// 100 units, cached 30d); list uploads via the cheap playlistItems endpoint
// (1 unit) on a ~20-min cache. Channel uploads live in a playlist whose id is
// the channel id with the "UC" prefix swapped to "UU".

const API = "https://www.googleapis.com/youtube/v3";

// Official league channels — used as a fallback when a team channel can't be
// resolved or has no recent recap.
export const LEAGUE_FALLBACK: Record<string, string> = {
  mlb: "UCoLrcjPV5PbUrUyXq5mjc_A",
  nba: "UCWJ2lWNubArHWmf3FIHbfcQ",
  nfl: "UCDVYQ4Zhbm3S2dlz7P1GBDg",
  nhl: "UCqFMzb-4AUf6WAIbl132QKA",
};

// Daily all-sports top-10 channel ("NBA Daily").
export const TOP_PLAYS_CHANNEL = "UCEqzzlqF-3d7RWBYVYQrnQA";

const EXCLUDE =
  /press conf|interview|preview|reaction|mic'?d|podcast|pregame|post-?game show|media availability|extended|replay|live ?stream|top \d+ plays|trailer/i;

export type VideoPick = {
  videoId: string;
  title: string;
  publishedAt: string;
  durationSec: number;
  channelTitle: string;
  source: "team" | "league" | "topplays";
};

function key(): string | undefined {
  return process.env.YOUTUBE_API_KEY;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseDuration(iso: string): number {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    parseInt(m[1] ?? "0", 10) * 3600 +
    parseInt(m[2] ?? "0", 10) * 60 +
    parseInt(m[3] ?? "0", 10)
  );
}

// Resolve a team's official channel by title-exact match. Cached 30 days.
export async function resolveOfficialChannel(teamName: string): Promise<string | null> {
  const k = key();
  if (!k) return null;
  try {
    const url =
      `${API}/search?part=snippet&type=channel&maxResults=5` +
      `&q=${encodeURIComponent(teamName)}&key=${k}`;
    const res = await fetch(url, { next: { revalidate: 2_592_000 } }); // 30 days
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: { id?: { channelId?: string }; snippet?: { title?: string } }[];
    };
    const cands = (data.items ?? []).map((it) => ({
      title: it.snippet?.title ?? "",
      id: it.id?.channelId ?? "",
    }));
    const target = norm(teamName);
    const exact = cands.find((c) => norm(c.title) === target);
    if (exact?.id) return exact.id;
    const loose = cands.find(
      (c) => norm(c.title).includes(target) || target.includes(norm(c.title))
    );
    return loose?.id ?? null;
  } catch {
    return null;
  }
}

type Upload = { videoId: string; title: string; publishedAt: string };

async function recentUploads(channelId: string, max = 12): Promise<Upload[]> {
  const k = key();
  if (!k) return [];
  const uploads = channelId.replace(/^UC/, "UU");
  try {
    const url =
      `${API}/playlistItems?part=snippet&maxResults=${max}` +
      `&playlistId=${uploads}&key=${k}`;
    const res = await fetch(url, { next: { revalidate: 1200 } }); // 20 min
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: { snippet?: { resourceId?: { videoId?: string }; title?: string; publishedAt?: string } }[];
    };
    return (data.items ?? [])
      .map((it) => ({
        videoId: it.snippet?.resourceId?.videoId ?? "",
        title: it.snippet?.title ?? "",
        publishedAt: it.snippet?.publishedAt ?? "",
      }))
      .filter((u) => u.videoId);
  } catch {
    return [];
  }
}

async function durations(ids: string[]): Promise<Record<string, number>> {
  const k = key();
  if (!k || ids.length === 0) return {};
  try {
    const url = `${API}/videos?part=contentDetails&id=${ids.join(",")}&key=${k}`;
    const res = await fetch(url, { next: { revalidate: 1200 } });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      items?: { id: string; contentDetails?: { duration?: string } }[];
    };
    const out: Record<string, number> = {};
    for (const v of data.items ?? []) out[v.id] = parseDuration(v.contentDetails?.duration ?? "");
    return out;
  } catch {
    return {};
  }
}

// Pick the newest game recap from a channel's recent uploads: 2-20 min, not a
// presser/extended/etc. `requireTeam`/`requireHighlight` tune league vs team
// channel behavior.
async function pickRecap(
  channelId: string,
  opts: { teamName?: string; requireHighlight: boolean; source: VideoPick["source"]; recentHours: number }
): Promise<VideoPick | null> {
  const uploads = await recentUploads(channelId);
  if (uploads.length === 0) return null;
  const durMap = await durations(uploads.map((u) => u.videoId));
  const cutoff = Date.now() - opts.recentHours * 3600 * 1000;
  const target = opts.teamName ? norm(opts.teamName) : "";
  const lastWord = opts.teamName ? opts.teamName.toLowerCase().split(/\s+/).slice(-1)[0] : "";

  for (const u of uploads) {
    const dur = durMap[u.videoId] ?? 0;
    const ts = new Date(u.publishedAt).getTime();
    if (Number.isNaN(ts) || ts < cutoff) continue;
    if (dur < 120 || dur > 1200) continue;
    if (EXCLUDE.test(u.title)) continue;
    if (opts.requireHighlight && !/highlight/i.test(u.title)) continue;
    if (opts.teamName) {
      const tl = u.title.toLowerCase();
      const hasTeam = norm(u.title).includes(target) || (lastWord.length >= 3 && tl.includes(lastWord));
      // For the team's own channel we trust it; for the league channel require the team name.
      if (opts.source === "league" && !hasTeam) continue;
    }
    return {
      videoId: u.videoId,
      title: u.title,
      publishedAt: u.publishedAt,
      durationSec: dur,
      channelTitle: "",
      source: opts.source,
    };
  }
  return null;
}

// Full pipeline for one primary team: team channel first, league fallback.
export async function teamRecap(
  teamName: string,
  league: string,
  recentHours = 36
): Promise<VideoPick | null> {
  const channelId = await resolveOfficialChannel(teamName);
  if (channelId) {
    const fromTeam = await pickRecap(channelId, {
      teamName,
      requireHighlight: false,
      source: "team",
      recentHours,
    });
    if (fromTeam) return fromTeam;
  }
  const fallback = LEAGUE_FALLBACK[league];
  if (fallback) {
    return pickRecap(fallback, {
      teamName,
      requireHighlight: true,
      source: "league",
      recentHours,
    });
  }
  return null;
}

export async function topPlays(recentHours = 36): Promise<VideoPick | null> {
  return pickRecap(TOP_PLAYS_CHANNEL, {
    requireHighlight: false,
    source: "topplays",
    recentHours,
  });
}
