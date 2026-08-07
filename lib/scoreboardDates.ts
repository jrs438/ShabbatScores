// Shared date-window logic for all scoreboard sources.
//   before noon  → yesterday only (last night's finals)
//   noon–5pm ET  → yesterday + today
//   5pm onward   → today only

export function todayInEastern(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

export function yesterdayInEastern(): string {
  const todayET = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const d = new Date(`${todayET}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function currentEasternHour(): number {
  const h = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
    10
  );
  return h === 24 ? 0 : h;
}

export function easternDateString(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function scoreboardDates(): string[] {
  const h = currentEasternHour();
  const today = todayInEastern();
  const yesterday = yesterdayInEastern();
  return h < 12 ? [yesterday] : h < 17 ? [yesterday, today] : [today];
}
