import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// One-time probe to discover the Highlightly contract: which auth header
// works, whether the endpoint path is right, and what the response (esp.
// video URL) looks like. Reads the key from env — never hardcoded.
//
//   /api/highlightly-test
//   /api/highlightly-test?base=https://basketball.highlightly.net&path=/highlights&query=limit=5
//   /api/highlightly-test?query=limit=5%26leagueName=NBA

export async function GET(req: NextRequest) {
  const key = process.env.HIGHLIGHTLY_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error: "HIGHLIGHTLY_API_KEY is not set.",
        fix: "Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
      },
      { status: 200 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const base = sp.get("base") ?? "https://sports.highlightly.net";
  const path = sp.get("path") ?? "/highlights";
  const query = sp.get("query") ?? "limit=5";
  const url = `${base}${path}?${query}`;

  const headerVariants: { name: string; headers: Record<string, string> }[] = [
    { name: "x-api-key", headers: { "x-api-key": key } },
    { name: "Authorization (raw)", headers: { Authorization: key } },
    { name: "Authorization Bearer", headers: { Authorization: `Bearer ${key}` } },
    { name: "apikey", headers: { apikey: key } },
  ];

  const attempts: {
    header: string;
    status: number;
    ok: boolean;
    bodyPreview: unknown;
  }[] = [];

  for (const variant of headerVariants) {
    try {
      const res = await fetch(url, {
        headers: { ...variant.headers, Accept: "application/json" },
        cache: "no-store",
      });
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text.slice(0, 600);
      }
      attempts.push({
        header: variant.name,
        status: res.status,
        ok: res.ok,
        bodyPreview: parsed,
      });
      // Stop at the first clearly-successful auth to save quota
      if (res.ok) break;
    } catch (e) {
      attempts.push({
        header: variant.name,
        status: -1,
        ok: false,
        bodyPreview: String(e),
      });
    }
  }

  const winner = attempts.find((a) => a.ok);
  return NextResponse.json({
    requestedUrl: url,
    workingHeader: winner?.header ?? null,
    attempts,
    note:
      "If all failed with 401/403, try ?header tweaks or a different ?base " +
      "(e.g. https://basketball.highlightly.net). If 404, the ?path is wrong.",
  });
}
