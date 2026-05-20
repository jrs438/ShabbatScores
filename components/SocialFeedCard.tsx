"use client";
import { useEffect, useMemo, useState } from "react";
import { usePolling } from "./usePolling";
import type { SocialPost } from "@/lib/telegram";
import type { UserSettings } from "@/lib/settings";

type Resp = { posts: SocialPost[]; updatedAt?: string };

const POSTS_PER_PAGE = 2;
const POST_LIMIT = 10;
const CYCLE_MS = 12_000;

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
  const TEXT_LIMIT = 280;
  const truncated = p.text.length > TEXT_LIMIT;
  const shown = truncated ? p.text.slice(0, TEXT_LIMIT).trim() + "…" : p.text;
  return (
    <article className="border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
      <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-400">
        <SourceBadge source={p.source} />
        <span className="truncate font-medium text-zinc-300">{p.channelTitle}</span>
        <span className="text-zinc-600">·</span>
        <span>{relativeTime(p.publishedAt)}</span>
      </div>
      {shown && (
        <div className="whitespace-pre-line text-sm leading-snug text-zinc-100">
          {shown}
        </div>
      )}
      {p.photos.length > 0 && (
        <div className={`mt-2 grid gap-1 ${p.photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {p.photos.slice(0, 2).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="h-28 w-full rounded object-cover"
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
  const allPosts = data?.posts ?? [];
  const posts = useMemo(() => allPosts.slice(0, POST_LIMIT), [allPosts]);

  const pages = useMemo(() => {
    const out: SocialPost[][] = [];
    for (let i = 0; i < posts.length; i += POSTS_PER_PAGE) {
      out.push(posts.slice(i, i + POSTS_PER_PAGE));
    }
    return out;
  }, [posts]);

  const [pageIdx, setPageIdx] = useState(0);

  // Reset to first page whenever the underlying post list changes
  useEffect(() => {
    setPageIdx(0);
  }, [posts.length, posts[0]?.id]);

  // Auto-advance
  useEffect(() => {
    if (pages.length <= 1) return;
    const id = setInterval(() => {
      setPageIdx((p) => (p + 1) % pages.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [pages.length]);

  const activePage = pages[pageIdx % Math.max(pages.length, 1)] ?? [];

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-panel/80 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Social feed
        </h2>
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          {pages.length > 0 && (
            <span>
              {pageIdx + 1}/{pages.length}
            </span>
          )}
          {lastFetched && (
            <span>
              {lastFetched.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3" style={{ minHeight: 320 }}>
        {posts.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">Loading feed…</div>
        ) : (
          activePage.map((p) => <PostItem key={p.id} p={p} />)
        )}
      </div>
      {pages.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {pages.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === pageIdx ? "w-4 bg-accent" : "w-1 bg-zinc-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
