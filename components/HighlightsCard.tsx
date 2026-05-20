"use client";
import { useEffect, useMemo, useState } from "react";
import { usePolling } from "./usePolling";
import type { UserSettings } from "@/lib/settings";

type Highlight = {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channel: string;
  url: string;
};
type Resp = { highlights: Highlight[]; updatedAt?: string };

const ROTATE_MS = 4 * 60_000;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HighlightsCard({ settings }: { settings?: UserSettings }) {
  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (settings && settings.followed.length) {
      params.set("teams", settings.followed.join(","));
    }
    const q = params.toString();
    return q ? `/api/highlights?${q}` : "/api/highlights";
  }, [settings]);

  const { data } = usePolling<Resp>(url, 5 * 60_000, { highlights: [] });
  const highlights = data?.highlights ?? [];
  const [idx, setIdx] = useState(0);

  // Reset to the newest video whenever the underlying list changes
  useEffect(() => {
    setIdx(0);
  }, [highlights.length, highlights[0]?.id]);

  // Auto-rotate through available highlights
  useEffect(() => {
    if (highlights.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % highlights.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [highlights.length]);

  if (highlights.length === 0) return null;

  const active = highlights[idx % highlights.length];
  const embedSrc =
    `https://www.youtube.com/embed/${active.id}` +
    `?autoplay=1&mute=1&loop=1&playlist=${active.id}` +
    `&controls=0&modestbranding=1&playsinline=1&rel=0`;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-panel/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Live highlights
        </h2>
        <span className="text-[10px] text-zinc-600">
          {idx + 1}/{highlights.length}
        </span>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-bg">
        <iframe
          key={active.id}
          src={embedSrc}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="mt-2 text-xs">
        <div className="line-clamp-2 leading-snug text-zinc-200">{active.title}</div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
          <span className="rounded bg-bad/20 px-1 font-bold uppercase text-bad">
            {active.channel}
          </span>
          <span>{relativeTime(active.publishedAt)}</span>
          <span className="ml-auto text-zinc-600">muted · auto</span>
        </div>
      </div>
    </div>
  );
}
