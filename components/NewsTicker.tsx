"use client";
import { useMemo } from "react";
import { usePolling } from "./usePolling";
import type { NewsItem, Game } from "@/lib/types";
import type { UserSettings } from "@/lib/settings";

type NewsResp = { items: NewsItem[] };
type SportsResp = { games: Game[] };

// Seconds of screen time per item — higher = slower scroll. The total
// animation duration scales with item count so speed stays constant.
const SECONDS_PER_ITEM = 9;

function scoreSnippet(g: Game): string {
  const status =
    g.status === "live"
      ? `LIVE ${g.statusDetail}`
      : g.status === "final"
      ? "FINAL"
      : g.statusDetail;
  const aw = `${g.away.abbr} ${g.away.score ?? "-"}`;
  const hm = `${g.home.abbr} ${g.home.score ?? "-"}`;
  return `${g.league}: ${aw} @ ${hm} · ${status}`;
}

export default function NewsTicker({ settings }: { settings?: UserSettings }) {
  const newsUrl = useMemo(() => {
    if (settings?.newsCategories?.length) {
      return `/api/news?cat=${settings.newsCategories.join(",")}`;
    }
    return "/api/news";
  }, [settings]);

  const news = usePolling<NewsResp>(newsUrl, 10 * 60_000, { items: [] });
  const sports = usePolling<SportsResp>("/api/sports", 60_000, { games: [] });

  const items = useMemo(() => {
    const headlines = (news.data?.items ?? []).map((n) => ({
      text: `[${n.source}] ${n.title}`,
      kind: n.category as string,
    }));
    const scores = (sports.data?.games ?? [])
      .filter((g) => g.status === "live" || g.status === "final")
      .map((g) => ({ text: scoreSnippet(g), kind: "score" }));
    const mixed: { text: string; kind: string }[] = [];
    const max = Math.max(headlines.length, scores.length);
    for (let i = 0; i < max; i++) {
      if (scores[i]) mixed.push(scores[i]);
      if (headlines[i]) mixed.push(headlines[i]);
    }
    return mixed.length > 0 ? mixed : [{ text: "Loading headlines…", kind: "loading" }];
  }, [news.data, sports.data]);

  const doubled = useMemo(() => [...items, ...items], [items]);
  const durationSec = Math.max(60, items.length * SECONDS_PER_ITEM);

  return (
    <div className="flex h-full items-center overflow-hidden">
      <div
        className="ticker-track"
        style={{ animation: `ticker ${durationSec}s linear infinite` }}
      >
        {doubled.map((it, i) => (
          <span key={i} className="mx-8 inline-flex items-center gap-3 text-base">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                it.kind === "israel"
                  ? "bg-accent"
                  : it.kind === "sports" || it.kind === "score"
                  ? "bg-bad"
                  : it.kind === "world"
                  ? "bg-purple-400"
                  : "bg-zinc-500"
              }`}
            />
            <span className="text-zinc-200">{it.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
