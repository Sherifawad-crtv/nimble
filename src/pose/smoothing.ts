import type { Keypoint } from './pose-types';

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    this.s = this.y === null ? value : alpha * value + (1 - alpha) * (this.s as number);
    this.y = value;
    return this.s;
  }

  lastValue(): number | null {
    return this.y;
  }
}

function smoothingFactor(deltaSec: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * deltaSec;
  return r / (r + 1);
}

/**
 * The 1€ Filter (Casiez, Roussel & Vogel, 2012) — the standard low-latency smoothing filter for
 * human motion and UI tracking. Unlike a fixed moving average, its cutoff adapts to how fast the
 * signal is moving: heavy smoothing while a joint is nearly still (kills jitter), lighter
 * smoothing during fast motion (so a real rep doesn't visibly lag behind the actual movement).
 *
 * minCutoff/beta here are the filter's own commonly-cited starting defaults, not values tuned
 * against this app's camera or model — if the skeleton still feels jittery or starts lagging
 * noticeably behind fast reps, these two numbers are what to adjust (raise minCutoff for less
 * jitter at rest, raise beta for less lag during fast motion).
 */
class OneEuroFilter {
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTimeMs: number | null = null;

  constructor(
    private minCutoff = 1.0,
    private beta = 0.007,
    private dCutoff = 1.0,
  ) {}

  filter(value: number, timestampMs: number): number {
    if (this.lastTimeMs === null) {
      this.lastTimeMs = timestampMs;
      this.xFilter.filter(value, 1);
      this.dxFilter.filter(0, 1);
      return value;
    }
    const dt = Math.max((timestampMs - this.lastTimeMs) / 1000, 1e-3);
    this.lastTimeMs = timestampMs;

    const prev = this.xFilter.lastValue();
    const derivative = prev === null ? 0 : (value - prev) / dt;
    const smoothedDerivative = this.dxFilter.filter(derivative, smoothingFactor(dt, this.dCutoff));

    const cutoff = this.minCutoff + this.beta * Math.abs(smoothedDerivative);
    return this.xFilter.filter(value, smoothingFactor(dt, cutoff));
  }
}

/**
 * Smooths every keypoint's position across frames, independently per joint, with its own filter
 * state per name. Scores and names pass through unchanged — only x/y, which is what actually
 * reads as flicker on screen and as noise in the angle math the rep trackers run on.
 */
export class KeypointSmoother {
  private filters = new Map<string, { x: OneEuroFilter; y: OneEuroFilter }>();

  smooth(points: Keypoint[], timestampMs: number): Keypoint[] {
    return points.map((p) => {
      if (!p.name) return p;
      let f = this.filters.get(p.name);
      if (!f) {
        f = { x: new OneEuroFilter(), y: new OneEuroFilter() };
        this.filters.set(p.name, f);
      }
      return { ...p, x: f.x.filter(p.x, timestampMs), y: f.y.filter(p.y, timestampMs) };
    });
  }
}
