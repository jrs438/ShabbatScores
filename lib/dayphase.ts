// Eastern-time day phases that drive the dashboard layout.
//
//   00:00–07:00  overnight   — last night's scores, no video
//   07:00–12:00  morning     — large video player + last night's scores
//   12:00–17:00  midday      — last night's scores + today's schedule, no video
//   17:00–24:00  evening     — today's schedule only
//
// Score windows: yesterday's finals stay visible until 5pm; today's schedule
// appears starting at noon.

export type DayPhase = "overnight" | "morning" | "midday" | "evening";

export function easternHour(now = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  // "24" can appear at midnight in some environments; normalize to 0.
  const n = parseInt(h, 10);
  return n === 24 ? 0 : n;
}

export function currentPhase(now = new Date()): DayPhase {
  const h = easternHour(now);
  if (h < 7) return "overnight";
  if (h < 12) return "morning";
  if (h < 17) return "midday";
  return "evening";
}

export const phaseShowsVideo = (p: DayPhase) => p === "morning";
export const phaseShowsYesterday = (p: DayPhase) =>
  p === "overnight" || p === "morning" || p === "midday";
export const phaseShowsToday = (p: DayPhase) => p === "midday" || p === "evening";
