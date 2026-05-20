"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function HelpDrawer({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative h-full w-full max-w-md overflow-y-auto bg-panel shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-panel/95 px-5 py-3 backdrop-blur">
          <h2 className="text-lg font-bold">How to use this dashboard</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Done
          </button>
        </div>

        <section className="space-y-3 px-5 py-4 text-sm leading-relaxed text-zinc-300">
          <p>
            ShabbatScores is an always-on dashboard built for Shabbat. Set it up before Shabbat
            starts; for the next 25 hours it pulls live scores, news headlines, weather, social
            posts, and candle-lighting times automatically — no taps required.
          </p>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Before Shabbat — 5 minute setup
          </h3>
          <ol className="space-y-2 text-sm leading-relaxed text-zinc-200">
            <li>
              <strong>1.</strong> In Safari, tap the share button → <em>Add to Home Screen</em>.
              Launch from the home-screen icon so it runs fullscreen.
            </li>
            <li>
              <strong>2.</strong> Tap the yellow <span className="rounded bg-accent2/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent2">Tap to enable</span> badge
              in the top-left. It turns green and reads <span className="rounded bg-good/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-good">Always-on</span> —
              that's the iPad's Screen Wake Lock keeping the display on.
            </li>
            <li>
              <strong>3.</strong> iPad <em>Settings → Display & Brightness → Auto-Lock → Never</em>.
              Required as a safety net in case Wake Lock releases.
            </li>
            <li>
              <strong>4.</strong> Keep the iPad plugged in.
            </li>
            <li>
              <strong>5.</strong> Open the gear (⚙) to customize teams, location, and feed sources.
            </li>
          </ol>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            What's on screen
          </h3>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-200">
            <li>
              <strong>Header:</strong> Title, Wake Lock badge, Shabbat times (parashah or holiday,
              candle-lighting 🕯, havdalah ✨), compact weather forecast with icons, settings, clock.
            </li>
            <li>
              <strong>Sports (main column):</strong> A Primary team playing live gets a hero card
              with full gamecast — diamond for baseball, down & distance for football, period &
              clock for basketball/hockey — plus last play and win probability. Followed teams
              show as smaller cards. Around-the-league playoff games cycle every 7 seconds.
            </li>
            <li>
              <strong>Live highlights (right sidebar, optional):</strong> Auto-playing muted clips
              from MLB / NBA / NFL / NHL / ESPN for your <strong>Primary</strong> teams. Plays
              the newest clip, advances when it ends. Can be turned off in Settings for Shabbat
              observance.
            </li>
            <li>
              <strong>Social feed (right sidebar):</strong> 10 most recent posts from your Telegram
              channels and Bluesky accounts. Cycles 2 posts at a time every 12 seconds.
            </li>
            <li>
              <strong>Bottom bar:</strong> Compact score ticker on the left cycles through all
              leagues with games today; news headlines scroll on the right.
            </li>
          </ul>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Customizing (⚙ gear)
          </h3>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-200">
            <li>
              <strong>Location:</strong> ZIP code drives weather and candle-lighting times. Default
              is Paramus, NJ (07652).
            </li>
            <li>
              <strong>Video highlights:</strong> On/off toggle for the auto-playing video card.
              Default is on. Off hides the card and skips loading any YouTube content — useful
              for Shabbat observance.
            </li>
            <li>
              <strong>Teams:</strong> Search ~500 ESPN teams across MLB, NFL, NBA, NHL, college
              football, and college basketball. Toggle <span className="rounded bg-good/20 px-1 py-0.5 text-[10px] font-bold text-good">✓</span>
              {" "}to follow a team (shows as a card). Toggle <span className="rounded bg-accent2/30 px-1 py-0.5 text-[10px] font-bold text-accent2">★</span>
              {" "}to make it Primary — hero gamecast when playing live, and what drives the live
              highlights card.
            </li>
            <li>
              <strong>Social feed:</strong> Add any public Telegram channel handle (e.g.
              <code className="ml-1 rounded bg-bg px-1 text-xs">osint613</code>) or any Bluesky
              handle (e.g. <code className="ml-1 rounded bg-bg px-1 text-xs">name.bsky.social</code>).
              Paste either a bare handle or a full URL — the input normalizes both.
            </li>
            <li>
              <strong>Share link:</strong> "Copy share link" puts your full configuration into a
              URL. Send it to a friend; opening the link saves their picks automatically. They can
              then customize further on their own device without affecting yours.
            </li>
            <li>
              <strong>Reset to defaults:</strong> Restores the original New York / Alabama /
              St. John's lineup, Paramus location, and the osint613 Telegram channel.
            </li>
          </ul>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Troubleshooting
          </h3>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-200">
            <li>
              <strong>Screen turned off mid-Shabbat?</strong> Auto-Lock probably wasn't set to
              Never. Wake Lock alone can't override aggressive Auto-Lock settings.
            </li>
            <li>
              <strong>Stale scores?</strong> Polling runs every 30s while the tab is visible. If
              the iPad has been on a long time and feels frozen, force-quit Safari and reopen from
              the home-screen icon.
            </li>
            <li>
              <strong>Social feed empty?</strong> Telegram channels must be <em>public</em>; the
              channel handle is case-insensitive but must match exactly. Bluesky handles must be
              valid existing accounts.
            </li>
            <li>
              <strong>Wrong team showing up?</strong> ESPN team IDs are stored in your iPad
              localStorage. Search for the right team in the picker, ✓ to add, then unfollow the
              wrong one. Or hit "Reset to defaults" to start clean.
            </li>
          </ul>
        </section>

        <section className="border-t border-zinc-800 px-5 py-4 text-xs text-zinc-500">
          Built with public data sources — ESPN scoreboard, NWS weather, Hebcal, Times of Israel /
          JPost / BBC / NPR RSS, public Telegram channel previews, and Bluesky's public AppView
          API. No paid keys required.
        </section>
      </div>
    </div>
  );
}
