import { NextResponse, type NextRequest } from "next/server";
import type { HebcalInfo } from "@/lib/types";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

const DEFAULT_ZIP = "07652";
const HDATE_URL = "https://www.hebcal.com/converter?cfg=json&g2h=1";
const shabbatUrl = (zip: string) =>
  `https://www.hebcal.com/shabbat?cfg=json&zip=${encodeURIComponent(
    zip
  )}&M=on&geo=zip&lg=s`;

type HebcalItem = {
  title: string;
  date: string;
  category: string;
  hebrew?: string;
  subcat?: string;
};
type HebcalResp = { items?: HebcalItem[]; location?: { title?: string } };
type HdateResp = { hm?: string; hd?: number; hy?: number; events?: string[] };

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export async function GET(req: NextRequest) {
  try {
    const zipParam = req.nextUrl.searchParams.get("zip");
    const zip = zipParam && /^\d{5}$/.test(zipParam) ? zipParam : DEFAULT_ZIP;
    const todayISO = new Date().toISOString().slice(0, 10);
    const [shabbatRes, hdateRes] = await Promise.all([
      fetch(shabbatUrl(zip), { next: { revalidate: 3600 } }),
      fetch(`${HDATE_URL}&date=${todayISO}`, { next: { revalidate: 3600 } }),
    ]);
    if (!shabbatRes.ok || !hdateRes.ok) {
      throw new Error(`Hebcal upstream ${shabbatRes.status}/${hdateRes.status}`);
    }
    const shabbat = (await shabbatRes.json()) as HebcalResp;
    const hdate = (await hdateRes.json()) as HdateResp;

    const items = shabbat.items ?? [];
    const parashah = items.find((i) => i.category === "parashat")?.title ?? null;
    const candle = items.find((i) => i.category === "candles");
    const havdalah = items.find((i) => i.category === "havdalah");
    const holidays = items
      .filter((i) => i.category === "holiday")
      .map((i) => i.title);

    const now = Date.now();
    const candleAt = candle ? new Date(candle.date).getTime() : null;
    const havdalahAt = havdalah ? new Date(havdalah.date).getTime() : null;
    const isShabbat =
      candleAt != null && havdalahAt != null && now >= candleAt && now <= havdalahAt;

    const hdateStr = hdate.hm && hdate.hd && hdate.hy
      ? `${hdate.hd} ${hdate.hm} ${hdate.hy}`
      : null;

    const data: HebcalInfo = {
      parashah,
      candleLighting: candle ? fmtTime(candle.date) : null,
      havdalah: havdalah ? fmtTime(havdalah.date) : null,
      hdate: hdateStr,
      holidays,
      isShabbat,
      shabbatStartsAt: candle?.date ?? null,
      shabbatEndsAt: havdalah?.date ?? null,
    };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 200 });
  }
}
