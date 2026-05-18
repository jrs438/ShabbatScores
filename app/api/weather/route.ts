import { NextResponse, type NextRequest } from "next/server";
import type { WeatherNow } from "@/lib/types";

export const revalidate = 600;
export const dynamic = "force-dynamic";

const DEFAULT_LAT = 40.9445;
const DEFAULT_LON = -74.0754;
const UA = "ShabbatScores (contact: dashboard@example.com)";

type PointsResp = {
  properties: {
    forecast: string;
    forecastHourly: string;
    observationStations: string;
    relativeLocation?: { properties?: { city?: string; state?: string } };
  };
};
type ForecastResp = {
  properties: {
    periods: {
      name: string;
      temperature: number;
      temperatureUnit: string;
      shortForecast: string;
      icon: string;
      isDaytime: boolean;
      windSpeed: string;
      relativeHumidity?: { value: number };
    }[];
  };
};

type GeoHit = { latitude: number; longitude: number };
type GeoResp = { results?: GeoHit[] };

async function zipToLatLon(zip: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?postal_code=${encodeURIComponent(
      zip
    )}&country=US&count=1`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as GeoResp;
    const hit = data.results?.[0];
    if (!hit) return null;
    return { lat: hit.latitude, lon: hit.longitude };
  } catch {
    return null;
  }
}

async function nws<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/geo+json" },
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`NWS ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

export async function GET(req: NextRequest) {
  try {
    const zip = req.nextUrl.searchParams.get("zip");
    let lat = DEFAULT_LAT;
    let lon = DEFAULT_LON;
    if (zip && /^\d{5}$/.test(zip) && zip !== "07652") {
      const coords = await zipToLatLon(zip);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      }
    }
    const points = await nws<PointsResp>(`https://api.weather.gov/points/${lat},${lon}`);
    const forecast = await nws<ForecastResp>(points.properties.forecast);
    const periods = forecast.properties.periods;
    const current = periods[0];
    const data: WeatherNow = {
      temp: current.temperature,
      feelsLike: null,
      condition: current.shortForecast,
      icon: current.icon,
      wind: current.windSpeed,
      humidity: current.relativeHumidity?.value ?? null,
      forecast: periods.slice(1, 7).map((p) => ({
        name: p.name,
        temp: p.temperature,
        short: p.shortForecast,
        icon: p.icon,
      })),
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 200 });
  }
}
