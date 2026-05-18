"use client";
import { useMemo } from "react";
import { usePolling } from "./usePolling";
import type { SocialPost } from "@/lib/telegram";
import type { UserSettings } from "@/lib/settings";

type Resp = { posts: SocialPost[]; updatedAt?: string };

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function SourceBadge({ source }: { source: SocialPost["source"] }) {
  const color =
    source === "telegram"
      ? "bg-sky-500/20 text-sky-300"
      : "bg-purple-500/20 text-purple-300";
  const label = source === "telegram" ? "TG" : "BSKY";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${color}`}>
      {label}
    </span>
  );
}

function PostItem({ p }: { p: SocialPost }) {
  // Limit visible text length so the card stays scannable. Long posts get a fade.
  const TEXT_LIMIT = 320;
  const truncated = p.text.length > TEXT_LIMIT;
  const shown = truncated ? p.text.slice(0, TEXT_LIMIT).trim() + "…" : p.text;
  return (
    <article className="border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
      <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-400">
        <SourceBadge source={p.source} />
        <span className="font-medium text-zinc-300">{p.channelTitle}</span>
        <span className="text-zinc-600">·</span>
        <span>{relativeTime(p.publishedAt)}</span>
        {p.views && <span className="ml-auto text-[10px] text-zinc-600">{p.views} views</span>}
      </div>
      {shown && (
        <div className="whitespace-pre-line text-sm leading-snug text-zinc-100">
          {shown}
        </div>
      )}
      {p.photos.length > 0 && (
        <div className={`mt-2 grid gap-1 ${p.photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {p.photos.slice(0, 4).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="h-32 w-full rounded object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>
      )}
      {p.hasVideo && p.photos.length === 0 && (
        <div className="mt-2 rounded bg-zinc-800/40 px-2 py-1.5 text-[11px] text-zinc-400">
          🎬 Video post
        </div>
      )}
    </article>
  );
}

export default function SocialFeedCard({ settings }: { settings?: UserSettings }) {
  const url = useMemo(() => {
    if (!settings) return "/api/social";
    const params = new URLSearchParams();
    if (settings.telegramChannels.length) params.set("tg", settings.telegramChannels.join(","));
    if (settings.blueskyHandles.length) params.set("bs", settings.blueskyHandles.join(","));
    const q = params.toString();
    return q ? `/api/social?${q}` : "/api/social";
  }, [settings]);
  const { data, lastFetched } = usePolling<Resp>(url, 120_000, { posts: [] });
  const posts = data?.posts ?? [];

  const grouped = useMemo(() => posts, [posts]);

  return (
    <div className="sticky top-4 rounded-2xl border border-zinc-800 bg-panel/80 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Social feed
        </h2>
        {lastFetched && (
          <span className="text-[10px] text-zinc-600">
            {lastFetched.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
      <div
        className="flex flex-col gap-3 overflow-y-auto pr-1"
        style={{ maxHeight: "calc(100vh - 240px)" }}
      >
        {grouped.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">Loading feed…</div>
        ) : (
          grouped.map((p) => <PostItem key={p.id} p={p} />)
        )}
      </div>
    </div>
  );
}
