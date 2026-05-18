import type { SocialPost } from "./telegram";

// Bluesky's public AppView API is free and unauthenticated for public profiles.
// Docs: https://docs.bsky.app/docs/get-started
const BSKY_API = "https://public.api.bsky.app/xrpc";

type BskyAuthor = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
};
type BskyRecord = {
  text?: string;
  createdAt?: string;
};
type BskyImage = { thumb?: string; fullsize?: string };
type BskyEmbed = {
  $type?: string;
  images?: BskyImage[];
  external?: { uri?: string; title?: string };
};
type BskyPost = {
  uri: string;
  cid: string;
  author: BskyAuthor;
  record: BskyRecord;
  embed?: BskyEmbed;
  indexedAt: string;
};
type FeedResp = { feed: { post: BskyPost; reason?: unknown }[] };

function postIdFromUri(uri: string): string {
  // at://did:plc:abc/app.bsky.feed.post/3kabc
  return uri.split("/").pop() ?? uri;
}

export async function fetchBlueskyAuthor(handle: string, limit = 8): Promise<SocialPost[]> {
  const clean = handle.replace(/^@/, "");
  const url = `${BSKY_API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(clean)}&limit=${limit}&filter=posts_no_replies`;
  const res = await fetch(url, {
    next: { revalidate: 120 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Bluesky ${clean} -> ${res.status}`);
  const data = (await res.json()) as FeedResp;
  return (data.feed ?? []).map((item) => {
    const p = item.post;
    const postId = postIdFromUri(p.uri);
    const photos: string[] = [];
    if (p.embed?.images) {
      for (const img of p.embed.images) {
        if (img.thumb) photos.push(img.thumb);
      }
    }
    return {
      id: `bsky-${p.cid}`,
      source: "bluesky" as const,
      channel: p.author.handle,
      channelTitle: p.author.displayName ?? p.author.handle,
      channelUrl: `https://bsky.app/profile/${p.author.handle}`,
      text: p.record.text ?? "",
      html: null,
      publishedAt: p.record.createdAt ?? p.indexedAt,
      url: `https://bsky.app/profile/${p.author.handle}/post/${postId}`,
      photos,
      hasVideo: false,
      views: null,
    } satisfies SocialPost;
  });
}
