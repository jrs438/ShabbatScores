import { NextResponse } from "next/server";
import type { WeatherNow } from "@/lib/types";

export const revalidate = 600;
export const dynamic = "force-dynamic";

// Paramus, NJ (07652)
const LAT = 40.9445;
const LON = -74.0754;
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

async function nws<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/geo+json" },
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`NWS ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

export async function GET() {
  try {
    const points = await nws<PointsResp>(`https://api.weather.gov/points/${LAT},${LON}`);
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
