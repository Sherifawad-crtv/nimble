import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '../app/auth';
import { useToast } from '../app/Toast';
import { Button, Icon } from '../design';
import { Md } from './Md';
import { ParticleOrb } from './ParticleOrb';
import { errorMessage, useAction, useData } from '../hooks/data';
import { keys } from '../hooks/keys';
import { formatDay, t } from '../i18n';
import { ATTACH_ACCEPT, AttachmentError, MAX_CHAT_BASE64, MAX_FILES, payloadSize, readAttachment } from '../lib/attachments';
import { blockTypeLabel, isTimerBlock, measuredLabel, settingsSummary, targetText } from '../lib/workout';
import { dataService } from '../services';
import type { AssistantAttachment, AssistantChatSummary, AssistantMessage, AssistantProposal, ExerciseInput, Id, MeasuredAs, SavedAssistantMessage } from '../types';

interface Turn extends AssistantMessage {
  proposal?: AssistantProposal;
  resolved?: boolean;
  /** A reply that just arrived: its text is still being revealed. */
  fresh?: boolean;
  /** Names of files attached in an earlier visit. Shown as chips, but their contents are not sent again. */
  files?: string[];
}

/** What is kept of a turn: the words and any proposal card, with files reduced to their names. */
const toSaved = (turn: Turn): SavedAssistantMessage => {
  const files = turn.attachments?.map((a) => a.name) ?? turn.files;
  return { role: turn.role, content: turn.content, ...(files?.length ? { files } : {}), ...(turn.proposal ? { proposal: turn.proposal } : {}) };
};

/** An old proposal is shown for reference only: the library may have changed since, so it is not offered again. */
const fromSaved = (m: SavedAssistantMessage): Turn => ({ role: m.role, content: m.content, ...(m.files?.length ? { files: m.files } : {}), ...(m.proposal ? { proposal: m.proposal, resolved: true } : {}) });

const chatTitle = (turns: Turn[]): string => {
  const first = turns.find((x) => x.role === 'user');
  if (!first) return t('assistant.history.untitled');
  const names = first.attachments?.map((a) => a.name) ?? first.files ?? [];
  const text = first.content === t('assistant.upload.defaultPrompt') && names.length ? names.join(', ') : first.content;
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > 60 ? `${line.slice(0, 59)}…` : line || t('assistant.history.untitled');
};

/** Saved chats under Today, Yesterday, Previous 7 days and Older, newest first within each. */
const groupChats = (list: AssistantChatSummary[]): { label: string; chats: AssistantChatSummary[] }[] => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  const buckets = [
    { label: t('assistant.group.today'), from: start.getTime(), chats: [] as AssistantChatSummary[] },
    { label: t('assistant.group.yesterday'), from: start.getTime() - day, chats: [] as AssistantChatSummary[] },
    { label: t('assistant.group.week'), from: start.getTime() - 7 * day, chats: [] as AssistantChatSummary[] },
    { label: t('assistant.group.older'), from: -Infinity, chats: [] as AssistantChatSummary[] },
  ];
  for (const c of list) buckets.find((b) => new Date(c.updatedAt).getTime() >= b.from)?.chats.push(c);
  return buckets.filter((b) => b.chats.length);
};

const STARTERS: { label: string; prompt?: string }[] = [
  { label: t('assistant.starter.workout'), prompt: t('assistant.starter.workout.prompt') },
  { label: t('assistant.starter.assign'), prompt: t('assistant.starter.assign.prompt') },
  { label: t('assistant.starter.find'), prompt: t('assistant.starter.find.prompt') },
  { label: t('assistant.starter.upload') },
];

/** A file shown as a small labelled chip, in the composer before sending and in the thread after. */
function FileChip({ name, image, onRemove }: { name: string; image: boolean; onRemove?: () => void }) {
  return (
    <li className="assist-file">
      <Icon name={image ? 'gallery' : 'file'} size={16} />
      <span className="assist-file-name">{name}</span>
      {onRemove && (
        <button type="button" className="assist-file-x" aria-label={t('assistant.attach.remove', { name })} onClick={onRemove}>
          <Icon name="close" size={14} />
        </button>
      )}
    </li>
  );
}

const STATUS = [t('assistant.status.1'), t('assistant.status.2'), t('assistant.status.3')];

/** Reveals text word by word, quickly, the way a reply streams in. Skipped for older messages. */
function useReveal(text: string, fresh: boolean, onDone: () => void, onGrow: () => void): string {
  const [n, setN] = useState(fresh ? 0 : text.length);
  useEffect(() => {
    if (!fresh) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      onDone();
      return;
    }
    const parts = text.split(/(\s+)/);
    const per = Math.max(1, Math.ceil(parts.length / (1800 / 24))); // never longer than ~1.8 s
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(parts.length, i + per);
      setN(parts.slice(0, i).join('').length);
      if (i >= parts.length) {
        window.clearInterval(id);
        onDone();
      }
    }, 24);
    return () => window.clearInterval(id);
  }, [text, fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  // Braces matter: an effect must return nothing or a cleanup function. Whatever the scroll call hands
  // back (some browsers and extensions return a Promise) would otherwise be treated as the cleanup.
  useEffect(() => {
    onGrow();
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  return text.slice(0, n);
}

function Reply({ text, fresh, onDone, onGrow, children }: { text: string; fresh: boolean; onDone: () => void; onGrow: () => void; children?: React.ReactNode }) {
  const shown = useReveal(text, fresh, onDone, onGrow);
  const finished = shown.length >= text.length;
  return (
    <>
      <div className="assist-bubble md">
        <Md text={shown} />
        {!finished && <span className="assist-caret" aria-hidden="true" />}
      </div>
      {finished && children}
    </>
  );
}

/** While the assistant works: the particle sphere speeds up and a line of status text shimmers. */
function Thinking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % STATUS.length), 2300);
    return () => window.clearInterval(id);
  }, []);
  return (
    <li className="assist-thinking" role="status" aria-label={t('assistant.working')}>
      <ParticleOrb size={44} energy={1} particles={80} />
      <span key={i} className="assist-shimmer t-label">
        {STATUS[i]}
      </span>
    </li>
  );
}


/**
 * The coach assistant: a full-screen layer that slides up over the app, with no navigation bar.
 * It looks things up and proposes one change at a time. Nothing is saved until the coach confirms.
 */
export function AssistantOverlay({ onClose }: { onClose: () => void }) {
  const me = useMe();
  const toast = useToast();
  const navigate = useNavigate();
  const [turns, setTurns] = useState<Turn[]>([]);
  /** The list of saved chats, which slides in over the conversation from the left. */
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState('');
  /** The saved chat whose "..." menu is open. */
  const [menuFor, setMenuFor] = useState<Id | null>(null);
  /** The "+" menu in the composer: photo, file, camera. */
  const [attachMenu, setAttachMenu] = useState(false);
  const plus = useRef<HTMLDivElement>(null);
  const photoPicker = useRef<HTMLInputElement>(null);
  const cameraPicker = useRef<HTMLInputElement>(null);
  /** The saved chat these turns belong to. A new one starts with each new conversation. */
  const [chatId, setChatId] = useState<Id>(() => crypto.randomUUID());
  /** What was last written for this chat, so opening an old one does not rewrite it. */
  const saved = useRef('');
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<AssistantAttachment[]>([]);
  const [reading, setReading] = useState(false);
  /** A plan from a file is being brought in and has not been saved yet. */
  const [importing, setImporting] = useState(false);
  const [resume, setResume] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [typing, setTyping] = useState(false);
  const typer = useRef<number>();
  const [closing, setClosing] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const exercises = useData(keys.exercises(), (s) => s.listExercises());
  const measured = new Map<string, MeasuredAs>((exercises.data ?? []).map((e) => [e.id, e.measuredAs]));

  const saveWorkout = useAction((s, a: { workout: Extract<AssistantProposal, { kind: 'workout' }> }) => s.saveWorkout({ ...a.workout.workout, ...(a.workout.replaceId ? { id: a.workout.replaceId } : {}) }), { invalidate: [keys.templates] });
  const assignWorkout = useAction((s, a: { clientId: string; workoutId: string; date: string }) => s.assignWorkout({ clientIds: [a.clientId], workoutId: a.workoutId, dates: [a.date] }), { invalidate: [keys.assignmentsAll] });
  const assignProgram = useAction((s, a: { clientId: string; programId: string; startDate: string }) => s.assignProgram(a), { invalidate: [keys.assignmentsAll] });

  const saveChat = useAction((s, a: { id: Id; title: string; messages: SavedAssistantMessage[] }) => s.saveAssistantChat(a), { invalidate: [keys.assistantChats] });
  const removeChat = useAction((s, id: Id) => s.deleteAssistantChat(id), { invalidate: [keys.assistantChats] });
  const chats = useData(keys.assistantChats, (s) => s.listAssistantChats(), { enabled: drawer });

  const addExercise = useAction((s, a: ExerciseInput) => s.createExercise(a), { invalidate: [keys.exercisesAll] });
  const attachVideo = useAction((s, a: { id: Id; videoUrl: string }) => s.updateExercise(a.id, { videoUrl: a.videoUrl }), { invalidate: [keys.exercisesAll] });
  const saveProgram = useAction((s, a: { title: string; days: { dayOffset: number; workoutId: Id }[] }) => s.saveProgram(a), { invalidate: [keys.programs, keys.templates] });

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [turns, busy]);

  // Keep the conversation: written once a reply (or a confirmed change) has settled, never mid-request.
  useEffect(() => {
    if (busy || !turns.length) return;
    const messages = turns.map(toSaved);
    const signature = JSON.stringify([chatId, messages]);
    if (signature === saved.current) return;
    saved.current = signature;
    // History is a convenience: a failed save must never get in the way of the conversation.
    saveChat.run({ id: chatId, title: chatTitle(turns), messages }).catch(() => {
      saved.current = '';
    });
  }, [turns, busy, chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!attachMenu) return;
    const away = (e: PointerEvent) => !plus.current?.contains(e.target as Node) && setAttachMenu(false);
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [attachMenu]);

  const close = () => setClosing(true);

  const startNew = () => {
    setTurns([]);
    setPending([]);
    setImporting(false);
    setChatId(crypto.randomUUID());
    saved.current = '';
    setDrawer(false);
  };

  const open = async (summary: AssistantChatSummary) => {
    try {
      const chat = await dataService.getAssistantChat(summary.id);
      const restored = chat.messages.map(fromSaved);
      saved.current = JSON.stringify([chat.id, chat.messages]);
      setTurns(restored);
      setChatId(chat.id);
      setPending([]);
      setImporting(false);
      setDrawer(false);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  };

  const forget = async (summary: AssistantChatSummary) => {
    try {
      await removeChat.run(summary.id);
      if (summary.id === chatId) startNew();
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  };

  const pick = async (files: File[]) => {
    if (!files.length) return;
    if (pending.length + files.length > MAX_FILES) {
      toast.show(t('assistant.attach.tooMany', { n: MAX_FILES }), 'error');
      return;
    }
    setReading(true);
    try {
      const added: AssistantAttachment[] = [];
      for (const f of files) added.push(await readAttachment(f));
      // Earlier files go with every message in the chat, so what is already there counts too.
      const inChat = turns.flatMap((x) => x.attachments ?? []);
      if (payloadSize([...inChat, ...pending, ...added]) > MAX_CHAT_BASE64) {
        toast.show(t('assistant.attach.tooMuch'), 'error');
        return;
      }
      setPending((p) => [...p, ...added]);
    } catch (e) {
      toast.show(e instanceof AttachmentError ? e.message : errorMessage(e), 'error');
    } finally {
      setReading(false);
    }
  };

  const send = async (text: string) => {
    const attachments = pending;
    const wasImporting = importing;
    // A file on its own means "bring this in", exactly as written, unless they say otherwise.
    const content = text.trim() || (attachments.length ? t('assistant.upload.defaultPrompt') : '');
    if (!content || busy || reading) return;
    const next: Turn[] = [...turns.map((x) => ({ ...x, fresh: false })), { role: 'user', content, ...(attachments.length ? { attachments } : {}) }];
    setTurns(next);
    setDraft('');
    setPending([]);
    if (attachments.length) setImporting(true);
    setBusy(true);
    setThinking(true);
    try {
      const reply = await dataService.askAssistant(next.map(({ role, content: c, attachments: a }) => ({ role, content: c, ...(a?.length ? { attachments: a } : {}) })));
      setThinking(false);
      setTurns([...next, { role: 'assistant', content: reply.text, fresh: true, ...(reply.proposal ? { proposal: reply.proposal } : {}) }]);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
      setTurns(next.slice(0, -1));
      setDraft(text);
      setPending(attachments);
      setImporting(wasImporting);
    } finally {
      setThinking(false);
      setBusy(false);
    }
  };

  // Runs on the render after the exercises are saved, so the follow-up is built from the settled thread.
  useEffect(() => {
    if (!resume || busy) return;
    setResume(false);
    void send(t('assistant.upload.continue'));
  }, [resume, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const settle = (index: number, message: string) =>
    setTurns((list) => [...list.map((x, i) => (i === index ? { ...x, resolved: true } : x)), { role: 'assistant' as const, content: message, fresh: true }]);

  const confirm = async (index: number, p: AssistantProposal) => {
    setBusy(true);
    try {
      if (p.kind === 'workout') {
        const saved = await saveWorkout.run({ workout: p });
        setImporting(false);
        toast.show(t('assistant.done.workout', { title: saved.title }));
        setClosing(true);
        navigate(`/coach/workouts/${saved.id}`);
      } else if (p.kind === 'assign_workout') {
        await assignWorkout.run({ clientId: p.clientId, workoutId: p.workoutId, date: p.date });
        settle(index, t('assistant.done.assign', { client: p.clientName }));
      } else if (p.kind === 'assign_program') {
        await assignProgram.run({ clientId: p.clientId, programId: p.programId, startDate: p.startDate });
        settle(index, t('assistant.done.assign', { client: p.clientName }));
      } else if (p.kind === 'exercises') {
        let done = 0;
        const failed: string[] = [];
        for (const it of p.items) {
          try {
            if (it.existingId) await attachVideo.run({ id: it.existingId, videoUrl: it.videoUrl ?? '' });
            else await addExercise.run({ name: it.name, equipment: it.equipment, tags: it.tags, measuredAs: it.measuredAs, ...(it.cues ? { cues: it.cues } : {}), ...(it.videoUrl ? { videoUrl: it.videoUrl } : {}) });
            done++;
          } catch {
            failed.push(it.name);
          }
        }
        settle(index, failed.length ? t('assistant.done.exercisesSome', { n: done, failed: failed.join(', ') }) : t('assistant.done.exercises', { n: done }));
        // Adding the missing exercises is only the first step of an import: carry straight on to the
        // plan itself rather than leaving the coach to ask for it.
        if (importing && done > 0) setResume(true);
      } else {
        const ids = new Map<string, Id>();
        for (const n of p.newWorkouts) ids.set(n.key, (await saveWorkout.run({ workout: { kind: 'workout', workout: n.workout } })).id);
        const days = p.sessions.map((x) => ({ dayOffset: x.dayOffset, workoutId: (x.workoutId ?? ids.get(x.workoutKey ?? '')) as Id }));
        const saved = await saveProgram.run({ title: p.title, days });
        setImporting(false);
        toast.show(t('assistant.done.program', { title: saved.title }));
        setClosing(true);
        navigate(`/coach/programs/${saved.id}`);
      }
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const field = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.blockSize = 'auto';
    el.style.blockSize = `${el.scrollHeight}px`;
  }, [draft]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  const empty = turns.length === 0;

  return (
    <div className={closing ? 'assist closing' : 'assist'} role="dialog" aria-modal="true" aria-label={t('assistant.title')} onAnimationEnd={(e) => e.currentTarget === e.target && closing && onClose()}>
      <header className="assist-bar">
        <button type="button" className="assist-round" aria-label={t('assistant.chats')} onClick={() => {
            setMenuFor(null);
            setDrawer(true);
          }}>
          <Icon name="menu" size={22} />
        </button>
        <h2 className="t-body-strong assist-bar-title">{empty ? '' : chatTitle(turns)}</h2>
        <button type="button" className="assist-round" aria-label={t('assistant.new')} disabled={busy || empty} onClick={startNew}>
          <Icon name="edit" size={20} />
        </button>
      </header>

      {drawer && (
        <>
          <div className="assist-scrim" onClick={() => setDrawer(false)} />
          <aside className="assist-drawer" aria-label={t('assistant.chats')}>
            <div className="assist-drawer-top">
              <label className="assist-search">
                <Icon name="search" size={18} />
                <input type="search" value={search} placeholder={t('assistant.search')} aria-label={t('assistant.search')} autoComplete="off" onChange={(e) => setSearch(e.target.value)} />
              </label>
              <button type="button" className="assist-round" aria-label={t('assistant.close')} onClick={close}>
                <Icon name="close" size={22} />
              </button>
            </div>
            <button type="button" className="assist-new-row" disabled={busy} onClick={startNew}>
              <Icon name="edit" size={20} />
              <span className="t-body-strong">{t('assistant.new')}</span>
            </button>
            <div className="assist-drawer-list">
              {chats.isPending ? (
                <div className="assist-history-note" role="status">
                  <span className="v-spin" aria-hidden="true" />
                </div>
              ) : chats.error ? (
                <p className="assist-history-note v-muted t-body">{errorMessage(chats.error)}</p>
              ) : !chats.data?.length ? (
                <p className="assist-history-note v-muted t-body">{t('assistant.history.empty')}</p>
              ) : (
                (() => {
                  const q = search.trim().toLowerCase();
                  const groups = groupChats(chats.data.filter((c) => !q || c.title.toLowerCase().includes(q)));
                  if (!groups.length) return <p className="assist-history-note v-muted t-body">{t('assistant.search.none')}</p>;
                  return groups.map((g) => (
                    <section key={g.label} className="assist-group">
                      <h3 className="t-eyebrow v-muted">{g.label}</h3>
                      <ul>
                        {g.chats.map((c) => (
                          <li key={c.id} className="assist-chat-row" data-current={c.id === chatId || undefined}>
                            <button type="button" className="assist-chat-open" onClick={() => void open(c)}>
                              {c.title}
                            </button>
                            {menuFor === c.id ? (
                              <button type="button" className="assist-chat-del" disabled={removeChat.isPending} onClick={() => void forget(c).then(() => setMenuFor(null))}>
                                <Icon name="trash" size={16} />
                                {t('assistant.history.delete')}
                              </button>
                            ) : (
                              <button type="button" className="assist-chat-more" aria-label={t('assistant.history.options', { title: c.title })} onClick={() => setMenuFor(c.id)}>
                                <Icon name="dots" size={20} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ));
                })()
              )}
            </div>
            <div className="assist-drawer-foot t-label v-muted">{me.name}</div>
          </aside>
        </>
      )}

      {empty ? (
        <div className="assist-hero">
          <ParticleOrb size={210} energy={typing ? 0.55 : 0.08} />
          <p className="t-label assist-hello">{t('assistant.hello', { name: me.name.split(' ')[0] ?? me.name })}</p>
          <h1 className="t-title assist-headline">{t('assistant.headline')}</h1>
          <div className="assist-chips" role="group" aria-label={t('assistant.starters')}>
            {STARTERS.map((s, k) => (
              <button
                key={s.label}
                type="button"
                className="assist-chip"
                style={{ '--i': k } as React.CSSProperties}
                onClick={() => (s.prompt ? void send(s.prompt) : picker.current?.click())}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="assist-thread" aria-live="polite">
          {turns.map((turn, i) =>
            turn.role === 'user' ? (
              <li key={i} className="assist-msg me">
                <div className="assist-me-col">
                  {turn.attachments?.length || turn.files?.length ? (
                    <ul className="assist-files">
                      {(turn.attachments ?? []).map((f, k) => (
                        <FileChip key={k} name={f.name} image={'mediaType' in f && f.mediaType.startsWith('image/')} />
                      ))}
                      {(turn.files ?? []).map((name, k) => (
                        <FileChip key={`f${k}`} name={name} image={/\.(jpe?g|png|gif|webp|heic|heif)$/i.test(name)} />
                      ))}
                    </ul>
                  ) : null}
                  <p className="assist-bubble me">{turn.content}</p>
                </div>
              </li>
            ) : (
              <li key={i} className="assist-msg">
                <div className="assist-col">
                  <Reply
                    text={turn.content}
                    fresh={!!turn.fresh}
                    onDone={() => setTurns((list) => list.map((x, k) => (k === i ? { ...x, fresh: false } : x)))}
                    onGrow={() => {
                      end.current?.scrollIntoView({ block: 'end' });
                    }}
                  >
                    {turn.proposal && <ProposalCard proposal={turn.proposal} measured={measured} resolved={!!turn.resolved} busy={busy} onConfirm={() => void confirm(i, turn.proposal as AssistantProposal)} onCancel={() => settle(i, t('assistant.cancelled'))} />}
                  </Reply>
                </div>
              </li>
            ),
          )}
          {thinking && <Thinking />}
          <div ref={end} />
        </ol>
      )}

      <form className="assist-composer" onSubmit={onSubmit}>
        {([[picker, ATTACH_ACCEPT, false], [photoPicker, 'image/*', false], [cameraPicker, 'image/*', true]] as const).map(([ref, accept, camera], k) => (
          <input
            key={k}
            ref={ref}
            type="file"
            multiple={!camera}
            hidden
            accept={accept}
            {...(camera ? { capture: 'environment' as const } : {})}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              void pick(files);
            }}
          />
        ))}
        <div className="assist-box">
          {pending.length > 0 && (
            <ul className="assist-files pending" aria-label={t('assistant.attach')}>
              {pending.map((f, k) => (
                <FileChip key={k} name={f.name} image={'mediaType' in f && f.mediaType.startsWith('image/')} onRemove={() => setPending((p) => p.filter((_, j) => j !== k))} />
              ))}
            </ul>
          )}
          <textarea
            ref={field}
            rows={1}
            className="assist-input"
            value={draft}
            maxLength={1000}
            placeholder={t('assistant.placeholder')}
            aria-label={t('assistant.placeholder')}
            enterKeyHint="enter"
            autoComplete="off"
            onKeyDown={(e) => {
              // Desktop: Enter sends, Shift+Enter breaks the line. Touch keyboards keep Enter as a new line.
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                e.preventDefault();
                void send(draft);
              }
            }}
            onChange={(e) => {
              setDraft(e.target.value);
              setTyping(true);
              window.clearTimeout(typer.current);
              typer.current = window.setTimeout(() => setTyping(false), 700);
            }}
          />
          <div className="assist-box-row">
            <div className="assist-plus-wrap" ref={plus}>
              <button type="button" className="assist-plus" aria-label={t('assistant.attach.menu')} aria-expanded={attachMenu} disabled={busy || reading} onClick={() => setAttachMenu((v) => !v)}>
                {reading ? <span className="v-spin" aria-hidden="true" /> : <Icon name="plus" size={22} />}
              </button>
              {attachMenu && (
                <ul className="assist-pop" role="menu">
                  {(
                    [
                      ['gallery', t('assistant.attach.photo'), photoPicker],
                      ['file', t('assistant.attach.file'), picker],
                      ['camera', t('assistant.attach.camera'), cameraPicker],
                    ] as const
                  ).map(([icon, label, ref]) => (
                    <li key={label} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAttachMenu(false);
                          ref.current?.click();
                        }}
                      >
                        <Icon name={icon} size={20} />
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="assist-send" aria-label={t('assistant.send')} disabled={busy || reading || (!draft.trim() && !pending.length)}>
              <Icon name="arrow-up" size={20} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const weekday = (offset: number): string => new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2026, 9, 12 + (offset % 7), 12));

function ProposalCard({ proposal, measured, resolved, busy, onConfirm, onCancel }: { proposal: AssistantProposal; measured: Map<string, MeasuredAs>; resolved: boolean; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const heading =
    proposal.kind === 'workout'
      ? proposal.replaceId
        ? t('assistant.proposal.update')
        : t('assistant.proposal.create')
      : proposal.kind === 'assign_workout'
        ? t('assistant.proposal.assignWorkout')
        : proposal.kind === 'assign_program'
          ? t('assistant.proposal.assignProgram')
          : proposal.kind === 'exercises'
            ? t('assistant.proposal.exercises')
            : t('assistant.proposal.program');
  return (
    <div className="assist-proposal" data-resolved={resolved || undefined}>
      <div className="t-eyebrow v-muted">{heading}</div>
      {proposal.kind === 'workout' && (
        <>
          <div className="t-heading">{proposal.workout.title}</div>
          {proposal.workout.blocks.map((b) => (
            <div key={b.id} className="assist-proposal-block">
              <div className="t-body-strong">
                {b.title} <span className="v-muted t-label">· {isTimerBlock(b) ? settingsSummary(b.settings) : blockTypeLabel(b.settings.type)}</span>
              </div>
              <ul>
                {b.items.map((it) => (
                  <li key={it.id} className="t-label">
                    <span className="t-body">{it.exerciseName}</span>
                    {targetText(it.target, measured.get(it.exerciseId) ?? 'reps', isTimerBlock(b)) && <span className="v-muted"> · {targetText(it.target, measured.get(it.exerciseId) ?? 'reps', isTimerBlock(b))}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      {proposal.kind === 'assign_workout' && <p className="t-body">{t('assistant.proposal.assignWorkout.body', { title: proposal.workoutTitle, client: proposal.clientName, date: formatDay(proposal.date) })}</p>}
      {proposal.kind === 'assign_program' && <p className="t-body">{t('assistant.proposal.assignProgram.body', { title: proposal.programTitle, client: proposal.clientName, date: formatDay(proposal.startDate) })}</p>}
      {proposal.kind === 'exercises' && (
        <>
          {proposal.items.map((it) => (
            <div key={it.name} className="assist-proposal-block">
              <div className="t-body-strong">
                {it.name} <span className="v-muted t-label">· {measuredLabel(it.measuredAs)}{it.tags.length ? ` · ${it.tags.join(', ')}` : ''}</span>
              </div>
              <div className="t-label v-muted">{it.videoUrl ? t('assistant.exercise.video', { title: it.videoTitle || it.videoUrl }) : (it.note ?? t('assistant.exercise.noVideo'))}</div>
            </div>
          ))}
          {proposal.skipped && <p className="t-label v-muted">{t('assistant.exercise.skipped', { names: proposal.skipped.join(', ') })}</p>}
        </>
      )}
      {proposal.kind === 'program' && (
        <>
          <div className="t-heading">{proposal.title}</div>
          <p className="t-label v-muted">{t('assistant.program.summary', { weeks: Math.floor(Math.max(...proposal.sessions.map((x) => x.dayOffset)) / 7) + 1, sessions: proposal.sessions.length })}</p>
          {proposal.newWorkouts.length > 0 && (
            <div className="assist-proposal-block">
              <div className="t-body-strong">{t('assistant.program.newWorkouts', { n: proposal.newWorkouts.length })}</div>
              <ul>
                {proposal.newWorkouts.map((n) => (
                  <li key={n.key} className="t-body">
                    {n.workout.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="assist-proposal-block">
            <div className="t-body-strong">{t('assistant.program.week1')}</div>
            <ul>
              {proposal.sessions.filter((x) => x.dayOffset < 7).map((x) => (
                <li key={x.dayOffset} className="t-label">
                  <span className="v-muted">{weekday(x.dayOffset)} · </span>
                  <span className="t-body">{x.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {!resolved && (
        <div className="assist-proposal-actions">
          <Button fullWidth size="md" loading={busy} disabled={busy} onClick={onConfirm}>
            {t('assistant.confirm')}
          </Button>
          <Button fullWidth size="md" variant="secondary" disabled={busy} onClick={onCancel}>
            {t('assistant.cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}
