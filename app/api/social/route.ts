import { NextResponse } from "next/server";
import { fetchTelegramChannel, type SocialPost } from "@/lib/telegram";
import { fetchBlueskyAuthor } from "@/lib/bluesky";

export const revalidate = 120;
export const dynamic = "force-dynamic";

// Configure sources here. Add/remove channels and Bluesky handles freely.
const TELEGRAM_CHANNELS = ["osint613"];
const BLUESKY_HANDLES: string[] = []; // e.g. ["avivaklompas.bsky.social"]

export async function GET() {
  const telegram = await Promise.allSettled(
    TELEGRAM_CHANNELS.map((c) => fetchTelegramChannel(c, 8))
  );
  const bluesky = await Promise.allSettled(
    BLUESKY_HANDLES.map((h) => fetchBlueskyAuthor(h, 8))
  );
  const posts: SocialPost[] = [];
  for (const r of telegram) if (r.status === "fulfilled") posts.push(...r.value);
  for (const r of bluesky) if (r.status === "fulfilled") posts.push(...r.value);
  posts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return NextResponse.json(
    { posts: posts.slice(0, 24), updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
  );
}
