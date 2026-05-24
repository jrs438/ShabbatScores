"use client";
import { useState } from "react";
import TeamPicker from "./TeamPicker";
import SocialSourcesEditor from "./SocialSourcesEditor";
import { buildShareUrl, type UserSettings } from "@/lib/settings";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
  onReset: () => void;
};

export default function SettingsDrawer({ open, onClose, settings, onChange, onReset }: Props) {
  const [zipDraft, setZipDraft] = useState(settings.locationZip);
  const [labelDraft, setLabelDraft] = useState(settings.locationLabel);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const toggleFollow = (id: string) => {
    const f = new Set(settings.followed);
    const p = new Set(settings.primary);
    if (f.has(id)) {
      f.delete(id);
      p.delete(id);
    } else {
      f.add(id);
    }
    onChange({ followed: Array.from(f), primary: Array.from(p) });
  };

  const togglePrimary = (id: string) => {
    const p = new Set(settings.primary);
    if (p.has(id)) p.delete(id);
    else p.add(id);
    onChange({ primary: Array.from(p) });
  };

  const saveLocation = () => {
    onChange({
      locationZip: zipDraft.trim() || settings.locationZip,
      locationLabel: labelDraft.trim() || settings.locationLabel,
    });
  };

  const NEWS_CATEGORIES: { id: string; label: string; desc: string }[] = [
    { id: "top", label: "Top / Mainstream", desc: "NYT, CNN, WSJ, NPR" },
    { id: "us", label: "US", desc: "NYT US, CNN US, NPR US" },
    { id: "world", label: "World", desc: "NYT World, CNN World" },
    { id: "israel", label: "Israel", desc: "Times of Israel, JPost, Ynet" },
    { id: "sports", label: "Sports", desc: "ESPN" },
  ];
  const toggleNewsCat = (id: string) => {
    const set = new Set(settings.newsCategories);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ newsCategories: Array.from(set) });
  };

  const copyShare = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = buildShareUrl(origin, settings);
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      window.prompt("Copy this URL:", url);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative h-full w-full max-w-md overflow-y-auto bg-panel shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-panel/95 px-5 py-3 backdrop-blur">
          <h2 className="text-lg font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Done
          </button>
        </div>

        <section className="px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Location
          </h3>
          <p className="mb-3 text-xs text-zinc-500">
            Weather forecast and Shabbat candle-lighting times.
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wide text-zinc-500">
              City label (display only)
            </label>
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              placeholder="Paramus, NJ"
              className="rounded-md bg-bg px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-accent"
            />
            <label className="mt-2 text-[11px] uppercase tracking-wide text-zinc-500">
              ZIP code
            </label>
            <input
              value={zipDraft}
              onChange={(e) => setZipDraft(e.target.value)}
              placeholder="07652"
              inputMode="numeric"
              maxLength={5}
              className="rounded-md bg-bg px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-accent"
            />
            <button
              onClick={saveLocation}
              className="mt-1 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Save location
            </button>
          </div>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Video highlights
          </h3>
          <p className="mb-3 text-xs text-zinc-500">
            Auto-playing muted highlight clips from MLB / NBA / NFL / NHL / ESPN for your{" "}
            <span className="inline-flex items-center gap-1">
              <span className="rounded bg-accent2/30 px-1 text-[10px] font-bold text-accent2">★</span>
              Primary
            </span>{" "}
            teams only. Turn off if you prefer no video on the dashboard for Shabbat observance.
          </p>
          <button
            onClick={() => onChange({ videoHighlights: !settings.videoHighlights })}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold ${
              settings.videoHighlights
                ? "bg-good/20 text-good"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            <span>Video highlights card</span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                settings.videoHighlights ? "bg-good/30" : "bg-zinc-700"
              }`}
            >
              {settings.videoHighlights ? "On" : "Off"}
            </span>
          </button>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Teams
          </h3>
          <p className="mb-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <span className="rounded bg-good/20 px-1 text-[10px] font-bold text-good">✓</span>
              Followed
            </span>{" "}
            teams appear as cards.{" "}
            <span className="inline-flex items-center gap-1">
              <span className="rounded bg-accent2/30 px-1 text-[10px] font-bold text-accent2">★</span>
              Primary
            </span>{" "}
            teams get the hero gamecast when they're live and drive the video highlights card.
          </p>
          <TeamPicker
            followed={settings.followed}
            primary={settings.primary}
            onToggleFollow={toggleFollow}
            onTogglePrimary={togglePrimary}
          />
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Social feed
          </h3>
          <p className="mb-3 text-xs text-zinc-500">
            Telegram public channels and Bluesky accounts shown in the right-hand feed card.
            Both are free and update automatically; no logins required.
          </p>
          <SocialSourcesEditor
            telegramChannels={settings.telegramChannels}
            blueskyHandles={settings.blueskyHandles}
            onChange={onChange}
          />
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            News ticker
          </h3>
          <p className="mb-3 text-xs text-zinc-500">
            Choose which categories scroll along the bottom. Headlines are interleaved so no
            single source dominates.
          </p>
          <div className="flex flex-col gap-1.5">
            {NEWS_CATEGORIES.map((c) => {
              const on = settings.newsCategories.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleNewsCat(c.id)}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                    on ? "bg-good/15 text-zinc-100" : "bg-panel2 text-zinc-400"
                  }`}
                >
                  <span className="flex flex-col items-start">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-[10px] text-zinc-500">{c.desc}</span>
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      on ? "bg-good/30 text-good" : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {on ? "On" : "Off"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Share
          </h3>
          <p className="mb-3 text-xs text-zinc-500">
            Send a friend a link with your team picks and location pre-filled.
          </p>
          <button
            onClick={copyShare}
            className="w-full rounded-md bg-accent2 px-3 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            {copyState === "copied" ? "Copied!" : "Copy share link"}
          </button>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <button
            onClick={() => {
              if (confirm("Reset all settings to defaults?")) onReset();
            }}
            className="w-full rounded-md border border-bad/40 px-3 py-2 text-sm text-bad hover:bg-bad/10"
          >
            Reset to defaults
          </button>
        </section>
      </div>
    </div>
  );
}
