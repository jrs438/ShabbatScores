import { FOLLOWED_TEAMS } from "./teams";

export type UserSettings = {
  // ESPN team IDs (globally unique across leagues).
  primary: string[];
  followed: string[];
  locationZip: string;
  locationLabel: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  primary: ["21", "20", "18", "13"], // Mets, Jets, Knicks, Rangers
  followed: FOLLOWED_TEAMS.map((t) => t.espnId),
  locationZip: "07652",
  locationLabel: "Paramus, NJ",
};

const STORAGE_KEY = "shabbatscores:settings:v2";
const LEGACY_KEY = "shabbatscores:settings:v1";

// Map old abbreviation-based settings to the new ID-based format.
const ABBR_TO_ID: Record<string, string> = Object.fromEntries(
  FOLLOWED_TEAMS.map((t) => [t.abbr, t.espnId])
);
function migrateAbbrs(values: string[] | undefined): string[] | undefined {
  if (!values) return values;
  return values
    .map((v) => (ABBR_TO_ID[v] ? ABBR_TO_ID[v] : /^\d+$/.test(v) ? v : null))
    .filter((v): v is string => v != null);
}

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    // One-time migration from v1 (abbreviation-based) to v2 (ID-based).
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<UserSettings>;
      const migrated: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        primary: migrateAbbrs(parsed.primary) ?? DEFAULT_SETTINGS.primary,
        followed: migrateAbbrs(parsed.followed) ?? DEFAULT_SETTINGS.followed,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      window.localStorage.removeItem(LEGACY_KEY);
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
  if (p) out.primary = migrateAbbrs(p.split(",").filter(Boolean));
  if (f) out.followed = migrateAbbrs(f.split(",").filter(Boolean));
  if (z) out.locationZip = z;
  if (l) out.locationLabel = l;
  return Object.keys(out).length > 0 ? out : null;
}

export function buildShareUrl(origin: string, s: UserSettings): string {
  const q = settingsToQuery(s);
  return q ? `${origin}/?${q}` : origin;
}
