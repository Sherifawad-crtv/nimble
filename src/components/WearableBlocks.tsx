import { BrandChip, CapabilityList, MetricTile, ReadinessIndicator, StatusChip } from '../design';
import { keys } from '../hooks/keys';
import { useData } from '../hooks/data';
import { addDays, todayISO } from '../lib/date';
import { t } from '../i18n';
import type { DailyMetrics, Id, WearableCapability, WearableConnection, WearableProvider, WorkoutLog } from '../types';
import { DataBoundary } from './DataBoundary';

export const BRAND: Record<WearableProvider, string> = {
  garmin: 'Garmin',
  whoop: 'Whoop',
  oura: 'Oura',
  fitbit: 'Fitbit',
  polar: 'Polar',
  strava: 'Strava',
};

export const capabilityLabel = (c: WearableCapability): string => t(`capability.${c}`);

const has = (conn: WearableConnection, ...caps: WearableCapability[]) => caps.some((c) => conn.capabilities.includes(c));

const hoursMinutes = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;

/** Recovery and sleep for the coach's client page. Renders only what the device provides. */
export function RecoveryBlock({ clientId }: { clientId: Id }) {
  const today = todayISO();
  const conn = useData(keys.wearable(clientId), (s) => s.getWearableConnection(clientId));
  const metrics = useData(keys.metrics(clientId, addDays(today, -6), today), (s) => s.getDailyMetrics(clientId, addDays(today, -6), today), {
    enabled: conn.data !== undefined && conn.data !== null && conn.data.status === 'connected',
  });

  if (conn.isPending) return null;
  if (conn.isError) return <DataBoundary query={conn} inline>{() => null}</DataBoundary>;
  const c = conn.data;
  if (!c || c.status === 'disconnected') return null;
  const brand = BRAND[c.provider];
  const recovery = has(c, 'sleep', 'resting_hr', 'hrv');
  const body = c.status === 'error' ? null : (
    <DataBoundary query={metrics} skeleton="card" inline isEmpty={(d) => d.length === 0}>
      {(days) => <RecoveryTiles days={days} conn={c} brand={brand} />}
    </DataBoundary>
  );

  return (
    <section className="app-section" aria-label={t('wearable.recovery.title')}>
      <div className="app-section-head">
        <h2 className="t-eyebrow app-h2">{t('wearable.recovery.title')}</h2>
        <StatusChip kind="wearable" value={c.status} label={`${brand} · ${t(`wearable.status.${c.status}`)}`} />
      </div>
      {c.status === 'error' && <p className="t-body v-muted">{t('wearable.error.coach', { brand })}</p>}
      {recovery && body}
      {!recovery && c.status === 'connected' && <p className="t-body v-muted">{t('wearable.noRecovery', { brand })}</p>}
      <ReadinessForClient clientId={clientId} enabled={recovery && c.status === 'connected'} />
    </section>
  );
}

function RecoveryTiles({ days, conn, brand }: { days: DailyMetrics[]; conn: WearableConnection; brand: string }) {
  const last = days.at(-1);
  if (!last) return null;
  const week = <T extends number>(pick: (d: DailyMetrics) => T | undefined) => {
    const v = days.map(pick).filter((x): x is T => x !== undefined);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : undefined;
  };
  const avgSleep = week((d) => d.sleepMinutes);
  return (
    <>
      <div className="app-tiles">
        <MetricTile kind="sleep" label={t('metric.sleep')} value={last.sleepMinutes === undefined ? null : hoursMinutes(last.sleepMinutes)} brand={brand} />
        <MetricTile kind="rhr" value={last.restingHr ?? null} unit="bpm" brand={brand} />
        <MetricTile kind="hrv" value={last.hrv ?? null} unit="ms" brand={brand} />
        {has(conn, 'strain') && <MetricTile kind="strain" value={last.strain ?? null} brand={brand} />}
        {has(conn, 'calories') && <MetricTile kind="calories" value={last.caloriesBurned ?? null} unit="kcal" brand={brand} />}
      </div>
      {avgSleep !== undefined && <p className="t-label v-muted">{t('wearable.sleepAverage', { time: hoursMinutes(avgSleep), brand })}</p>}
    </>
  );
}

function ReadinessForClient({ clientId, enabled }: { clientId: Id; enabled: boolean }) {
  const r = useData(keys.readiness(clientId), (s) => s.getReadiness(clientId), { enabled });
  if (!enabled || !r.data) return null;
  return <ReadinessIndicator level={r.data.level} brand={BRAND[r.data.provider]} basedOn={r.data.basedOn.map(capabilityLabel)} />;
}

/** The client's own Today hint. */
export function ReadinessHint({ clientId }: { clientId: Id }) {
  const r = useData(keys.readiness(clientId), (s) => s.getReadiness(clientId));
  if (!r.data) return null;
  return <ReadinessIndicator level={r.data.level} brand={BRAND[r.data.provider]} basedOn={r.data.basedOn.map(capabilityLabel)} />;
}

/** Heart rate, calories and strain recorded for one workout. Shows nothing when the device sent nothing. */
export function WorkoutWearable({ log }: { log: WorkoutLog | null | undefined }) {
  const w = log?.wearable;
  if (!w) return null;
  const brand = w.provider.charAt(0).toUpperCase() + w.provider.slice(1);
  const tiles = [
    w.avgHr !== undefined && <MetricTile key="avg" kind="avg_hr" value={w.avgHr} unit="bpm" brand={brand} />,
    w.maxHr !== undefined && <MetricTile key="max" kind="max_hr" value={w.maxHr} unit="bpm" brand={brand} />,
    w.caloriesBurned !== undefined && <MetricTile key="cal" kind="calories" value={w.caloriesBurned} unit="kcal" brand={brand} />,
    w.strain !== undefined && <MetricTile key="str" kind="strain" value={w.strain} brand={brand} />,
  ].filter(Boolean);
  if (!tiles.length) return null;
  return (
    <section className="app-section" aria-label={t('wearable.workout.title')}>
      <h2 className="t-eyebrow app-h2">{t('wearable.workout.title')}</h2>
      <div className="app-tiles">{tiles}</div>
    </section>
  );
}

export function ConnectionSummary({ conn }: { conn: WearableConnection }) {
  return (
    <>
      <div className="app-section-head">
        <span className="t-body-strong">{BRAND[conn.provider]}</span>
        <BrandChip brand={BRAND[conn.provider]} />
      </div>
      <p className="t-label v-muted">{t('wearable.provides')}</p>
      <CapabilityList items={conn.capabilities.map(capabilityLabel)} />
    </>
  );
}
