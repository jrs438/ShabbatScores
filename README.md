# ShabbatScores

Always-on iPad dashboard for Shabbat: live sports scores, Israel + US news, Paramus weather, and Hebrew calendar times. Built to be set up before Shabbat and run autonomously for 25 hours with no taps.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind
- Server-side API routes proxy all upstream APIs (so keys stay private)
- Polling on the client (no websockets, no service worker needed)
- Screen Wake Lock API to keep the iPad display on

## Data sources
- **Sports:** ESPN public scoreboard JSON (`site.api.espn.com`) — no key needed. Followed teams: Mets, Yankees, Jets, Giants, Rangers, Devils, Knicks, Alabama (CFB), St. John's (MBB). All MLB/NBA/NHL/NFL playoff games are auto-included.
- **Sports fallback:** SerpAPI (`SERPAPI_KEY` env var) — wired in `lib/serpapi.ts`, not invoked by default. Add it if you need it for college games ESPN misses.
- **Weather:** National Weather Service (`api.weather.gov`) — hard-coded to Paramus, NJ (40.9445, -74.0754). No key.
- **Hebrew calendar:** Hebcal Shabbat API, ZIP 07652. No key.
- **News:** RSS — Times of Israel, Jerusalem Post, AP top news, AP US news. No key.

## Local dev
```
npm install
npm run dev
```
Open http://localhost:3000

## Deploying to Vercel
1. Push this repo to GitHub.
2. Import into Vercel — it auto-detects Next.js.
3. (Optional) add `SERPAPI_KEY` in Project Settings → Environment Variables.
4. Deploy.

## Using on the iPad
1. Open the deployed URL in Safari.
2. Tap **Share → Add to Home Screen**.
3. Launch from the home-screen icon — it runs fullscreen, no Safari chrome.
4. On first launch, the page acquires a Screen Wake Lock so the display stays on. Keep the iPad plugged in.

## Refresh cadence
| Source | Client poll | Server cache |
|---|---|---|
| Sports | 30s | 30s |
| Weather | 10m | 10m |
| Hebcal | 60m | 1h |
| News | 10m | 10m |

Caches are server-side (Next.js `revalidate`); client polling triggers fresh fetches but the upstream is shielded from rate limits.

## Files
- `app/api/*` — server routes (sports/weather/hebcal/news)
- `lib/espn.ts` — ESPN scoreboard fetch + game normalization
- `lib/teams.ts` — followed-team config
- `lib/serpapi.ts` — SerpAPI fallback
- `components/*` — UI components (SportsGrid, WeatherCard, HebcalCard, NewsTicker, Clock, WakeLockBadge)
