import { parse, type HTMLElement } from "node-html-parser";

export type SocialPost = {
  id: string;
  source: "telegram" | "bluesky";
  channel: string; // handle, e.g. "osint613"
  channelTitle: string; // display name, e.g. "Open Source Intel"
  channelUrl: string;
  text: string; // HTML-stripped plain text
  html: string | null; // safe-ish inline HTML for richer display (no scripts)
  publishedAt: string; // ISO
  url: string; // direct link to post
  photos: string[];
  hasVideo: boolean;
  views: string | null;
};

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractBgUrl(style: string | undefined): string | null {
  if (!style) return null;
  const m = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);
  return m ? m[1] : null;
}

function postFromElement(el: HTMLElement, channelHandle: string, channelTitle: string): SocialPost | null {
  const linkEl = el.querySelector(".tgme_widget_message_date");
  const href = linkEl?.getAttribute("href") ?? "";
  const idMatch = href.match(/\/(\d+)$/);
  if (!idMatch) return null;
  const id = idMatch[1];

  const timeEl = linkEl?.querySelector("time");
  const publishedAt = timeEl?.getAttribute("datetime") ?? new Date().toISOString();

  const textEl = el.querySelector(".tgme_widget_message_text");
  const html = textEl?.innerHTML ?? "";
  const text = stripTags(html);

  // Skip empty messages (e.g. pure stickers / service messages with no readable text and no photos)
  const photoEls = el.querySelectorAll(".tgme_widget_message_photo_wrap");
  const photos: string[] = [];
  for (const p of photoEls) {
    const u = extractBgUrl(p.getAttribute("style"));
    if (u) photos.push(u);
  }
  const videoEls = el.querySelectorAll(".tgme_widget_message_video_thumb, .tgme_widget_message_video_wrap");
  const hasVideo = videoEls.length > 0;
  if (!text && photos.length === 0 && !hasVideo) return null;

  const viewsEl = el.querySelector(".tgme_widget_message_views");
  const views = viewsEl?.text?.trim() ?? null;

  return {
    id: `tg-${channelHandle}-${id}`,
    source: "telegram",
    channel: channelHandle,
    channelTitle,
    channelUrl: `https://t.me/${channelHandle}`,
    text,
    html: html || null,
    publishedAt,
    url: `https://t.me/${channelHandle}/${id}`,
    photos,
    hasVideo,
    views,
  };
}

export async function fetchTelegramChannel(handle: string, limit = 8): Promise<SocialPost[]> {
  const clean = handle.replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "").replace(/^s\//i, "");
  const url = `https://t.me/s/${clean}`;
  const res = await fetch(url, {
    next: { revalidate: 120 },
    headers: {
      // t.me/s/ serves the embeddable channel preview to regular browsers
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`Telegram ${clean} -> ${res.status}`);
  const html = await res.text();
  const root = parse(html);

  const channelTitle =
    root.querySelector(".tgme_channel_info_header_title")?.text?.trim() ??
    root.querySelector(".tgme_header_title")?.text?.trim() ??
    clean;

  const messages = root.querySelectorAll(".tgme_widget_message");
  const posts = messages
    .map((m) => postFromElement(m, clean, channelTitle))
    .filter((p): p is SocialPost => p !== null);

  // t.me/s/ returns oldest-first; flip so newest is first
  posts.reverse();
  return posts.slice(0, limit);
}
