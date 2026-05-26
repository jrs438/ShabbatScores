import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Verifies that channel-search reliably resolves a team's OFFICIAL YouTube
// channel (vs a fan channel), across leagues. Returns the top candidates and
// the one we'd pick, so we can eyeball coverage before baking resolution into
// the morning-video feature.
//
//   /api/resolve-channels?teams=New York Knicks,Los Angeles Lakers,Dallas Cowboys,New York Yankees,Boston Bruins

const API = "https://www.googleapis.com/youtube/v3";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function GET(req: NextRequest) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 200 });

  const teamsParam =
    req.nextUrl.searchParams.get("teams") ??
    "New York Knicks,Los Angeles Lakers,Dallas Cowboys,New York Yankees,Boston Bruins";
  const teams = teamsParam.split(",").map((t) => t.trim()).filter(Boolean);

  const results: unknown[] = [];
  for (const team of teams) {
    try {
      const url =
        `${API}/search?part=snippet&type=channel&maxResults=5` +
        `&q=${encodeURIComponent(team)}&key=${key}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        results.push({ team, error: `search ${res.status}`, body: (await res.text()).slice(0, 300) });
        continue;
      }
      const data = (await res.json()) as {
        items?: { id?: { channelId?: string }; snippet?: { title?: string; channelId?: string } }[];
      };
      const candidates = (data.items ?? []).map((it) => ({
        title: it.snippet?.title ?? "",
        channelId: it.id?.channelId ?? it.snippet?.channelId ?? "",
      }));
      const target = norm(team);
      // Pick the candidate whose title best matches the team name.
      const picked =
        candidates.find((c) => norm(c.title) === target) ??
        candidates.find((c) => norm(c.title).includes(target) || target.includes(norm(c.title))) ??
        candidates[0] ??
        null;
      results.push({
        team,
        picked: picked ? { title: picked.title, channelId: picked.channelId } : null,
        candidates,
      });
    } catch (e) {
      results.push({ team, error: String(e) });
    }
  }

  return NextResponse.json({ results });
}
