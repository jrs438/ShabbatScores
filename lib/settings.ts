import { FOLLOWED_TEAMS, teamFullId } from "./teams";

export type UserSettings = {
  // ESPN team IDs (globally unique across leagues).
  primary: string[];
  followed: string[];
  locationZip: string;
  locationLabel: string;
  telegramChannels: string[]; // handles, e.g. ["osint613"]
  blueskyHandles: string[]; // handles, e.g. ["avivaklompas.bsky.social"]
  videoHighlights: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = {
  primary: [
    teamFullId("mlb", "21"), // Mets
    teamFullId("nfl", "20"), // Jets
    teamFullId("nba", "18"), // Knicks
    teamFullId("nhl", "13"), // Rangers
  ],
  followed: FOLLOWED_TEAMS.map((t) => teamFullId(t.league, t.espnId)),
  locationZip: "07652",
  locationLabel: "Paramus, NJ",
  telegramChannels: ["osint613"],
  blueskyHandles: [],
  videoHighlights: true,
};

const STORAGE_KEY = "shabbatscores:settings:v3";
const V2_KEY = "shabbatscores:settings:v2"; // bare-ID era (buggy across leagues)
const V1_KEY = "shabbatscores:settings:v1"; // abbreviation era

// Mappings to migrate older storage formats into the league-prefixed format.
const ABBR_TO_FULL: Record<string, string> = Object.fromEntries(
  FOLLOWED_TEAMS.map((t) => [t.abbr, teamFullId(t.league, t.espnId)])
);
const BARE_TO_FULL: Record<string, string> = Object.fromEntries(
  FOLLOWED_TEAMS.map((t) => [t.espnId, teamFullId(t.league, t.espnId)])
);

function migrateIds(values: string[] | undefined): string[] | undefined {
  if (!values) return values;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    // Already prefixed (league:id)
    if (v.includes(":")) {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
      continue;
    }
    // Try abbreviation map
    if (ABBR_TO_FULL[v]) {
      const full = ABBR_TO_FULL[v];
      if (!seen.has(full)) {
        seen.add(full);
        out.push(full);
      }
      continue;
    }
    // Try bare ESPN id from the known default roster
    if (BARE_TO_FULL[v]) {
      const full = BARE_TO_FULL[v];
      if (!seen.has(full)) {
        seen.add(full);
        out.push(full);
      }
      continue;
    }
    // Unknown bare id — can't disambiguate which league it belonged to; drop.
  }
  return out;
}

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    // Try to migrate from older storage formats (v2 bare ids, v1 abbrs).
    const older =
      window.localStorage.getItem(V2_KEY) ?? window.localStorage.getItem(V1_KEY);
    if (older) {
      const parsed = JSON.parse(older) as Partial<UserSettings>;
      const migrated: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        primary: migrateIds(parsed.primary) ?? DEFAULT_SETTINGS.primary,
        followed: migrateIds(parsed.followed) ?? DEFAULT_SETTINGS.followed,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      window.localStorage.removeItem(V2_KEY);
      window.localStorage.removeItem(V1_KEY);
      return migrated;
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: UserSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

export function settingsToQuery(s: UserSettings): string {
  const params = new URLSearchParams();
  if (s.primary.length > 0) params.set("p", s.primary.join(","));
  if (s.followed.length > 0) params.set("f", s.followed.join(","));
  if (s.locationZip && s.locationZip !== DEFAULT_SETTINGS.locationZip) {
    params.set("z", s.locationZip);
  }
  if (s.locationLabel && s.locationLabel !== DEFAULT_SETTINGS.locationLabel) {
    params.set("l", s.locationLabel);
  }
  if (s.telegramChannels.length > 0) params.set("tg", s.telegramChannels.join(","));
  if (s.blueskyHandles.length > 0) params.set("bs", s.blueskyHandles.join(","));
  if (!s.videoHighlights) params.set("vh", "0");
  return params.toString();
}

export function settingsFromQuery(search: string): Partial<UserSettings> | null {
  if (!search) return null;
  const params = new URLSearchParams(search);
  const out: Partial<UserSettings> = {};
  const p = params.get("p");
  const f = params.get("f");
  const z = params.get("z");
  const l = params.get("l");
  const tg = params.get("tg");
  const bs = params.get("bs");
  if (p) out.primary = migrateIds(p.split(",").filter(Boolean));
  if (f) out.followed = migrateIds(f.split(",").filter(Boolean));
  if (z) out.locationZip = z;
  if (l) out.locationLabel = l;
  if (tg) out.telegramChannels = tg.split(",").filter(Boolean);
  if (bs) out.blueskyHandles = bs.split(",").filter(Boolean);
  const vh = params.get("vh");
  if (vh === "0") out.videoHighlights = false;
  if (vh === "1") out.videoHighlights = true;
  return Object.keys(out).length > 0 ? out : null;
}

export function normalizeTelegramHandle(input: string): string {
  return input
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^s\//i, "")
    .replace(/\/.*$/, ""); // strip post-id if user pasted a message URL
}

export function normalizeBlueskyHandle(input: string): string {
  return input
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(?:bsky\.app\/profile\/)?/i, "")
    .replace(/\/.*$/, "");
}

export function buildShareUrl(origin: string, s: UserSettings): string {
  const q = settingsToQuery(s);
  return q ? `${origin}/?${q}` : origin;
}
