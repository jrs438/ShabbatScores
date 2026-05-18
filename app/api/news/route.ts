import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "@/lib/types";

export const revalidate = 600;
export const dynamic = "force-dynamic";

type Feed = { url: string; source: string; category: NewsItem["category"] };

const FEEDS: Feed[] = [
  { url: "https://www.timesofisrael.com/feed/", source: "Times of Israel", category: "israel" },
  { url: "https://rss.jpost.com/rss/rssfeedsfrontpage.aspx", source: "Jerusalem Post", category: "israel" },
  { url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", source: "BBC", category: "us" },
  { url: "https://feeds.npr.org/1001/rss.xml", source: "NPR", category: "us" },
];

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
      headers: { "User-Agent": "ShabbatScores/1.0", Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const rawItems =
      parsed?.rss?.channel?.item ??
      parsed?.feed?.entry ??
      null;
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

export async function GET() {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const all = results.flat();
  // Interleave Israel + US so the ticker mixes both
  const israel = all.filter((i) => i.category === "israel");
  const us = all.filter((i) => i.category !== "israel");
  const merged: NewsItem[] = [];
  const max = Math.max(israel.length, us.length);
  for (let i = 0; i < max; i++) {
    if (israel[i]) merged.push(israel[i]);
    if (us[i]) merged.push(us[i]);
  }
  return NextResponse.json(
    { items: merged.slice(0, 40), updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } }
  );
}
