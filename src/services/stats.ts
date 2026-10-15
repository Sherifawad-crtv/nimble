import { addDays, daysBetween, startOfWeek } from '../lib/date';
import type {
  Assignment,
  ExerciseProgress,
  ISODate,
  MeasuredAs,
  Package,
  PersonalRecord,
  ProgressSummary,
  SetResult,
  WorkoutLog,
} from '../types';
import { formatClock } from '../timer/engine';

interface Best {
  value: number;
  label: string;
}

const loadOf = (s: SetResult) => parseFloat(/[\d.]+/.exec(s.load ?? '')?.[0] ?? '0');

function bestOfSet(measured: MeasuredAs, s: SetResult): Best | null {
  switch (measured) {
    case 'weight_reps': {
      const load = loadOf(s);
      return load > 0 ? { value: load * 1000 + (s.reps ?? 0), label: `${s.reps ?? 1} × ${s.load}` } : null;
    }
    case 'reps':
      return s.reps ? { value: s.reps, label: `${s.reps} reps` } : null;
    case 'rounds':
      return s.reps ? { value: s.reps, label: `${s.reps} rounds` } : null;
    case 'time':
      return s.durationSec ? { value: s.durationSec, label: formatClock(s.durationSec) } : null;
    case 'distance':
      return s.distanceM ? { value: s.distanceM, label: `${s.distanceM} m` } : null;
  }
}

const UNITS: Record<MeasuredAs, string> = { weight_reps: 'kg', reps: 'reps', rounds: 'rounds', time: 's', distance: 'm' };

function chartValue(measured: MeasuredAs, s: SetResult): number {
  return measured === 'weight_reps' ? loadOf(s) : measured === 'time' ? (s.durationSec ?? 0) : measured === 'distance' ? (s.distanceM ?? 0) : (s.reps ?? 0);
}

interface Entry {
  exerciseId: string;
  exerciseName: string;
  measured: MeasuredAs;
  date: ISODate;
  sets: SetResult[];
}

function entriesFor(
  assignments: Assignment[],
  logs: WorkoutLog[],
  measuredOf: (exerciseId: string) => MeasuredAs,
): Entry[] {
  const out: Entry[] = [];
  for (const log of logs) {
    if (!log.completedAt) continue;
    const a = assignments.find((x) => x.id === log.assignmentId);
    if (!a) continue;
    for (const b of a.workout.blocks) {
      for (const it of b.items) {
        const result = log.itemResults.find((r) => r.itemId === it.id);
        if (result) out.push({ exerciseId: it.exerciseId, exerciseName: it.exerciseName, measured: measuredOf(it.exerciseId), date: a.date, sets: result.sets });
      }
    }
  }
  return out.sort((x, y) => x.date.localeCompare(y.date));
}

export function personalRecords(
  assignments: Assignment[],
  logs: WorkoutLog[],
  measuredOf: (exerciseId: string) => MeasuredAs,
): PersonalRecord[] {
  const best = new Map<string, Best & { exerciseName: string; date: ISODate }>();
  for (const e of entriesFor(assignments, logs, measuredOf)) {
    for (const s of e.sets) {
      const b = bestOfSet(e.measured, s);
      const cur = best.get(e.exerciseId);
      if (b && (!cur || b.value > cur.value)) best.set(e.exerciseId, { ...b, exerciseName: e.exerciseName, date: e.date });
    }
  }
  return [...best.entries()]
    .map(([exerciseId, b]) => ({ exerciseId, exerciseName: b.exerciseName, label: b.label, achievedOn: b.date }))
    .sort((a, b) => b.achievedOn.localeCompare(a.achievedOn) || a.exerciseName.localeCompare(b.exerciseName));
}

export function exerciseProgress(
  assignments: Assignment[],
  logs: WorkoutLog[],
  measuredOf: (exerciseId: string) => MeasuredAs,
): ExerciseProgress[] {
  const by = new Map<string, ExerciseProgress>();
  for (const e of entriesFor(assignments, logs, measuredOf)) {
    const value = Math.max(0, ...e.sets.map((s) => chartValue(e.measured, s)));
    if (value <= 0) continue;
    const entry = by.get(e.exerciseId) ?? { exerciseId: e.exerciseId, exerciseName: e.exerciseName, unit: UNITS[e.measured], points: [] };
    entry.points.push({ date: e.date, value });
    by.set(e.exerciseId, entry);
  }
  return [...by.values()].sort((a, b) => b.points.length - a.points.length || a.exerciseName.localeCompare(b.exerciseName));
}

const SUMMARY_DAYS = 28;

/** Consistency over the last four weeks. */
/** Sum of reps × load over every completed weighted set, all time. */
export function weightLifted(assignments: Assignment[], logs: WorkoutLog[], measuredOf: (exerciseId: string) => MeasuredAs): number {
  let total = 0;
  for (const e of entriesFor(assignments, logs, measuredOf)) {
    if (e.measured !== 'weight_reps') continue;
    for (const s of e.sets) total += loadOf(s) * (s.reps ?? 0);
  }
  return Math.round(total);
}

/** Consecutive weeks with a completed workout. A week still in progress without one does not break the run. */
export function weekStreak(assignments: Assignment[], today: ISODate): number {
  const weeks = new Set(assignments.filter((a) => a.status === 'completed').map((a) => startOfWeek(a.date, 1)));
  let week = startOfWeek(today, 1);
  if (!weeks.has(week)) week = addDays(week, -7);
  let n = 0;
  while (weeks.has(week)) {
    n++;
    week = addDays(week, -7);
  }
  return n;
}

export function progressSummary(
  assignments: Assignment[],
  logs: WorkoutLog[],
  measuredOf: (exerciseId: string) => MeasuredAs,
  today: ISODate,
): ProgressSummary {
  const to = today;
  const from = addDays(to, -(SUMMARY_DAYS - 1));
  const inWindow = assignments.filter((a) => a.date >= from && a.date <= to);
  const ids = new Set(inWindow.map((a) => a.id));
  const completed = inWindow.filter((a) => a.status === 'completed').length;
  const setsLogged = logs.filter((l) => ids.has(l.assignmentId)).reduce((n, l) => n + l.itemResults.reduce((m, r) => m + r.sets.length, 0), 0);
  const records = personalRecords(assignments, logs, measuredOf).filter((r) => r.achievedOn >= from && r.achievedOn <= to).length;
  return {
    from,
    to,
    assigned: inWindow.length,
    completed,
    completionPct: inWindow.length ? Math.round((completed / inWindow.length) * 100) : 0,
    setsLogged,
    personalRecords: records,
    weightLiftedKg: weightLifted(assignments, logs, measuredOf),
    streakWeeks: weekStreak(assignments, today),
  };
}

const EXPIRING_WITHIN_DAYS = 14;

/** Sessions left and whether the package is active, expiring soon or expired. */
export function withPackageState(p: Omit<Package, 'sessionsRemaining' | 'state'>, today: ISODate): Package {
  const left = daysBetween(today, p.expiresOn);
  return {
    ...p,
    sessionsRemaining: Math.max(0, p.sessionsIncluded - p.sessionsUsed),
    state: left < 0 ? 'expired' : left <= EXPIRING_WITHIN_DAYS ? 'expiring' : 'active',
  };
}
