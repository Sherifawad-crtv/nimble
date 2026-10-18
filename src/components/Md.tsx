import type { ReactNode } from 'react';

/** Inline: **bold**, *italic* and `code`. Anything unmatched stays as typed. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

/**
 * The few Markdown shapes the assistant writes: paragraphs, bullet and numbered lists, bold, italic
 * and code. Rendered as elements, never as HTML, so nothing it says can inject markup.
 */
export function Md({ text }: { text: string }) {
  // While text is still arriving, close a dangling ** so it never flashes as raw asterisks.
  const safe = (text.match(/\*\*/g)?.length ?? 0) % 2 ? `${text}**` : text;
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{para.map((l, i) => (i ? [<br key={`b${i}`} />, ...inline(l)] : inline(l)))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={blocks.length}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of safe.split('\n')) {
    const line = raw.replace(/^#{1,6}\s+/, '').trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const number = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || number) {
      flushPara();
      const ordered = !!number;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? number)![1] as string);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return <>{blocks}</>;
}
