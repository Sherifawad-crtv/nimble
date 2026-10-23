import { t } from '../i18n';
import type { AssistantAttachment } from '../types';

/** Files on one message. */
export const MAX_FILES = 3;
/** A PDF, or any file that is not resized on the way in. */
const MAX_FILE_BYTES = 4_000_000;
const MAX_TEXT_CHARS = 100_000;
/** The model reads images no larger than this, so a bigger photo only costs upload time. */
const MAX_IMAGE_EDGE = 1568;
/** Base64 characters across a whole chat, since earlier files are sent again with every message. */
export const MAX_CHAT_BASE64 = 8_000_000;

export const ATTACH_ACCEPT = 'application/pdf,image/*,text/plain,text/csv,.txt,.csv,.tsv,.md';

export type FileKind = 'pdf' | 'image' | 'text' | 'unsupported';

export function classify(file: { name: string; type: string }): FileKind {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/.test(name)) return 'image';
  if (file.type.startsWith('text/') || /\.(txt|csv|tsv|md)$/.test(name)) return 'text';
  return 'unsupported';
}

/** The size to scale an image to so its longer edge is at most `max`, never enlarging it. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** What a set of attachments adds to a request, in base64 characters. */
export function payloadSize(files: AssistantAttachment[]): number {
  return files.reduce((n, f) => n + ('text' in f ? f.text.length : f.data.length), 0);
}

/** A problem with a file the coach picked, already worded for them. */
export class AttachmentError extends Error {}

const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Re-encodes any picture as a JPEG no larger than the model reads, which also turns formats a
 * browser can show but the model cannot (HEIC from an iPhone, WebP, screenshots with transparency)
 * into one it can. */
async function imageToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('No image');
  return toBase64(blob);
}

export async function readAttachment(file: File): Promise<AssistantAttachment> {
  const name = file.name.slice(0, 120) || 'file';
  const kind = classify(file);
  if (kind === 'unsupported') throw new AttachmentError(t('assistant.attach.unsupported', { name }));
  try {
    if (kind === 'text') {
      const text = (await file.text()).trim();
      if (!text) throw new AttachmentError(t('assistant.attach.empty', { name }));
      if (text.length > MAX_TEXT_CHARS) throw new AttachmentError(t('assistant.attach.tooLong', { name }));
      return { name, text };
    }
    if (kind === 'pdf') {
      if (file.size > MAX_FILE_BYTES) throw new AttachmentError(t('assistant.attach.tooBig', { name }));
      return { name, mediaType: 'application/pdf', data: await toBase64(file) };
    }
    return { name, mediaType: 'image/jpeg', data: await imageToJpeg(file) };
  } catch (e) {
    if (e instanceof AttachmentError) throw e;
    throw new AttachmentError(t('assistant.attach.failed', { name }));
  }
}
