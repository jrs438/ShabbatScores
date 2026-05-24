import { type NextRequest } from "next/server";
import { LEAGUE_CHANNELS, fetchChannelHighlights } from "@/lib/highlights";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Inspection endpoint: dumps the raw videos each channel's RSS feed exposes
// right now, before any team filtering. Use it to compare what we can see
// against a manual YouTube search.
//
//   /api/highlights/debug                -> MLB + NBA (default)
//   /api/highlights/debug?channels=NHL   -> just NHL
//   /api/highlights/debug?channels=MLB,NBA,ESPN,HoH
//   /api/highlights/debug?format=json    -> JSON instead of text

function ageLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return `${h}h ${rem}m ago`;
  return `${Math.floor(h / 24)}d ${h % 24}h ago`;
}

export async function GET(req: NextRequest) {
  const which = req.nextUrl.searchParams.get("channels");
  const labels = which
    ? which.split(",").map((s) => s.trim().toUpperCase())
    : ["MLB", "NBA"];
  const format = req.nextUrl.searchParams.get("format");

  const channels = LEAGUE_CHANNELS.filter((c) =>
    labels.includes(c.label.toUpperCase())
  );

  const data: Record<
    string,
    { title: string; link: string; published: string; age: string; description: string }[]
  > = {};

  for (const c of channels) {
    const vids = await fetchChannelHighlights(c.id, c.label);
    data[c.label] = vids.map((v) => ({
      title: v.title,
      link: v.url,
      published: v.publishedAt,
      age: ageLabel(v.publishedAt),
      description: v.description.slice(0, 220),
    }));
  }

  if (format === "json") {
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Default: human-readable text
  const lines: string[] = [];
  lines.push(`ShabbatScores — raw highlights scrape`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Note: each channel's RSS feed only exposes its ~15 most recent uploads.`);
  lines.push("");
  for (const label of Object.keys(data)) {
    const vids = data[label];
    lines.push(`════════════════════════════════════════════`);
    lines.push(`${label} channel — ${vids.length} videos in the feed right now`);
    lines.push(`════════════════════════════════════════════`);
    vids.forEach((v, i) => {
      lines.push(`${i + 1}. ${v.title}`);
      lines.push(`   ${v.link}`);
      lines.push(`   ${v.age}  (${v.published})`);
      if (v.description) lines.push(`   desc: ${v.description}`);
      lines.push("");
    });
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
