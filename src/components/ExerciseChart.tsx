import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Segmented } from '../design';
import { formatDay, t } from '../i18n';
import { columnPath, compact, linear, nearest, niceAxis, smoothPath } from '../lib/chart';
import { readPref, writePref } from '../lib/prefs';
import { formatClock } from '../timer/engine';
import type { ExerciseProgress } from '../types';

type View = 'line' | 'bars' | 'table';

const VIEW_KEY = 'nimble.chartView';
const VIEWS: View[] = ['line', 'bars', 'table'];
const HEIGHT = 176;
const PAD = { top: 12, right: 40, bottom: 28, left: 2 };
const MAX_BAR = 24;

const savedView = (): View => {
  const v = readPref(VIEW_KEY);
  return VIEWS.includes(v as View) ? (v as View) : 'line';
};

/** Seconds read as a clock (0:34); everything else as a plain number with its unit beside it. */
const isClock = (unit: string) => unit === 's';
const axisLabel = (unit: string, v: number) => (isClock(unit) ? formatClock(v) : compact(v));
const valueText = (unit: string, v: number) => (isClock(unit) ? formatClock(v) : `${compact(v)} ${unit}`);

/** The width of an element, kept current as it resizes. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.round(el.getBoundingClientRect().width) || 320);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(Math.round(entry.contentRect.width) || 320));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * One exercise's history as a clean card: the latest value up top, then a line, bars or a table.
 * Dragging across the chart (or arrow keys on it) reads out any session. The table is always
 * available, so no value is reachable only by hovering.
 */
export function ExerciseChart({ progress }: { progress: ExerciseProgress }) {
  const { exerciseName, unit, points } = progress;
  const [view, setView] = useState<View>(savedView);
  const [active, setActive] = useState<number | null>(null);
  const [wrap, width] = useWidth();
  const readoutId = useId();

  const last = points.length - 1;
  const shown = active ?? last;
  const current = points[shown];
  const plotW = Math.max(40, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const baseY = PAD.top + plotH;

  const geometry = useMemo(() => {
    const values = points.map((p) => p.value);
    const axis = niceAxis(values, { fromZero: view === 'bars' });
    const y = linear([axis.min, axis.max], [baseY, PAD.top]);
    let xs: number[];
    let barW = 0;
    if (view === 'bars') {
      const slot = plotW / points.length;
      barW = Math.max(4, Math.min(MAX_BAR, slot * 0.6));
      xs = points.map((_, i) => PAD.left + slot * i + slot / 2);
    } else {
      // Honest time scale: a long gap between sessions shows as a long gap.
      const times = points.map((p) => Date.parse(`${p.date}T12:00:00`));
      const inset = 8;
      const x = linear([Math.min(...times), Math.max(...times)], [PAD.left + inset, PAD.left + plotW - inset]);
      xs = times.map(x);
    }
    return { axis, y, xs, barW };
  }, [points, view, plotW, baseY]);

  const { axis, y, xs, barW } = geometry;
  const pick = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setActive(nearest(xs, e.clientX - box.left + PAD.left));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const move = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (move) {
      e.preventDefault();
      setActive(Math.max(0, Math.min(last, shown + move)));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : last);
    } else if (e.key === 'Escape') setActive(null);
  };

  const choose = (id: string) => {
    const next = VIEWS.includes(id as View) ? (id as View) : 'line';
    setView(next);
    setActive(null);
    writePref(VIEW_KEY, next);
  };

  // Dates under the plot: the first and last, plus the middle when there is room.
  const labelAt = points.length <= 4 ? points.map((_, i) => i) : [0, Math.round(last / 2), last];
  const anchorOf = (i: number) => (i === 0 ? 'start' : i === last ? 'end' : 'middle');
  const xLabelX = (i: number) => (i === 0 ? PAD.left : i === last ? PAD.left + plotW : (xs[i] as number));

  const linePts = points.map((p, i) => ({ x: xs[i] as number, y: y(p.value) }));
  const line = smoothPath(linePts);
  const firstPt = linePts[0];
  const lastPt = linePts[last];
  const area = firstPt && lastPt ? `${line}L${lastPt.x},${baseY}L${firstPt.x},${baseY}Z` : '';
  const summary = current ? t('chart.summary', { name: exerciseName, n: points.length, value: valueText(unit, (points[last] as { value: number }).value) }) : exerciseName;

  return (
    <section className="app-chart" aria-label={exerciseName}>
      <header className="app-chart-head">
        <h3 className="t-heading app-chart-title">{exerciseName}</h3>
        <Segmented
          options={[
            { id: 'line', label: t('chart.view.line') },
            { id: 'bars', label: t('chart.view.bars') },
            { id: 'table', label: t('chart.view.table') },
          ]}
          value={view}
          onChange={choose}
        />
      </header>

      {current && (
        <div className="app-chart-readout" id={readoutId} aria-live="polite">
          <div className="app-chart-value">
            <span className="t-title app-chart-num">{isClock(unit) ? formatClock(current.value) : compact(current.value)}</span>
            {!isClock(unit) && <span className="t-label app-chart-unit">{unit}</span>}
          </div>
          <p className="t-caption app-chart-when">{active === null ? `${t('chart.latest')} · ${formatDay(current.date)}` : formatDay(current.date)}</p>
        </div>
      )}

      {view === 'table' ? (
        <div className="app-chart-table-wrap">
          <table className="app-chart-table">
            <caption className="v-sr">{exerciseName}</caption>
            <thead>
              <tr>
                <th scope="col">{t('chart.col.date')}</th>
                <th scope="col">{t('chart.col.value')}</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <th scope="row">{formatDay(p.date)}</th>
                  <td>{valueText(unit, p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrap} className="app-chart-plot">
          <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={summary} aria-describedby={readoutId} tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)}>
            {axis.ticks.map((tick) => (
              <g key={tick}>
                <line className="app-chart-grid" x1={PAD.left} x2={PAD.left + plotW} y1={y(tick)} y2={y(tick)} />
                <text className="app-chart-tick" x={width} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                  {axisLabel(unit, tick)}
                </text>
              </g>
            ))}

            {view === 'line' && (
              <>
                <path className="app-chart-area" d={area} />
                <path className="app-chart-line" d={line} />
                {active !== null && <line className="app-chart-cross" x1={xs[shown]} x2={xs[shown]} y1={PAD.top} y2={baseY} />}
                <circle className="app-chart-ring" cx={xs[shown]} cy={y((current as { value: number }).value)} r={6} />
                <circle className="app-chart-dot" cx={xs[shown]} cy={y((current as { value: number }).value)} r={4} />
              </>
            )}

            {view === 'bars' &&
              points.map((p, i) => (
                <path key={p.date} className={i === shown ? 'app-chart-bar on' : 'app-chart-bar'} d={columnPath((xs[i] as number) - barW / 2, barW, y(p.value), baseY)} />
              ))}

            {labelAt.map((i) => (
              <text key={i} className="app-chart-tick" x={xLabelX(i)} y={HEIGHT - 6} textAnchor={anchorOf(i)}>
                {formatDay((points[i] as { date: string }).date)}
              </text>
            ))}

            <rect className="app-chart-hit" x={PAD.left} y={0} width={plotW} height={baseY} onPointerDown={pick} onPointerMove={pick} onPointerLeave={() => setActive(null)} onPointerCancel={() => setActive(null)} />
          </svg>
        </div>
      )}
    </section>
  );
}
