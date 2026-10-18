// POST { messages: [{ role: 'user' | 'assistant', content: string }] } -> { text, proposal? }
// A rule-bounded assistant for coaches. The model may only look things up (read tools) or propose
// one change (propose tools). It never writes: the app shows the proposal and applies it, as the
// coach, only after they confirm.
import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0';
import { HttpError, json, serve } from '../_shared/http.ts';
import { admin, caller } from '../_shared/supabase.ts';

const MODEL = 'claude-haiku-5-5';
const DAILY_LIMIT = 150;
const MAX_TURNS = 8;

const SYSTEM = `You are Nimble's assistant for a fitness coach. You help the coach build workouts and assign them to clients, using only the tools provided.

How to work:
- Look things up first. Never invent an exercise, workout, program or client id. Use search_exercises, list_clients, list_workouts, list_programs and get_workout to find real ones.
- To change anything, call exactly one propose_* tool with complete details. That shows the coach a preview; nothing is saved until they confirm. After proposing, stop and tell them in one short sentence what you proposed.
- If something needed is missing or ambiguous (which client, which date, which of several matching exercises), ask one short question instead of guessing. Offer the options.
- If an exercise the coach names is not in their library, say so and suggest the closest matches. Do not substitute silently.
- Dates are ISO (YYYY-MM-DD). Resolve words like "Monday" or "next week" using today's date given below.
- Be brief and plain. No emojis, no markdown headings.

Workout shape: a workout has blocks. A block is standard (sets x reps per exercise), or a timed block: emom (totalMin, intervalSec), amrap (capSec), for_time (rounds, optional capSec), tabata (workSec, restSec, rounds). Items hold sets, reps, durationSec, distanceM, loadNote (for example "RPE 8" or "70% 1RM"), restSec and notes. Time-measured exercises use durationSec, distance-measured use distanceM, everything else uses reps. In timed blocks leave sets empty.

You can only create or edit workouts and assign workouts or programs. For anything else (deleting, billing, messaging clients, editing programs), say it is not something you can do yet.`;

const itemSchema = {
  type: 'object',
  properties: {
    exerciseId: { type: 'string', description: 'An id returned by search_exercises.' },
    sets: { type: 'integer' },
    reps: { type: 'integer' },
    durationSec: { type: 'integer' },
    distanceM: { type: 'integer' },
    loadNote: { type: 'string' },
    restSec: { type: 'integer' },
    notes: { type: 'string' },
  },
  required: ['exerciseId'],
};

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_exercises',
    description: "Find exercises in the coach's library by name or tag. Returns ids you must use in workouts.",
    input_schema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer' } }, required: ['query'] },
  },
  { name: 'list_clients', description: "List the coach's clients with ids.", input_schema: { type: 'object', properties: {} } },
  {
    name: 'list_workouts',
    description: "List the coach's workout templates (id and title), optionally filtered by a title search.",
    input_schema: { type: 'object', properties: { query: { type: 'string' } } },
  },
  { name: 'list_programs', description: "List the coach's programs (id, title, number of sessions).", input_schema: { type: 'object', properties: {} } },
  {
    name: 'get_workout',
    description: 'Get the full contents of one workout template, to edit it.',
    input_schema: { type: 'object', properties: { workoutId: { type: 'string' } }, required: ['workoutId'] },
  },
  {
    name: 'propose_workout',
    description: 'Propose creating a new workout template, or replacing an existing one when replaceWorkoutId is given (send the complete new contents).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        replaceWorkoutId: { type: 'string' },
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              type: { type: 'string', enum: ['standard', 'emom', 'amrap', 'for_time', 'tabata'] },
              totalMin: { type: 'integer' },
              intervalSec: { type: 'integer' },
              capSec: { type: 'integer' },
              rounds: { type: 'integer' },
              workSec: { type: 'integer' },
              restSec: { type: 'integer' },
              items: { type: 'array', items: itemSchema },
            },
            required: ['title', 'type', 'items'],
          },
        },
      },
      required: ['title', 'blocks'],
    },
  },
  {
    name: 'propose_assign_workout',
    description: 'Propose assigning one workout to one client on one date.',
    input_schema: {
      type: 'object',
      properties: { workoutId: { type: 'string' }, clientId: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' } },
      required: ['workoutId', 'clientId', 'date'],
    },
  },
  {
    name: 'propose_assign_program',
    description: 'Propose assigning a whole program to one client, starting on a date (use the Monday the program should begin).',
    input_schema: {
      type: 'object',
      properties: { programId: { type: 'string' }, clientId: { type: 'string' }, startDate: { type: 'string', description: 'YYYY-MM-DD' } },
      required: ['programId', 'clientId', 'startDate'],
    },
  },
];

type Json = Record<string, unknown>;
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const shortId = () => crypto.randomUUID().slice(0, 8);
const pos = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined);

serve(async (req) => {
  const me = await caller(req);
  if (me.role !== 'coach') throw new HttpError(403, 'forbidden', 'Only the coach can use the assistant.');
  const body = (await req.json().catch(() => ({}))) as { messages?: { role: string; content: string }[] };
  const history = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-14)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 2000) }));
  if (!history.length || history[history.length - 1].role !== 'user') throw new HttpError(400, 'invalid', 'Write a message first.');

  const db = admin();
  const day = new Date().toISOString().slice(0, 10);
  const { data: used } = await db.rpc('assistant_take', { p_user: me.id, p_day: day });
  if (typeof used === 'number' && used > DAILY_LIMIT) throw new HttpError(429 as never, 'unavailable', 'You have reached today\'s assistant limit. It resets tomorrow.');

  const ws = me.workspaceId;
  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

  async function runRead(name: string, input: Json): Promise<unknown> {
    switch (name) {
      case 'search_exercises': {
        const q = String(input.query ?? '').trim().toLowerCase();
        const { data } = await db.from('exercises').select('id, name, measured_as, tags, equipment').eq('workspace_id', ws).order('name');
        const words = q.split(/\s+/).filter(Boolean);
        const hits = (data ?? [])
          .map((e) => {
            const hay = `${e.name} ${(e.tags ?? []).join(' ')}`.toLowerCase();
            const score = words.length ? words.filter((w) => hay.includes(w)).length / words.length : 0;
            return { e, score: e.name.toLowerCase() === q ? 2 : score };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, Math.min(Number(input.limit) || 8, 15))
          .map(({ e }) => ({ id: e.id, name: e.name, measuredAs: e.measured_as, tags: e.tags, equipment: e.equipment }));
        return hits.length ? hits : 'No exercise in the library matches that.';
      }
      case 'list_clients': {
        const { data } = await db.from('profiles').select('id, name').eq('workspace_id', ws).eq('role', 'client').order('name');
        return data ?? [];
      }
      case 'list_workouts': {
        const { data } = await db.from('workouts').select('id, title').eq('workspace_id', ws).order('title');
        const q = String(input.query ?? '').toLowerCase();
        return (data ?? []).filter((w) => !q || w.title.toLowerCase().includes(q)).slice(0, 40);
      }
      case 'list_programs': {
        const { data } = await db.from('programs').select('id, title, days').eq('workspace_id', ws).order('title');
        return (data ?? []).map((p) => ({ id: p.id, title: p.title, sessions: Array.isArray(p.days) ? p.days.length : 0 }));
      }
      case 'get_workout': {
        const { data } = await db.from('workouts').select('id, title, blocks').eq('workspace_id', ws).eq('id', String(input.workoutId)).maybeSingle();
        return data ?? 'No such workout.';
      }
    }
    return 'Unknown tool.';
  }

  async function buildProposal(name: string, input: Json): Promise<{ proposal?: unknown; error?: string }> {
    if (name === 'propose_workout') {
      const blocks = Array.isArray(input.blocks) ? (input.blocks as Json[]) : [];
      if (!String(input.title ?? '').trim()) return { error: 'The workout needs a title.' };
      if (!blocks.length) return { error: 'The workout needs at least one block.' };
      const ids = [...new Set(blocks.flatMap((b) => (Array.isArray(b.items) ? (b.items as Json[]).map((i) => String(i.exerciseId)) : [])))];
      const { data: ex } = await db.from('exercises').select('id, name, measured_as').eq('workspace_id', ws).in('id', ids);
      const byId = new Map((ex ?? []).map((e) => [e.id as string, e]));
      const bad = ids.filter((i) => !byId.has(i));
      if (bad.length) return { error: `These exercise ids are not in the library: ${bad.join(', ')}. Use search_exercises to get real ids.` };
      if (input.replaceWorkoutId) {
        const { data: w } = await db.from('workouts').select('id').eq('workspace_id', ws).eq('id', String(input.replaceWorkoutId)).maybeSingle();
        if (!w) return { error: 'replaceWorkoutId does not match a workout.' };
      }
      const out = blocks.map((b) => {
        const type = String(b.type);
        const settings =
          type === 'emom'
            ? { type, totalMin: pos(b.totalMin) ?? 10, intervalSec: pos(b.intervalSec) ?? 60 }
            : type === 'amrap'
              ? { type, capSec: pos(b.capSec) ?? 600 }
              : type === 'for_time'
                ? { type, rounds: pos(b.rounds) ?? 3, ...(pos(b.capSec) ? { capSec: pos(b.capSec) } : {}) }
                : type === 'tabata'
                  ? { type, workSec: pos(b.workSec) ?? 20, restSec: pos(b.restSec) ?? 10, rounds: pos(b.rounds) ?? 8 }
                  : { type: 'standard' };
        const timed = type !== 'standard';
        const items = (b.items as Json[]).map((i) => {
          const e = byId.get(String(i.exerciseId))!;
          const target: Json = {};
          if (!timed && pos(i.sets)) target.sets = pos(i.sets);
          if (pos(i.reps)) target.reps = pos(i.reps);
          if (pos(i.durationSec)) target.durationSec = pos(i.durationSec);
          if (pos(i.distanceM)) target.distanceM = pos(i.distanceM);
          if (typeof i.loadNote === 'string' && i.loadNote.trim()) target.loadNote = i.loadNote.trim().slice(0, 60);
          if (!timed && pos(i.restSec)) target.restSec = pos(i.restSec);
          if (typeof i.notes === 'string' && i.notes.trim()) target.notes = i.notes.trim().slice(0, 200);
          return { id: shortId(), exerciseId: e.id, exerciseName: e.name, target };
        });
        return { id: shortId(), title: String(b.title ?? 'Block').slice(0, 80), settings, items };
      });
      return { proposal: { kind: 'workout', ...(input.replaceWorkoutId ? { replaceId: String(input.replaceWorkoutId) } : {}), workout: { title: String(input.title).trim().slice(0, 120), blocks: out } } };
    }
    if (name === 'propose_assign_workout' || name === 'propose_assign_program') {
      const program = name === 'propose_assign_program';
      const date = program ? input.startDate : input.date;
      if (!isDate(date)) return { error: 'Give the date as YYYY-MM-DD.' };
      const { data: c } = await db.from('profiles').select('id, name').eq('workspace_id', ws).eq('role', 'client').eq('id', String(input.clientId)).maybeSingle();
      if (!c) return { error: 'clientId does not match a client. Use list_clients.' };
      const table = program ? 'programs' : 'workouts';
      const { data: row } = await db.from(table).select('id, title').eq('workspace_id', ws).eq('id', String(program ? input.programId : input.workoutId)).maybeSingle();
      if (!row) return { error: `${program ? 'programId' : 'workoutId'} does not match anything. Look it up first.` };
      return program
        ? { proposal: { kind: 'assign_program', programId: row.id, programTitle: row.title, clientId: c.id, clientName: c.name, startDate: date } }
        : { proposal: { kind: 'assign_workout', workoutId: row.id, workoutTitle: row.title, clientId: c.id, clientName: c.name, date } };
    }
    return { error: 'Unknown proposal.' };
  }

  const messages: Anthropic.MessageParam[] = history;
  const system = `${SYSTEM}\n\nToday is ${day} (${new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}). The coach is ${me.name}.`;
  let text = '';

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system,
      tools: TOOLS,
      messages,
      output_config: { effort: 'low' },
    });
    const said = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (said) text = said;
    const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || !uses.length) return json({ text: text || 'I could not work that out. Try rephrasing.' });

    messages.push({ role: 'assistant', content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const u of uses) {
      const input = (u.input ?? {}) as Json;
      if (u.name.startsWith('propose_')) {
        const built = await buildProposal(u.name, input);
        if (built.proposal) return json({ text: text || 'Here is what I would do.', proposal: built.proposal });
        results.push({ type: 'tool_result', tool_use_id: u.id, content: built.error ?? 'Invalid proposal.', is_error: true });
      } else {
        const out = await runRead(u.name, input);
        results.push({ type: 'tool_result', tool_use_id: u.id, content: typeof out === 'string' ? out : JSON.stringify(out) });
      }
    }
    messages.push({ role: 'user', content: results });
  }
  return json({ text: text || 'That took too many steps. Try asking for one thing at a time.' });
});
