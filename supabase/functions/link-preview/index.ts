// POST { url } -> LinkPreview. Rejects anything that is not YouTube or Vimeo.
import { HttpError, json, serve } from '../_shared/http.ts';
import { caller } from '../_shared/supabase.ts';
import { oembed, parseVideoUrl } from '../_shared/video.ts';

serve(async (req) => {
  const me = await caller(req);
  if (me.role !== 'coach') throw new HttpError(403, 'forbidden', 'Only the coach can do this.');
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url) throw new HttpError(400, 'invalid_link', 'Paste a YouTube or Vimeo link.');
  return json(await oembed(parseVideoUrl(url)));
});
