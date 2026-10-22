import type { Keypoint } from './pose-types';

interface Point2D {
  x: number;
  y: number;
}

/** Below this confidence a keypoint is treated as not visible, rather than trusted. */
const MIN_SCORE = 0.3;

export function point(points: Keypoint[], name: string): Point2D | null {
  const p = points.find((k) => k.name === name);
  return p && (p.score ?? 1) >= MIN_SCORE ? { x: p.x, y: p.y } : null;
}

/** The angle at `vertex`, between the rays to `a` and `c`, in degrees (0 = folded shut, 180 = straight). */
export function angleAt(a: Point2D, vertex: Point2D, c: Point2D): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: c.x - vertex.x, y: c.y - vertex.y };
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 180;
  const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Both sides of a left/right joint pair read separately, so a caller can tell a symmetric
 * movement (both sides bending together) from an asymmetric one (one side doing the work) —
 * something a single averaged angle can't distinguish. */
export function sidesAngle(points: Keypoint[], a: string, vertex: string, c: string): { left: number | null; right: number | null } {
  return {
    left: angleIfVisible(points, `left_${a}`, `left_${vertex}`, `left_${c}`),
    right: angleIfVisible(points, `right_${a}`, `right_${vertex}`, `right_${c}`),
  };
}

/**
 * The angle at a joint that comes in a left/right pair (knee, elbow, hip), averaging both sides
 * when both are confidently visible so a slight turn toward the camera doesn't lose the reading.
 */
export function sideAngle(points: Keypoint[], a: string, vertex: string, c: string): number | null {
  const { left, right } = sidesAngle(points, a, vertex, c);
  if (left !== null && right !== null) return (left + right) / 2;
  return left ?? right;
}

function angleIfVisible(points: Keypoint[], a: string, vertex: string, c: string): number | null {
  const pa = point(points, a);
  const pv = point(points, vertex);
  const pc = point(points, c);
  return pa && pv && pc ? angleAt(pa, pv, pc) : null;
}

/** The midpoint of a left/right joint pair (hip, shoulder), averaging both sides when both are
 * visible so the point tracks the body's centerline rather than one arbitrary side of it. */
export function sideMidpoint(points: Keypoint[], name: string): Point2D | null {
  const left = point(points, `left_${name}`);
  const right = point(points, `right_${name}`);
  if (left && right) return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  return left ?? right;
}

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** How far the torso leans from straight-up-and-down, in degrees — 0 is a standing-tall body
 * (shoulders stacked over hips), 90 is lying flat (shoulders level with hips, as in a plank).
 * The coarse signal that tells a squat apart from a push-up: not what a single limb angle is
 * doing, but which way the body as a whole is actually oriented. */
export function torsoTiltFromVertical(points: Keypoint[]): number | null {
  const hip = sideMidpoint(points, 'hip');
  const shoulder = sideMidpoint(points, 'shoulder');
  if (!hip || !shoulder) return null;
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return null;
  const cos = Math.min(1, Math.max(-1, -dy / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}
