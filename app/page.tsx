"use client";
import { useEffect, useState } from "react";
import Clock from "@/components/Clock";
import SportsGrid from "@/components/SportsGrid";
import NewsTicker from "@/components/NewsTicker";
import WakeLockBadge from "@/components/WakeLockBadge";
import SocialFeedCard from "@/components/SocialFeedCard";
import SettingsDrawer from "@/components/SettingsDrawer";
import HebcalStripe from "@/components/HebcalStripe";
import WeatherStripe from "@/components/WeatherStripe";
import ScoreTickerBox from "@/components/ScoreTickerBox";
import HelpDrawer from "@/components/HelpDrawer";
import InstallHint from "@/components/InstallHint";
import MorningVideo from "@/components/MorningVideo";
import { useSettings } from "@/components/useSettings";
import { currentPhase, phaseShowsVideo, type DayPhase } from "@/lib/dayphase";

export default function Page() {
  const { settings, update, reset, ready } = useSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [phase, setPhase] = useState<DayPhase>("evening");

  useEffect(() => {
    const tick = () => setPhase(currentPhase());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const showVideo =
    ready && phaseShowsVideo(phase) && settings.videoHighlights !== false;

  return (
    <main className="relative min-h-screen pb-20">
      <InstallHint />
      <header className="flex flex-col gap-2 border-b border-zinc-800 bg-bg/95 px-6 pt-4 pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">ShabbatScores</h1>
            <WakeLockBadge />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHelpOpen(true)}
              aria-label="How to use this dashboard"
              className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Settings"
              className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <Clock />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HebcalStripe settings={ready ? settings : undefined} />
          <WeatherStripe settings={ready ? settings : undefined} />
        </div>
      </header>

      <div className="px-6 py-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {showVideo && <MorningVideo settings={settings} />}
            <SportsGrid settings={ready ? settings : undefined} compact={showVideo} />
          </div>
          <SocialFeedCard settings={ready ? settings : undefined} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 flex h-16 border-t border-zinc-800 bg-panel/95">
        <div className="w-[200px] shrink-0 border-r border-zinc-800">
          <ScoreTickerBox />
        </div>
        <div className="flex-1 overflow-hidden">
          <NewsTicker settings={ready ? settings : undefined} />
        </div>
      </div>

      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        settings={settings}
        onChange={update}
        onReset={reset}
      />

      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}
