import { describe, expect, it } from 'vitest';
import { weekStreak } from './stats';
import type { Assignment } from '../types';

const done = (date: string) => ({ date, status: 'completed' }) as Assignment;

describe('weekStreak', () => {
  // 2026-10-14 is a Wednesday
  it('counts consecutive weeks', () => {
    expect(weekStreak([done('2026-10-13'), done('2026-10-06'), done('2026-09-29')], '2026-10-14')).toBe(3);
  });
  it('does not break on an empty current week', () => {
    expect(weekStreak([done('2026-10-06'), done('2026-09-30')], '2026-10-14')).toBe(2);
  });
  it('breaks on a skipped week', () => {
    expect(weekStreak([done('2026-10-13'), done('2026-09-29')], '2026-10-14')).toBe(1);
  });
  it('is zero without completed workouts', () => {
    expect(weekStreak([], '2026-10-14')).toBe(0);
  });
});
