"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePolling } from "./usePolling";
import type { UserSettings } from "@/lib/settings";

type Pick = {
  videoId: string;
  title: string;
  publishedAt: string;
  durationSec: number;
  source: "team" | "league" | "topplays";
  teamId?: string;
  teamName?: string;
};
type Resp = { recaps: Pick[]; topPlays: Pick | null };

const FALLBACK_MS = 15 * 60_000; // safety advance if "ended" never fires

function label(p: Pick): string {
  if (p.source === "topplays") return "Top 10 Plays";
  if (p.teamName) return `${p.teamName} — Highlights`;
  return "Highlights";
}

export default function MorningVideo({ settings }: { settings?: UserSettings }) {
  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (settings && settings.primary.length) params.set("teams", settings.primary.join(","));
    const q = params.toString();
    return q ? `/api/morning-video?${q}` : "/api/morning-video";
  }, [settings]);

  const { data } = usePolling<Resp>(url, 10 * 60_000, { recaps: [], topPlays: null });

  // Playlist = each primary team's recap, then the top-plays reel.
  const playlist = useMemo(() => {
    const list: Pick[] = [...(data?.recaps ?? [])];
    if (data?.topPlays) list.push(data.topPlays);
    return list;
  }, [data]);

  const [idx, setIdx] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIdx(0);
  }, [playlist.length, playlist[0]?.videoId]);

  // Advance when the current video ends (YouTube postMessage).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.origin !== "string" || !e.origin.includes("youtube.com")) return;
      let d: { event?: string; info?: number } | null = null;
      try {
        d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (d?.event === "onStateChange" && d?.info === 0) {
        setIdx((i) => (playlist.length ? (i + 1) % playlist.length : 0));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [playlist.length]);

  // Safety-net advance in case the ended event doesn't fire.
  useEffect(() => {
    if (playlist.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % playlist.length), FALLBACK_MS);
    return () => clearInterval(t);
  }, [playlist.length]);

  const handleLoad = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
      win.postMessage(
        JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
        "*"
      );
    } catch {
      /* fallback timer covers it */
    }
  };

  if (settings && settings.videoHighlights === false) return null;

  if (playlist.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-panel/80 p-6 text-center text-sm text-zinc-500">
        No game highlights for your teams yet this morning. Check back after games wrap up.
      </div>
    );
  }

  const active = playlist[idx % playlist.length];
  const src =
    `https://www.youtube.com/embed/${active.videoId}` +
    `?autoplay=1&mute=1&controls=1&modestbranding=1&playsinline=1&rel=0&enablejsapi=1`;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-panel/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Morning highlights
        </h2>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>
            {idx + 1}/{playlist.length}
          </span>
          <div className="flex gap-1">
            {playlist.map((p, i) => (
              <span
                key={p.videoId}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-5 bg-accent2" : "w-1.5 bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      {/* Cap height (~40vh) so the video + scores fit one iPad screen. */}
      <div className="relative mx-auto aspect-video w-full max-w-[72vh] overflow-hidden rounded-xl bg-bg">
        <iframe
          key={active.videoId}
          ref={iframeRef}
          src={src}
          onLoad={handleLoad}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            active.source === "topplays" ? "bg-accent2/20 text-accent2" : "bg-accent/20 text-accent"
          }`}
        >
          {label(active)}
        </span>
        <span className="truncate text-sm text-zinc-200">{active.title}</span>
      </div>
    </div>
  );
}
