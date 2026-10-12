import { addDays, daysBetween } from '../../lib/date';
import type { DailyMetrics, ISODate, WearableCapability, WearableProvider } from '../../types';

/** What each brand reports. The real service reads this from OpenWearables. */
export const PROVIDER_CAPABILITIES: Record<WearableProvider, WearableCapability[]> = {
  garmin: ['sleep', 'resting_hr', 'hrv', 'workout_hr', 'calories', 'strain', 'live_hr'],
  whoop: ['sleep', 'resting_hr', 'hrv', 'workout_hr', 'calories', 'strain'],
  oura: ['sleep'],
  fitbit: ['sleep', 'resting_hr', 'workout_hr', 'calories'],
  polar: ['workout_hr', 'calories'],
  strava: ['workout_hr', 'calories'],
};




const wobble = (seed: string, spread: number) => {
  const h = [...seed].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
  return ((h % 1000) / 1000 - 0.5) * 2 * spread;
};

/** Deterministic daily numbers, only for the fields the device provides. */
export function metricsFor(
  provider: WearableProvider,
  caps: WearableCapability[],
  from: ISODate,
  to: ISODate,
): DailyMetrics[] {
  const out: DailyMetrics[] = [];
  for (let i = 0; i <= daysBetween(from, to); i++) {
    const date = addDays(from, i);
    const key = `${provider}${date}`;
    out.push({
      date,
      provider,
      ...(caps.includes('sleep') && { sleepMinutes: Math.round(430 + wobble(`${key}s`, 70)) }),
      ...(caps.includes('resting_hr') && { restingHr: Math.round(56 + wobble(`${key}r`, 6)) }),
      ...(caps.includes('hrv') && { hrv: Math.round(62 + wobble(`${key}h`, 18)) }),
      ...(caps.includes('strain') && { strain: Math.round((10 + wobble(`${key}t`, 4)) * 10) / 10 }),
      ...(caps.includes('calories') && { caloriesBurned: Math.round(2300 + wobble(`${key}c`, 350)) }),
    });
  }
  return out;
}
