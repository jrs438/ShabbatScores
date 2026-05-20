import { XMLParser } from "fast-xml-parser";
import { getFullCatalog } from "./teamCatalog";
import type { LeagueKey } from "./teams";

// Official league + general sports highlight channels. Each posts clips
// throughout games; together they cover most major-team highlights.
const LEAGUE_CHANNELS: { id: string; label: string }[] = [
  { id: "UCoLrcjPV5PbUrUyXq5mjc_A", label: "MLB" },
  { id: "UCWJ2lWNubArHWmf3FIHbfcQ", label: "NBA" },
  { id: "UCDVYQ4Zhbm3S2dlz7P1GBDg", label: "NFL" },
  { id: "UCqFMzb-4AUf6WAIbl132QKA", label: "NHL" },
  { id: "UCiWLfSweyRNmLpgEHekhoAg", label: "ESPN" },
  { id: "UCqQo7ewe87aYAe7ub5UqXMw", label: "HoH" }, // House of Highlights
];

// Which leagues each channel can plausibly cover. League-specific channels
// only post their own sport; ESPN and HoH are multi-sport. Used to gate
// title matching so "Giants" on the MLB channel doesn't surface for a fan
// of the NFL New York Giants.
const CHANNEL_LEAGUES: Record<string, LeagueKey[]> = {
  MLB: ["mlb"],
  NBA: ["nba"],
  NFL: ["nfl"],
  NHL: ["nhl"],
  ESPN: ["mlb", "nba", "nfl", "nhl", "college-football", "mens-college-basketball"],
  HoH: ["nba", "mens-college-basketball"],
};

export type Highlight = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channel: string;
  url: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

type YtEntry = {
  "yt:videoId"?: string;
  title?: string | { "#text"?: string };
  link?: { "@_href"?: string };
  published?: string;
  "media:group"?: {
    "media:thumbnail"?: { "@_url"?: string };
    "media:description"?: string | { "#text"?: string };
  };
};

function textOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj["#text"] === "string") return obj["#text"] as string;
  }
  return "";
}

async function fetchChannelHighlights(channelId: string, label: string): Promise<Highlight[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { "User-Agent": "ShabbatScores/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const raw = parsed?.feed?.entry;
    const entries: YtEntry[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return entries
      .map((e) => ({
        id: e["yt:videoId"] ?? "",
        title: textOf(e.title) || "",
        description: textOf(e["media:group"]?.["media:description"]) || "",
        thumbnail: e["media:group"]?.["media:thumbnail"]?.["@_url"] ?? "",
        publishedAt: e.published ?? "",
        channel: label,
        url: e.link?.["@_href"] ?? "",
      }))
      .filter((h) => h.id);
  } catch (err) {
    console.error("Highlights fetch failed", label, err);
    return [];
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function fetchHighlights(teamIds: string[]): Promise<Highlight[]> {
  // Per-team match data: league + a set of title patterns (name, displayName,
  // abbreviation). The league is what disambiguates same-named teams across
  // sports (NFL Giants vs MLB Giants, etc).
  type TeamMatch = { league: LeagueKey; patterns: RegExp[] };
  let teamMatches: TeamMatch[] = [];
  if (teamIds.length > 0) {
    try {
      const catalog = await getFullCatalog();
      const allTeams = Object.values(catalog).flat();
      const byId = new Map(allTeams.map((t) => [t.id, t]));
      for (const id of teamIds) {
        const t = byId.get(id);
        if (!t) continue;
        const names = new Set<string>();
        if (t.name) names.add(t.name);
        if (t.displayName) names.add(t.displayName);
        if (t.abbr && t.abbr.length >= 2) names.add(t.abbr);
        const patterns = Array.from(names)
          .filter((n) => n.length >= 2)
          .map((n) => new RegExp(`\\b${escapeRegex(n)}\\b`, "i"));
        if (patterns.length > 0) {
          teamMatches.push({ league: t.league, patterns });
        }
      }
    } catch (err) {
      console.error("catalog lookup for highlights failed", err);
    }
  }

  const lists = await Promise.allSettled(
    LEAGUE_CHANNELS.map((c) => fetchChannelHighlights(c.id, c.label))
  );
  const all = lists.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // Last 48 hours so the pool is large enough during slow days.
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recent = all.filter((h) => {
    const ts = new Date(h.publishedAt).getTime();
    return !Number.isNaN(ts) && ts >= cutoff;
  });

  const videoMatches = (h: Highlight): boolean => {
    const allowedLeagues = CHANNEL_LEAGUES[h.channel] ?? [];
    if (allowedLeagues.length === 0) return false;
    // Match against title + description because per-play clips usually have
    // a player name in the title and only mention the team in the description
    // (e.g. "Pete Alonso's 2-run HR" / description: "...for the New York Mets").
    const haystack = `${h.title}\n${h.description}`;
    for (const t of teamMatches) {
      if (!allowedLeagues.includes(t.league)) continue;
      if (t.patterns.some((re) => re.test(haystack))) return true;
    }
    return false;
  };

  const matching = teamMatches.length ? recent.filter(videoMatches) : recent;

  // Dedupe by video ID (some clips appear on multiple channels)
  const seen = new Set<string>();
  const unique = matching.filter((h) => {
    if (seen.has(h.id)) return false;
    seen.add(h.id);
    return true;
  });

  unique.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return unique.slice(0, 20);
}
