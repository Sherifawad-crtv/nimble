import { beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '../../lib/date';
import { ServiceError } from '../DataService';
import { CLIENT_IDS, COACH_ID } from './seed';
import { MockDataService } from './MockDataService';
import { parseVideoUrl } from '../videoLink';

const TODAY = '2026-10-12';
const make = () => new MockDataService({ latencyMs: [0, 0], today: () => TODAY });
const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: unknown) => (e instanceof ServiceError ? e.code : 'other'));

let svc: MockDataService;
beforeEach(async () => {
  svc = make();
  await svc.signIn(COACH_ID);
});

describe('video links', () => {
  it.each([
    ['https://www.youtube.com/watch?v=ultWZbUMPL8', 'youtube', 'ultWZbUMPL8'],
    ['https://youtu.be/uYumuL_G_V0?t=4', 'youtube', 'uYumuL_G_V0'],
    ['https://www.youtube.com/shorts/IODxDxX7oi4', 'youtube', 'IODxDxX7oi4'],
    ['youtube.com/embed/ultWZbUMPL8', 'youtube', 'ultWZbUMPL8'],
    ['https://vimeo.com/76979871', 'vimeo', '76979871'],
    ['https://player.vimeo.com/video/76979871', 'vimeo', '76979871'],
  ])('parses %s', (url, provider, videoId) => {
    expect(parseVideoUrl(url)).toEqual({ provider, videoId });
  });

  it.each(['https://example.com/watch?v=ultWZbUMPL8', 'https://www.youtube.com/', 'not a link', 'https://vimeo.com/channels/staffpicks', 'https://youtu.be/short'])(
    'rejects %s',
    (url) => {
      expect(() => parseVideoUrl(url)).toThrowError(ServiceError);
    },
  );

  it('previews a pasted link with title and thumbnail', async () => {
    const p = await svc.previewVideoLink('https://www.youtube.com/watch?v=ultWZbUMPL8');
    expect(p).toMatchObject({ provider: 'youtube', videoId: 'ultWZbUMPL8', title: 'Back Squat', embeddable: true });
    expect(p.thumbnailUrl).toContain('ultWZbUMPL8');
  });

  it('flags a video that cannot be embedded', async () => {
    const e = await svc.createExercise({ name: 'Locked', equipment: [], tags: [], measuredAs: 'reps', videoUrl: 'https://youtu.be/NOEMBED0001' });
    expect(e.linkStatus).toBe('unavailable');
  });

  it('saves an exercise with no video as unchecked', async () => {
    const e = await svc.createExercise({ name: 'Bear Crawl', equipment: ['bodyweight'], tags: ['core'], measuredAs: 'time' });
    expect(e.linkStatus).toBe('unchecked');
    expect(e.videoUrl).toBeUndefined();
  });

  it('rejects a non YouTube/Vimeo link on create', async () => {
    expect(await code(svc.createExercise({ name: 'X', equipment: [], tags: [], measuredAs: 'reps', videoUrl: 'https://tiktok.com/x' }))).toBe('invalid_link');
  });
});

describe('library rules', () => {
  it('seeds 20+ exercises including an unavailable link', async () => {
    const all = await svc.listExercises();
    expect(all.length).toBeGreaterThanOrEqual(20);
    expect(all.some((e) => e.linkStatus === 'unavailable')).toBe(true);
  });

  it('searches by name and filters by tag and equipment', async () => {
    expect((await svc.listExercises({ search: 'squat' })).map((e) => e.name)).toContain('Back Squat');
    const kb = await svc.listExercises({ equipment: ['kettlebell'], tags: ['legs'] });
    expect(kb.map((e) => e.name)).toEqual(['Goblet Squat']);
  });

  it('refuses a workout that uses an exercise outside the library', async () => {
    const tpl = (await svc.listTemplates())[0]!;
    const bad = structuredClone(tpl);
    bad.blocks[0]!.items[0]!.exerciseId = 'ex_made_up';
    expect(await code(svc.saveWorkout(bad))).toBe('invalid');
  });
});

describe('assignments carry their own copy', () => {
  it('is not changed by later edits to the template', async () => {
    const tpl = (await svc.listTemplates())[0]!;
    const [a] = await svc.assignWorkout({ clientIds: [CLIENT_IDS.sara], workoutId: tpl.id, dates: ['2026-11-01'] });
    await svc.saveWorkout({ ...tpl, title: 'Renamed' });
    const [again] = await svc.listAssignments({ clientId: CLIENT_IDS.sara, from: '2026-11-01', to: '2026-11-01' });
    expect(again?.workout.title).toBe(tpl.title);
    expect(again?.id).toBe(a?.id);
  });

  it('gives each client separate item ids', async () => {
    const tpl = (await svc.listTemplates())[0]!;
    const made = await svc.assignWorkout({ clientIds: [CLIENT_IDS.sara, CLIENT_IDS.karim], workoutId: tpl.id, dates: ['2026-11-02'] });
    const ids = made.map((a) => a.workout.blocks[0]!.items[0]!.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('creates one assignment per program day', async () => {
    const [program] = await svc.listPrograms();
    const made = await svc.assignProgram({ clientId: CLIENT_IDS.youssef, programId: program!.id, startDate: '2026-12-01' });
    expect(made).toHaveLength(program!.days.length);
    expect(made[1]?.date).toBe(addDays('2026-12-01', program!.days[1]!.dayOffset));
    expect(made.every((a) => a.programId === program!.id)).toBe(true);
  });

  it('only moves or deletes workouts that have not started', async () => {
    const all = await svc.listAssignments({ clientId: CLIENT_IDS.sara, from: '2000-01-01', to: '2100-01-01' });
    const done = all.find((a) => a.status === 'completed')!;
    const open = all.find((a) => a.status === 'not_started')!;
    expect(await code(svc.updateAssignment(done.id, { date: '2026-12-31' }))).toBe('invalid');
    expect(await code(svc.deleteAssignment(done.id))).toBe('invalid');
    expect((await svc.updateAssignment(open.id, { date: '2026-12-31' })).date).toBe('2026-12-31');
    await svc.deleteAssignment(open.id);
    expect(await code(svc.getLog(open.id))).toBe('not_found');
  });
});

describe('tenancy and roles', () => {
  it('blocks a client from coach actions', async () => {
    await svc.signIn(CLIENT_IDS.sara);
    expect(await code(svc.createExercise({ name: 'X', equipment: [], tags: [], measuredAs: 'reps' }))).toBe('forbidden');
    expect(await code(svc.listClients())).toBe('forbidden');
    expect(await code(svc.listTemplates())).toBe('forbidden');
  });

  it('blocks a client from another client’s data', async () => {
    await svc.signIn(CLIENT_IDS.sara);
    const mine = await svc.listAssignments({ from: '2000-01-01', to: '2100-01-01' });
    expect(mine.every((a) => a.clientId === CLIENT_IDS.sara)).toBe(true);
    expect(await code(svc.listAssignments({ clientId: CLIENT_IDS.karim, from: '2000-01-01', to: '2100-01-01' }))).toBe('forbidden');
    expect(await code(svc.listPackages(CLIENT_IDS.karim))).toBe('forbidden');
    await svc.signIn(CLIENT_IDS.karim);
    const karimAssignment = (await svc.listAssignments({ from: '2000-01-01', to: '2100-01-01' }))[0]!;
    await svc.signIn(CLIENT_IDS.sara);
    expect(await code(svc.getLog(karimAssignment.id))).toBe('forbidden');
    expect(await code(svc.addComment(karimAssignment.id, 'hi'))).toBe('forbidden');
  });

  it('requires a session', async () => {
    await svc.signOut();
    expect(await code(svc.getMe())).toBe('unauthenticated');
  });
});

describe('logging', () => {
  it('runs start, save and complete for the client', async () => {
    await svc.signIn(CLIENT_IDS.karim);
    const today = (await svc.listAssignments({ from: TODAY, to: TODAY }))[0]!;
    const log = await svc.startWorkout(today.id);
    expect((await svc.listAssignments({ from: TODAY, to: TODAY }))[0]?.status).toBe('in_progress');
    const item = today.workout.blocks[0]!.items[0]!;
    await svc.saveLog({ ...log, itemResults: [{ itemId: item.id, sets: [{ reps: 10, load: '20 kg' }] }], clientNote: ' nice ' });
    const done = await svc.completeWorkout(today.id);
    expect(done.completedAt).toBeTruthy();
    expect(done.clientNote).toBe('nice');
  });

  it('computes personal records and progress in the service', async () => {
    await svc.signIn(CLIENT_IDS.sara);
    const prs = await svc.listPersonalRecords(CLIENT_IDS.sara);
    const squat = prs.find((p) => p.exerciseName === 'Back Squat');
    expect(squat?.label).toMatch(/^5 × [\d.]+ kg$/);
    const progress = await svc.listExerciseProgress(CLIENT_IDS.sara);
    const squatSeries = progress.find((p) => p.exerciseName === 'Back Squat')!;
    expect(squatSeries.points.length).toBeGreaterThanOrEqual(3);
    expect(squatSeries.points.map((p) => p.date)).toEqual([...squatSeries.points.map((p) => p.date)].sort());
  });
});

describe('progress summary', () => {
  it('counts the last four weeks in the service', async () => {
    const s = await svc.getProgressSummary(CLIENT_IDS.sara);
    expect(s.from).toBe(addDays(TODAY, -27));
    expect(s.assigned).toBe(8); // six done, one skipped, today's
    expect(s.completed).toBe(6);
    expect(s.completionPct).toBe(75);
    expect(s.setsLogged).toBeGreaterThan(0);
    expect(s.weightLiftedKg).toBeGreaterThan(0);
    expect(s.streakWeeks).toBeGreaterThanOrEqual(0);
    expect(s.personalRecords).toBeGreaterThan(0);
  });

  it('is private to the client', async () => {
    await svc.signIn(CLIENT_IDS.sara);
    expect(await code(svc.getProgressSummary(CLIENT_IDS.karim))).toBe('forbidden');
  });
});

describe('packages', () => {
  it('derives remaining sessions and expiry state', async () => {
    const sara = (await svc.listPackages(CLIENT_IDS.sara))[0]!;
    expect(sara).toMatchObject({ sessionsRemaining: 2, state: 'expiring' });
    expect((await svc.listPackages(CLIENT_IDS.karim))[0]?.state).toBe('active');
    const expired = await svc.savePackage({ workspaceId: sara.workspaceId, clientId: CLIENT_IDS.youssef, name: 'Old', sessionsIncluded: 4, sessionsUsed: 1, expiresOn: addDays(TODAY, -3), paymentReceived: true });
    expect(expired.state).toBe('expired');
  });

  it('rejects impossible counts', async () => {
    const p = (await svc.listPackages(CLIENT_IDS.sara))[0]!;
    expect(await code(svc.savePackage({ ...p, sessionsUsed: 99 }))).toBe('invalid');
  });
});

describe('comments', () => {
  it('lets both sides post to a workout', async () => {
    const a = (await svc.listAssignments({ clientId: CLIENT_IDS.sara, from: '2000-01-01', to: '2100-01-01' })).find((x) => x.status === 'completed')!;
    await svc.addComment(a.id, 'Nice work');
    await svc.signIn(CLIENT_IDS.sara);
    await svc.addComment(a.id, 'Thanks!');
    const thread = await svc.listComments(a.id);
    expect(thread.at(-2)).toMatchObject({ authorRole: 'coach', body: 'Nice work' });
    expect(thread.at(-1)).toMatchObject({ authorRole: 'client', authorName: 'Sara Khaled' });
    expect(await code(svc.addComment(a.id, '   '))).toBe('invalid');
  });
});

describe('persistence', () => {
  it('survives a reload through storage', async () => {
    const store = new Map<string, string>();
    const kv = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    const a = new MockDataService({ storage: kv, latencyMs: [0, 0], today: () => TODAY });
    await a.signIn(COACH_ID);
    await a.createExercise({ name: 'Persisted', equipment: [], tags: [], measuredAs: 'reps' });
    const b = new MockDataService({ storage: kv, latencyMs: [0, 0], today: () => TODAY });
    expect(b.currentProfileId()).toBe(COACH_ID);
    expect((await b.listExercises({ search: 'persisted' })).length).toBe(1);
  });
});
