// Map NWS shortForecast strings to a single emoji glyph. NWS uses fairly
// consistent phrasing; the regex tests below cover the typical surface.
export function weatherIcon(condition: string | undefined | null): string {
  if (!condition) return "🌤️";
  const c = condition.toLowerCase();
  if (/thunder|t-?storm/.test(c)) return "⛈️";
  if (/snow|flurr|sleet|ice/.test(c)) return "❄️";
  if (/rain|shower|drizzle/.test(c)) return "🌧️";
  if (/fog|mist|haze|smoke/.test(c)) return "🌫️";
  if (/wind/.test(c)) return "💨";
  if (/partly\s+(sunny|cloudy)/.test(c)) return "⛅";
  if (/mostly\s+cloudy|overcast|cloudy/.test(c)) return "☁️";
  if (/sunny|clear|fair/.test(c)) return "☀️";
  if (/mostly\s+sunny/.test(c)) return "🌤️";
  return "🌤️";
}

// Trim NWS period names ("Tonight", "Tuesday Night", "Wednesday") for tight layouts.
export function shortPeriodName(name: string): string {
  if (!name) return "";
  const n = name.replace(/^This\s+/i, "");
  // "Tuesday Night" -> "Tue Night", keep "Tonight" intact
  const m = n.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(\s+Night)?$/i);
  if (m) {
    const day = m[1].slice(0, 3);
    return m[2] ? `${day} Nt` : day;
  }
  return n.slice(0, 9);
}
