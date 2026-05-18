"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets: { load: (el?: HTMLElement) => void };
    };
  }
}

const WIDGETS_SRC = "https://platform.twitter.com/widgets.js";

function ensureScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.twttr?.widgets) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGETS_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = WIDGETS_SRC;
    s.async = true;
    s.charset = "utf-8";
    s.addEventListener("load", () => resolve(), { once: true });
    document.head.appendChild(s);
  });
}

export default function XListCard({ listUrl }: { listUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    ensureScript().then(() => {
      if (cancelled || !ref.current) return;
      window.twttr?.widgets.load(ref.current);
    });
    return () => {
      cancelled = true;
    };
  }, [listUrl]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-panel/80 p-2">
      <div className="mb-2 flex items-center justify-between px-2 pt-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          X · Live feed
        </h2>
        <span className="text-[10px] text-zinc-600">auto-updates</span>
      </div>
      <div ref={ref} className="overflow-hidden rounded-xl">
        <a
          className="twitter-timeline"
          data-theme="dark"
          data-chrome="noheader nofooter noborders transparent"
          data-height="600"
          href={listUrl}
        >
          Loading feed…
        </a>
      </div>
    </div>
  );
}
