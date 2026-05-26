# ShabbatScores

An always-on dashboard for Shabbat. Set it up once before Shabbat starts; for the next 25 hours it pulls live scores, news, weather, social posts, and candle-lighting times automatically — no touch required.

## What you get

- **Live sports** across MLB, NFL, NBA, NHL, college football, college basketball
- **Featured gamecast** — when one of your favorite teams is playing live, you get the hero card with sport-specific detail (baseball diamond + runners, football down & distance + possession, basketball/hockey clock & period, plus last play and win probability)
- **Compact score ticker** at the bottom cycling through every league with games today
- **Morning highlights (7am–noon ET)** — a large video player on the main column showing each **Primary** team's full game recap (pulled from the team's official YouTube channel, league channel as fallback) plus a daily all-sports Top 10 reel. Each plays in full, then advances. Pro leagues only — college isn't supported. Can be turned off entirely in Settings for Shabbat observance.
- **News ticker** scrolling your chosen mix of Top/Mainstream, US, World, Israel, and Sports sources (configurable)
- **Social feed** showing the 10 most recent posts from Telegram public channels and Bluesky accounts of your choice, cycling 2 at a time every 12 seconds
- **Shabbat times** — parashah or holiday, candle-lighting, havdalah, plus the Hebrew date
- **Weather** for any US ZIP — current conditions + next 4 forecast periods with icons

## Set up before Shabbat (5 minutes)

1. Open the dashboard URL in **Safari** on the iPad you want to use.
2. Tap **Share → Add to Home Screen**. Launch from the home-screen icon so it runs fullscreen.
3. In the dashboard, tap the yellow **"Tap to enable"** badge in the top-left. It turns green and reads **"Always-on"** — that's the Screen Wake Lock keeping the display on.
4. In iPad settings: **Display & Brightness → Auto-Lock → Never**. Required as a safety net.
5. Plug the iPad in.
6. Tap the **⚙ gear** in the top right to customize teams, location, and social feed sources.

## Customizing (the ⚙ gear)

| Setting | What it does |
|---|---|
| **Location** | ZIP code drives both weather and candle-lighting times. Default: Paramus, NJ (07652). |
| **Video highlights** | On/off toggle for the auto-playing video card. Default on. Off hides the card entirely and loads no YouTube content — for Shabbat observance. |
| **Teams** | Search ~500 ESPN teams across all six leagues. **Follow ✓** = small card. **Primary ★** = hero gamecast card when playing live, and drives the live highlights card. |
| **Social feed** | Add Telegram public channel handles (e.g. `osint613`) or Bluesky handles (e.g. `bellingcat.com`). Paste a handle or a URL; it normalizes either. |
| **News ticker** | Choose which categories scroll along the bottom: Top/Mainstream (NYT, CNN, WSJ, NPR), US, World (NYT World, CNN World), Israel (Times of Israel, JPost, Ynet), Sports (ESPN). |
| **Share link** | "Copy share link" puts your full configuration into a URL. Send to friends; they open it once and their dashboard saves your picks automatically. |
| **Reset to defaults** | Restores the original New York / Alabama / St. John's lineup, Paramus location, and the default Telegram channel. |

## Data sources

Everything is free public data — no API keys required, no paid subscriptions.

| Card | Source |
|---|---|
| Sports + scoreboard | ESPN public scoreboard (`site.api.espn.com`) |
| Team catalog | ESPN teams endpoint per league |
| Weather | National Weather Service (`api.weather.gov`) + Open-Meteo geocoding for ZIP → lat/lon |
| Hebrew calendar | Hebcal Shabbat API |
| News ticker | RSS: NYT, CNN, WSJ, NPR, Times of Israel, JPost, Ynet, ESPN |
| Social feed | Public Telegram channel previews (`t.me/s/CHANNEL`) and Bluesky public AppView API |

## Tech stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Server-side API routes proxy all upstream sources
- Client polls on a per-card cadence (sports 30s, social 2m, weather 10m, Hebcal 1h, news 10m)
- Screen Wake Lock API + PWA manifest for fullscreen iPad use
- All viewer settings persist in localStorage; share URLs encode them in query params

## Local development

```bash
npm install
npm run dev
```

Opens on http://localhost:3000.

## Deploying

Hosted on Vercel. Pushing to `main` auto-deploys. No environment variables required.

## Troubleshooting

**Screen turned off mid-Shabbat.** Auto-Lock wasn't set to Never. Wake Lock alone can't override aggressive Auto-Lock.

**Scores look stale.** Polling runs every 30s while the tab is visible. If the iPad has been on a long time and feels frozen, force-quit Safari and reopen from the home-screen icon.

**Social feed shows "Loading…".** Telegram channel must be public; check the handle is correct (case-insensitive but otherwise exact). Bluesky handles must be valid existing accounts.

**Wrong team shows up.** ESPN team IDs are stored in your iPad localStorage. Search for the right team in the picker, ✓ to add, then unfollow the wrong one. Or hit "Reset to defaults" to start clean.
