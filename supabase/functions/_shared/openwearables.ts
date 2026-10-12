// Client for a self-hosted Open Wearables server (https://github.com/the-momentum/open-wearables),
// plus the sync that turns its normalized summaries into Origin's daily metrics.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.4';
import { HttpError } from './http.ts';

export type Provider = 'garmin' | 'whoop' | 'oura' | 'fitbit' | 'polar' | 'strava';
export const PROVIDERS: Provider[] = ['garmin', 'whoop', 'oura', 'fitbit', 'polar', 'strava'];

/** What each brand is expected to report, shown before the first sync lands. Live HR is not verified, so never listed. */
const EXPECTED: Record<Provider, string[]> = {
  garmin: ['sleep', 'resting_hr', 'hrv', 'workout_hr', 'calories'],
  whoop: ['sleep', 'resting_hr', 'hrv', 'workout_hr', 'calories', 'strain'],
  oura: ['sleep', 'resting_hr', 'hrv', 'calories'],
  fitbit: ['sleep', 'resting_hr', 'hrv', 'workout_hr', 'calories'],
  polar: ['sleep', 'workout_hr', 'calories'],
  strava: ['workout_hr', 'calories'],
};

function config() {
  const base = Deno.env.get('OW_API_URL');
  const key = Deno.env.get('OW_API_KEY');
  if (!base || !key) throw new HttpError(503, 'unavailable', 'Wearable connections are not set up yet.');
  return { base: base.replace(/\/$/, ''), key };
}

async function ow<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { base, key } = config();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'X-Open-Wearables-API-Key': key, 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers ?? {}) },
  });
  if (res.status === 404) throw new HttpError(404, 'not_found', 'Not found on the wearable server.');
  if (!res.ok) {
    console.error('open wearables', path, res.status, await res.text());
    throw new HttpError(502, 'unavailable', 'The wearable service did not respond. Try again in a moment.');
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

interface OwUser {
  id: string;
  external_user_id: string | null;
}

/** Finds or creates the Open Wearables user for an Origin client (external_user_id = profile id). */
export async function ensureUser(client: { id: string; name: string; email: string }): Promise<string> {
  const found = await ow<{ items: OwUser[] }>(`/api/v1/users?external_user_id=${encodeURIComponent(client.id)}&limit=1`);
  const hit = found.items.find((u) => u.external_user_id === client.id);
  if (hit) return hit.id;
  const [first, ...rest] = client.name.split(' ');
  const created = await ow<OwUser>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify({ external_user_id: client.id, email: client.email, first_name: first ?? null, last_name: rest.join(' ') || null }),
  });
  return created.id;
}

export async function authorizationUrl(provider: Provider, owUserId: string, redirectUri: string): Promise<string> {
  const q = new URLSearchParams({ user_id: owUserId, redirect_uri: redirectUri });
  const r = await ow<{ authorization_url: string }>(`/api/v1/oauth/${provider}/authorize?${q}`);
  return r.authorization_url;
}

export async function disconnect(owUserId: string, provider: Provider): Promise<void> {
  try {
    await ow(`/api/v1/users/${owUserId}/connections/${provider}`, { method: 'DELETE' });
  } catch (e) {
    if (!(e instanceof HttpError && e.code === 'not_found')) throw e;
  }
}

interface Page<T> {
  data: T[];
  pagination: { next_cursor: string | null; has_more: boolean };
}

async function all<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i++) {
    const q = new URLSearchParams({ ...params, limit: '100', ...(cursor ? { cursor } : {}) });
    const page = await ow<Page<T>>(`${path}?${q}`);
    out.push(...page.data);
    if (!page.pagination?.has_more || !page.pagination.next_cursor) break;
    cursor = page.pagination.next_cursor;
  }
  return out;
}

interface Connection {
  provider: string;
  status: 'active' | 'revoked' | 'expired';
}
interface Sleep {
  date: string;
  duration_minutes: number | null;
  total_duration_minutes: number | null;
  avg_hrv_rmssd_ms: number | null;
  avg_hrv_sdnn_ms: number | null;
}
interface Recovery {
  date: string;
  resting_heart_rate_bpm: number | null;
  avg_hrv_rmssd_ms: number | null;
  avg_hrv_sdnn_ms: number | null;
}
interface Activity {
  date: string;
  total_calories_kcal: number | null;
  active_calories_kcal: number | null;
  heart_rate: { min_bpm: number | null } | null;
}
interface Workout {
  id: string;
  start_time: string;
  end_time: string;
  calories_kcal: number | null;
  avg_heart_rate_bpm: number | null;
  max_heart_rate_bpm: number | null;
}
interface Score {
  category: string;
  value: number | null;
  recorded_at: string;
}

interface Day {
  sleep_minutes?: number;
  resting_hr?: number;
  hrv?: number;
  strain?: number;
  calories_burned?: number;
}

const DAYS = 30;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Pulls the last 30 days for one client from Open Wearables and stores the summaries Origin shows.
 * Raw data stays in Open Wearables. Capabilities reflect what actually arrived.
 */
export async function syncClient(db: SupabaseClient, clientId: string): Promise<void> {
  const { data: conn } = await db.from('wearable_connections').select('*').eq('client_id', clientId).maybeSingle();
  if (!conn?.ow_user_id) return;
  const provider = conn.provider as Provider;
  const owUser = conn.ow_user_id as string;

  const connections = await ow<Connection[]>(`/api/v1/users/${owUser}/connections`);
  const live = connections.find((c) => c.provider === provider);
  const status = !live ? (conn.status === 'connected' ? 'disconnected' : conn.status) : live.status === 'active' ? 'connected' : 'error';
  if (status !== 'connected') {
    await db.from('wearable_connections').update({ status, updated_at: new Date().toISOString() }).eq('client_id', clientId);
    return;
  }

  const end = new Date();
  const start = new Date(end.getTime() - DAYS * 86_400_000);
  const range = { start_date: isoDate(start), end_date: isoDate(end) };
  const base = `/api/v1/users/${owUser}`;
  const [sleep, recovery, activity, workouts, strain] = await Promise.all([
    all<Sleep>(`${base}/summaries/sleep`, range),
    all<Recovery>(`${base}/summaries/recovery`, range),
    all<Activity>(`${base}/summaries/activity`, range),
    all<Workout>(`${base}/events/workouts`, range),
    ow<Page<Score>>(`${base}/health-scores?${new URLSearchParams({ ...range, category: 'strain', limit: '200' })}`).then((p) => p.data),
  ]);

  const days = new Map<string, Day>();
  const day = (d: string) => (days.get(d) ?? days.set(d, {}).get(d)) as Day;
  for (const s of sleep) {
    const minutes = s.duration_minutes ?? s.total_duration_minutes;
    if (minutes) day(s.date).sleep_minutes = minutes;
    const hrv = s.avg_hrv_rmssd_ms ?? s.avg_hrv_sdnn_ms;
    if (hrv) day(s.date).hrv = Math.round(hrv);
  }
  for (const r of recovery) {
    if (r.resting_heart_rate_bpm) day(r.date).resting_hr = r.resting_heart_rate_bpm;
    const hrv = r.avg_hrv_rmssd_ms ?? r.avg_hrv_sdnn_ms;
    if (hrv) day(r.date).hrv = Math.round(hrv);
  }
  for (const a of activity) {
    const kcal = a.total_calories_kcal ?? a.active_calories_kcal;
    if (kcal) day(a.date).calories_burned = Math.round(kcal);
    if (!day(a.date).resting_hr && a.heart_rate?.min_bpm) day(a.date).resting_hr = a.heart_rate.min_bpm;
  }
  for (const s of strain) if (s.value !== null) day(s.recorded_at.slice(0, 10)).strain = Math.round(s.value * 10) / 10;

  const rows = [...days.entries()]
    .filter(([, d]) => Object.keys(d).length > 0)
    .map(([date, d]) => ({ client_id: clientId, workspace_id: conn.workspace_id, date, provider, ...d }));
  if (rows.length) await db.from('daily_metrics').upsert(rows, { onConflict: 'client_id,date,provider' });

  const wRows = workouts.map((w) => ({
    id: w.id,
    client_id: clientId,
    workspace_id: conn.workspace_id,
    provider,
    start_time: w.start_time,
    end_time: w.end_time,
    avg_hr: w.avg_heart_rate_bpm,
    max_hr: w.max_heart_rate_bpm,
    calories_burned: w.calories_kcal === null ? null : Math.round(w.calories_kcal),
  }));
  if (wRows.length) await db.from('wearable_workouts').upsert(wRows, { onConflict: 'id' });

  const seen = new Set<string>();
  for (const d of days.values()) {
    if (d.sleep_minutes) seen.add('sleep');
    if (d.resting_hr) seen.add('resting_hr');
    if (d.hrv) seen.add('hrv');
    if (d.calories_burned) seen.add('calories');
    if (d.strain) seen.add('strain');
  }
  if (workouts.some((w) => w.avg_heart_rate_bpm)) seen.add('workout_hr');
  if (workouts.some((w) => w.calories_kcal)) seen.add('calories');
  const capabilities = seen.size ? [...seen] : EXPECTED[provider];

  await db
    .from('wearable_connections')
    .update({ status: 'connected', capabilities, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('client_id', clientId);
}

export const isProvider = (p: unknown): p is Provider => typeof p === 'string' && (PROVIDERS as string[]).includes(p);
