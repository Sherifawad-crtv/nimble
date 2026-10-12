// YouTube/Vimeo link parsing and oEmbed lookup (server side, so the browser never hits CORS).
import { HttpError } from './http.ts';

export interface ParsedVideo {
  provider: 'youtube' | 'vimeo';
  videoId: string;
}

const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;
const INVALID = 'Only YouTube and Vimeo links are supported. Paste a link such as youtube.com/watch?v=… or vimeo.com/….';

export function parseVideoUrl(input: string): ParsedVideo {
  let url: URL;
  try {
    const s = input.trim();
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    throw new HttpError(400, 'invalid_link', INVALID);
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  if (host === 'youtu.be') {
    const id = parts[0];
    if (id && YT_ID.test(id)) return { provider: 'youtube', videoId: id };
  } else if (YT_HOSTS.has(host)) {
    const id = parts[0] === 'watch' ? url.searchParams.get('v') : ['shorts', 'embed', 'live'].includes(parts[0] ?? '') ? parts[1] : null;
    if (id && YT_ID.test(id)) return { provider: 'youtube', videoId: id };
  } else if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    const id = parts.find((p) => VIMEO_ID.test(p));
    if (id) return { provider: 'vimeo', videoId: id };
  }
  throw new HttpError(400, 'invalid_link', INVALID);
}

export const canonicalUrl = (v: ParsedVideo) =>
  v.provider === 'youtube' ? `https://www.youtube.com/watch?v=${v.videoId}` : `https://vimeo.com/${v.videoId}`;

export interface LinkPreview {
  provider: 'youtube' | 'vimeo';
  videoId: string;
  title: string;
  thumbnailUrl: string;
  embeddable: boolean;
}

export async function oembed(v: ParsedVideo): Promise<LinkPreview> {
  const target = canonicalUrl(v);
  const endpoint =
    v.provider === 'youtube'
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(target)}`
      : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(target)}`;
  const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  const fallbackThumb = v.provider === 'youtube' ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : '';
  // 401/403: the video exists but its owner blocks embedding.
  if (res.status === 401 || res.status === 403) {
    return { provider: v.provider, videoId: v.videoId, title: '', thumbnailUrl: fallbackThumb, embeddable: false };
  }
  if (!res.ok) throw new HttpError(404, 'not_found', 'This video could not be found. It may be private or removed.');
  const body = (await res.json()) as { title?: string; thumbnail_url?: string };
  return {
    provider: v.provider,
    videoId: v.videoId,
    title: body.title ?? '',
    thumbnailUrl: v.provider === 'youtube' ? fallbackThumb : (body.thumbnail_url ?? ''),
    embeddable: true,
  };
}
