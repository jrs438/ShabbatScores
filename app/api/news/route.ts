import { NextResponse, type NextRequest } from "next/server";
import { XMLParser } from "fast-xml-parser";
import type { NewsItem, NewsCategory } from "@/lib/types";

export const revalidate = 600;
export const dynamic = "force-dynamic";

type Feed = { url: string; source: string; category: NewsCategory };

// Source catalog grouped by topical category. Add/remove freely.
const ALL_FEEDS: Feed[] = [
  // Top / mainstream
  { url: "https://feeds.bbci.co.uk/news/rss.xml", source: "BBC", category: "top" },
  { url: "https://feeds.npr.org/1001/rss.xml", source: "NPR", category: "top" },
  // US
  { url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", source: "BBC US", category: "us" },
  { url: "https://feeds.npr.org/1003/rss.xml", source: "NPR US", category: "us" },
  // World
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World", category: "world" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", category: "world" },
  // Israel
  { url: "https://www.timesofisrael.com/feed/", source: "Times of Israel", category: "israel" },
  { url: "https://rss.jpost.com/rss/rssfeedsfrontpage.aspx", source: "Jerusalem Post", category: "israel" },
  { url: "https://www.ynetnews.com/Integration/StoryRss2.xml", source: "Ynet", category: "israel" },
  // Sports
  { url: "https://www.espn.com/espn/rss/news", source: "ESPN", category: "sports" },
];

const DEFAULT_CATEGORIES: NewsCategory[] = ["top", "us", "israel", "sports"];
const VALID: NewsCategory[] = ["top", "us", "world", "israel", "sports"];

function ensureArray<T>(x: T | T[] | undefined | null): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

type RssItem = {
  title?: string | { "#text"?: string };
  link?: string | { "@_href"?: string; "#text"?: string };
  pubDate?: string;
  published?: string;
  updated?: string;
};

function textOf(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj["#text"] === "string") return (obj["#text"] as string).trim();
    if (typeof obj["@_href"] === "string") return (obj["@_href"] as string).trim();
  }
  return "";
}

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      next: { revalidate: 600 },
      headers: {
        "User-Agent": "ShabbatScores/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? null;
    const items: RssItem[] = ensureArray<RssItem>(rawItems);
    return items.slice(0, 8).map((it) => ({
      title: textOf(it.title) || "(untitled)",
      source: feed.source,
      link: textOf(it.link),
      pubDate: it.pubDate ?? it.published ?? it.updated ?? new Date().toISOString(),
      category: feed.category,
    }));
  } catch (e) {
    console.error("RSS fail", feed.source, e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const catParam = req.nextUrl.searchParams.get("cat");
  const requested = catParam
    ? (catParam.split(",").filter((c) => VALID.includes(c as NewsCategory)) as NewsCategory[])
    : DEFAULT_CATEGORIES;
  const categories = requested.length > 0 ? requested : DEFAULT_CATEGORIES;

  const feeds = ALL_FEEDS.filter((f) => categories.includes(f.category));
  const results = await Promise.all(feeds.map(fetchFeed));
  const all = results.flat();

  // Round-robin interleave across the selected categories so no single source
  // dominates the ticker.
  const buckets = new Map<NewsCategory, NewsItem[]>();
  for (const item of all) {
    const arr = buckets.get(item.category) ?? [];
    arr.push(item);
    buckets.set(item.category, arr);
  }
  const merged: NewsItem[] = [];
  let added = true;
  let round = 0;
  while (added) {
    added = false;
    for (const cat of categories) {
      const arr = buckets.get(cat);
      if (arr && arr[round]) {
        merged.push(arr[round]);
        added = true;
      }
    }
    round++;
  }

  return NextResponse.json(
    { items: merged.slice(0, 50), updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } }
  );
}
