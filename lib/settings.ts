import { FOLLOWED_TEAMS } from "./teams";

export type UserSettings = {
  primary: string[]; // team abbreviations
  followed: string[]; // team abbreviations
  locationZip: string;
  locationLabel: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  primary: ["NYM", "NYJ", "NYK", "NYR"],
  followed: FOLLOWED_TEAMS.map((t) => t.abbr),
  locationZip: "07652",
  locationLabel: "Paramus, NJ",
};

const STORAGE_KEY = "shabbatscores:settings:v1";

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
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
  if (p) out.primary = p.split(",").filter(Boolean);
  if (f) out.followed = f.split(",").filter(Boolean);
  if (z) out.locationZip = z;
  if (l) out.locationLabel = l;
  return Object.keys(out).length > 0 ? out : null;
}

export function buildShareUrl(origin: string, s: UserSettings): string {
  const q = settingsToQuery(s);
  return q ? `${origin}/?${q}` : origin;
}
