"use client";
import { useState } from "react";
import { FOLLOWED_TEAMS, LEAGUE_LABEL } from "@/lib/teams";
import { buildShareUrl, type UserSettings } from "@/lib/settings";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
  onReset: () => void;
};

function TeamRow({
  abbr,
  name,
  league,
  isFollowed,
  isPrimary,
  onToggleFollow,
  onTogglePrimary,
}: {
  abbr: string;
  name: string;
  league: string;
  isFollowed: boolean;
  isPrimary: boolean;
  onToggleFollow: () => void;
  onTogglePrimary: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-panel2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{league}</div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={onToggleFollow}
          className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
            isFollowed ? "bg-good/20 text-good" : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {isFollowed ? "Followed" : "Follow"}
        </button>
        <button
          onClick={onTogglePrimary}
          disabled={!isFollowed}
          className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
            isPrimary
              ? "bg-accent2/30 text-accent2"
              : "bg-zinc-800 text-zinc-500 disabled:opacity-40"
          }`}
        >
          {isPrimary ? "★ Primary" : "☆ Primary"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsDrawer({ open, onClose, settings, onChange, onReset }: Props) {
  const [zipDraft, setZipDraft] = useState(settings.locationZip);
  const [labelDraft, setLabelDraft] = useState(settings.locationLabel);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const followedSet = new Set(settings.followed);
  const primarySet = new Set(settings.primary);

  const toggleFollow = (abbr: string) => {
    const next = new Set(followedSet);
    if (next.has(abbr)) {
      next.delete(abbr);
      // Removing follow also removes primary
      const np = new Set(primarySet);
      np.delete(abbr);
      onChange({ followed: Array.from(next), primary: Array.from(np) });
    } else {
      next.add(abbr);
      onChange({ followed: Array.from(next) });
    }
  };

  const togglePrimary = (abbr: string) => {
    const next = new Set(primarySet);
    if (next.has(abbr)) next.delete(abbr);
    else next.add(abbr);
    onChange({ primary: Array.from(next) });
  };

  const saveLocation = () => {
    onChange({
      locationZip: zipDraft.trim() || settings.locationZip,
      locationLabel: labelDraft.trim() || settings.locationLabel,
    });
  };

  const copyShare = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = buildShareUrl(origin, settings);
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // Fallback: prompt the user
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
            Used for weather forecast and Shabbat candle-lighting times.
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
            Teams
          </h3>
          <p className="mb-3 text-xs text-zinc-500">
            <strong>Follow</strong> a team to see its games as cards.{" "}
            <strong>Primary</strong> teams get a hero card with live gamecast detail when they're playing.
          </p>
          <div className="flex flex-col gap-2">
            {FOLLOWED_TEAMS.map((t) => (
              <TeamRow
                key={t.abbr}
                abbr={t.abbr}
                name={t.displayName}
                league={LEAGUE_LABEL[t.league]}
                isFollowed={followedSet.has(t.abbr)}
                isPrimary={primarySet.has(t.abbr)}
                onToggleFollow={() => toggleFollow(t.abbr)}
                onTogglePrimary={() => togglePrimary(t.abbr)}
              />
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Share
          </h3>
          <p className="mb-3 text-xs text-zinc-500">
            Send a friend a link with your team picks and location pre-filled. Their dashboard
            will save the picks the moment they open the link.
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
