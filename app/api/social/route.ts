import { NextResponse, type NextRequest } from "next/server";
import { fetchTelegramChannel, type SocialPost } from "@/lib/telegram";
import { fetchBlueskyAuthor } from "@/lib/bluesky";

export const revalidate = 120;

// Defaults used when the client doesn't pass overrides.
const DEFAULT_TELEGRAM = ["osint613"];
const DEFAULT_BLUESKY: string[] = [];

function listFrom(value: string | null, fallback: string[]): string[] {
  if (value == null) return fallback;
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
  return parts;
}

export async function GET(req: NextRequest) {
  const telegramChannels = listFrom(req.nextUrl.searchParams.get("tg"), DEFAULT_TELEGRAM);
  const blueskyHandles = listFrom(req.nextUrl.searchParams.get("bs"), DEFAULT_BLUESKY);

  const tgResults = await Promise.allSettled(
    telegramChannels.map((c) => fetchTelegramChannel(c, 8))
  );
  const bsResults = await Promise.allSettled(
    blueskyHandles.map((h) => fetchBlueskyAuthor(h, 8))
  );

  const posts: SocialPost[] = [];
  for (const r of tgResults) if (r.status === "fulfilled") posts.push(...r.value);
  for (const r of bsResults) if (r.status === "fulfilled") posts.push(...r.value);
  posts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return NextResponse.json(
    { posts: posts.slice(0, 32), updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
  );
}
