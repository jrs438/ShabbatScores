"use client";
import { useState } from "react";
import { normalizeBlueskyHandle, normalizeTelegramHandle } from "@/lib/settings";

type Props = {
  telegramChannels: string[];
  blueskyHandles: string[];
  onChange: (patch: { telegramChannels?: string[]; blueskyHandles?: string[] }) => void;
};

function HandleList({
  label,
  items,
  placeholder,
  normalize,
  onChange,
  helpText,
}: {
  label: string;
  items: string[];
  placeholder: string;
  normalize: (s: string) => string;
  onChange: (next: string[]) => void;
  helpText: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = normalize(draft);
    if (!v) return;
    if (items.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...items, v]);
    setDraft("");
  };

  const remove = (v: string) => onChange(items.filter((x) => x !== v));

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {label} ({items.length})
        </h4>
      </div>
      <p className="mb-2 text-[10px] text-zinc-600">{helpText}</p>
      <div className="mb-2 flex flex-col gap-1.5">
        {items.length === 0 ? (
          <p className="rounded-md bg-panel2/60 px-3 py-2 text-xs text-zinc-500">None added.</p>
        ) : (
          items.map((v) => (
            <div
              key={v}
              className="flex items-center justify-between gap-2 rounded-md bg-panel2 px-3 py-1.5"
            >
              <span className="truncate text-sm">{v}</span>
              <button
                onClick={() => remove(v)}
                className="rounded px-2 py-0.5 text-[10px] font-bold text-bad hover:bg-bad/10"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-md bg-bg px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-accent"
        />
        <button
          onClick={add}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function SocialSourcesEditor({
  telegramChannels,
  blueskyHandles,
  onChange,
}: Props) {
  return (
    <div>
      <HandleList
        label="Telegram channels"
        items={telegramChannels}
        placeholder="osint613 or t.me/osint613"
        normalize={normalizeTelegramHandle}
        onChange={(next) => onChange({ telegramChannels: next })}
        helpText="Public Telegram channels only. Paste a handle, a t.me URL, or a t.me message URL — we'll clean it up."
      />
      <HandleList
        label="Bluesky accounts"
        items={blueskyHandles}
        placeholder="avivaklompas.bsky.social"
        normalize={normalizeBlueskyHandle}
        onChange={(next) => onChange({ blueskyHandles: next })}
        helpText="Bluesky handles look like name.bsky.social or a custom domain (e.g. bellingcat.com)."
      />
    </div>
  );
}
