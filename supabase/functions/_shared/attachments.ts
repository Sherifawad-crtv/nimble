// Files a coach attaches in the assistant. Validated here, then handed to the model as image or
// document blocks. Whatever a file says is data: it only ever goes into those blocks, never into
// the system prompt, so the coach's own messages stay the only thing that directs the assistant.

export type Attachment =
  | { name: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'; data: string }
  | { name: string; text: string };

export class AttachmentError extends Error {}

export const LIMITS = {
  /** Files on a single message. */
  perMessage: 3,
  /** Files across the whole conversation sent in one request. */
  total: 6,
  /** Base64 characters in one file (about 4 MB of file). */
  perFile: 5_600_000,
  /** Base64 characters across the request (about 6 MB of files). */
  allFiles: 8_000_000,
  /** Characters of a text or CSV file. */
  textChars: 100_000,
};

const BINARY_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']);

const cleanName = (n: unknown): string => (typeof n === 'string' ? n : '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) || 'file';

function parseOne(raw: unknown): Attachment {
  const a = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const name = cleanName(a.name);
  if (typeof a.text === 'string') {
    const text = a.text.trim();
    if (!text) throw new AttachmentError(`"${name}" is empty.`);
    if (text.length > LIMITS.textChars) throw new AttachmentError(`"${name}" is too long to read (limit ${LIMITS.textChars.toLocaleString('en-US')} characters).`);
    return { name, text };
  }
  const mediaType = typeof a.mediaType === 'string' ? a.mediaType : '';
  if (!BINARY_TYPES.has(mediaType)) throw new AttachmentError(`"${name}" is not a file type I can read. Use a PDF, a photo or screenshot, or a text/CSV file.`);
  const data = typeof a.data === 'string' ? a.data : '';
  if (!data || !/^[A-Za-z0-9+/=\r\n]+$/.test(data.slice(0, 4096))) throw new AttachmentError(`"${name}" could not be read.`);
  if (data.length > LIMITS.perFile) throw new AttachmentError(`"${name}" is too large. Keep each file under about 4 MB.`);
  return { name, mediaType: mediaType as Extract<Attachment, { mediaType: string }>['mediaType'], data };
}

/** The attachments on one message, or an AttachmentError saying what is wrong with them. */
export function parseAttachments(raw: unknown): Attachment[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new AttachmentError('Attachments must be a list.');
  if (raw.length > LIMITS.perMessage) throw new AttachmentError(`Attach at most ${LIMITS.perMessage} files per message.`);
  return raw.map(parseOne);
}

/** Checks the whole request, since earlier files are sent again with every turn. */
export function checkTotals(all: Attachment[]): void {
  if (all.length > LIMITS.total) throw new AttachmentError(`This chat has too many files (limit ${LIMITS.total}). Start a new chat to attach more.`);
  const size = all.reduce((n, a) => n + ('text' in a ? a.text.length : a.data.length), 0);
  if (size > LIMITS.allFiles) throw new AttachmentError('The files in this chat are too large together. Start a new chat, or attach smaller files.');
}

/** Image and document blocks for the Messages API, in the order the files were attached. */
export function toContentBlocks(files: Attachment[]): Record<string, unknown>[] {
  return files.map((f) => {
    if ('text' in f) return { type: 'document', title: f.name, source: { type: 'text', media_type: 'text/plain', data: f.text } };
    if (f.mediaType === 'application/pdf') return { type: 'document', title: f.name, source: { type: 'base64', media_type: f.mediaType, data: f.data } };
    return { type: 'image', source: { type: 'base64', media_type: f.mediaType, data: f.data } };
  });
}
