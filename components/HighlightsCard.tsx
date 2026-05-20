"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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

// Hard cap per clip. The YouTube state-change handler advances when each
// video finishes; this is just the safety net in case the API handshake
// gets blocked by the browser.
const FALLBACK_ROTATE_MS = 120_000;

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset to the newest video whenever the underlying list changes
  useEffect(() => {
    setIdx(0);
  }, [highlights.length, highlights[0]?.id]);

  // Listen for the YouTube player's "video ended" signal and advance
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // YouTube postMessages come from a youtube.com origin
      if (typeof event.origin !== "string" || !event.origin.includes("youtube.com")) return;
      let data: { event?: string; info?: number } | null = null;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      // info === 0 means PlayerState.ENDED
      if (data?.event === "onStateChange" && data?.info === 0) {
        setIdx((i) => (highlights.length ? (i + 1) % highlights.length : 0));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [highlights.length]);

  // Safety-net rotation in case the YouTube event never fires
  useEffect(() => {
    if (highlights.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % highlights.length);
    }, FALLBACK_ROTATE_MS);
    return () => clearInterval(id);
  }, [highlights.length]);

  // Tell the iframe to broadcast state changes after it loads
  const handleIframeLoad = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
        "*"
      );
      win.postMessage(
        JSON.stringify({
          event: "command",
          func: "addEventListener",
          args: ["onStateChange"],
        }),
        "*"
      );
    } catch {
      // ignore — fallback timer will still advance
    }
  };

  if (highlights.length === 0) return null;

  const active = highlights[idx % highlights.length];
  // No loop=1: we want the video to end so onStateChange fires
  const embedSrc =
    `https://www.youtube.com/embed/${active.id}` +
    `?autoplay=1&mute=1&controls=0&modestbranding=1` +
    `&playsinline=1&rel=0&enablejsapi=1`;

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
          ref={iframeRef}
          src={embedSrc}
          onLoad={handleIframeLoad}
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
