import { useEffect, useRef } from 'react';

interface Props {
  /** Width and height in CSS pixels. */
  size: number;
  /** 0 is calm, 1 is busy: faster spin, more swell and shimmer. Changes ease in and out. */
  energy?: number;
  particles?: number;
  className?: string;
}

const LIME = [201, 247, 17] as const;
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A sphere of drifting lime particles. Spin, swell and brightness follow `energy`, so the same orb
 * can rest quietly or work hard while the assistant thinks. Drawn on a canvas, paused off screen.
 */
export function ParticleOrb({ size, energy = 0, particles = 260, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const target = useRef(energy);
  target.current = energy;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Evenly spread points on a sphere (golden-angle spiral), each with its own phase.
    const pts = Array.from({ length: particles }, (_, i) => {
      const y = 1 - (i / (particles - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(th) * r, y, z: Math.sin(th) * r, ph: Math.random() * Math.PI * 2, sz: 0.6 + Math.random() * 0.9 };
    });

    let raf = 0;
    let last = performance.now();
    let angle = 0;
    let beat = 0;
    let level = target.current;
    const still = reduced();
    let presence = still ? 1 : 0; // eases the orb in from a small, faint start

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // Frame-rate independent exponential smoothing: same feel at 60 and 120 Hz.
      level += (target.current - level) * (1 - Math.exp(-2.4 * dt));
      presence += (1 - presence) * (1 - Math.exp(-4 * dt));
      angle += dt * (0.2 + level * 1.5);
      beat += dt * (1 + level * 1.8); // accumulated, so a change in energy never jumps the swell phase
      const R = size * 0.34 * (0.86 + presence * 0.14);
      const c = size / 2;
      ctx.globalAlpha = presence;
      ctx.clearRect(0, 0, size, size);

      // Soft glow behind the sphere.
      const glow = ctx.createRadialGradient(c, c, R * 0.2, c, c, c);
      glow.addColorStop(0, `rgba(${LIME[0]},${LIME[1]},${LIME[2]},${0.2 + level * 0.18})`);
      glow.addColorStop(0.55, `rgba(${LIME[0]},${LIME[1]},${LIME[2]},${0.05 + level * 0.05})`);
      glow.addColorStop(1, `rgba(${LIME[0]},${LIME[1]},${LIME[2]},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const tilt = 0.35;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of pts) {
        // Each particle breathes on its own beat; busier means a bigger, faster swell.
        const swell = 1 + Math.sin(beat + p.ph) * (0.035 + level * 0.09);
        const x0 = p.x * swell;
        const y0 = p.y * swell;
        const z0 = p.z * swell;
        const x1 = x0 * cosA + z0 * sinA;
        const z1 = -x0 * sinA + z0 * cosA;
        const y2 = y0 * cosT - z1 * sinT;
        const z2 = y0 * sinT + z1 * cosT;
        const depth = (z2 + 1) / 2; // 0 far, 1 near
        const px = c + x1 * R * (0.92 + depth * 0.16);
        const py = c + y2 * R * (0.92 + depth * 0.16);
        const a = 0.12 + depth * (0.65 + level * 0.25);
        const r = (0.5 + depth * 1.3) * p.sz * (size / 150 + 0.5);
        const w = depth > 0.75 ? 70 : 0; // near particles run slightly white
        ctx.fillStyle = `rgba(${LIME[0] + w},${LIME[1] + (w ? 8 : 0)},${LIME[2] + w},${a})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (!still) raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    raf = requestAnimationFrame(draw);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [size, particles]);

  return <canvas ref={ref} className={className} style={{ width: size, height: size }} aria-hidden="true" />;
}
