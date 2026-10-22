import { distance, sideAngle, sideMidpoint } from './angles';
import { t } from '../i18n';
import type { FormFeedback, Keypoint, MovementTracker, RepUpdate } from './pose-types';

export type PoseMovement = 'squat' | 'pushup' | 'pullup';

/**
 * Name patterns matched against the exercise library, in order. Matched purely on the mechanics
 * of the movement — not whether it's a bodyweight set or a loaded one measured in kg, since the
 * whole point of watching form is catching a loaded set breaking down before the weight comes
 * back down to something cleaner.
 */
const PATTERNS: [RegExp, PoseMovement][] = [
  [/push[\s-]?up/i, 'pushup'],
  [/pull[\s-]?up/i, 'pullup'],
  [/squat/i, 'squat'],
];

export function detectMovement(exerciseName: string): PoseMovement | null {
  for (const [pattern, movement] of PATTERNS) if (pattern.test(exerciseName)) return movement;
  return null;
}

/**
 * Whether the joints this movement actually reads are visible — not just some count of the 17
 * keypoints. A close-up face-and-shoulders selfie can confidently show six points and still have
 * nothing useful for a squat, which needs the hips and knees that aren't anywhere in that frame.
 */
export function isPoseUsable(movement: PoseMovement, points: Keypoint[]): boolean {
  if (movement === 'squat') return sideAngle(points, 'hip', 'knee', 'ankle') !== null;
  if (movement === 'pullup') return sideAngle(points, 'shoulder', 'elbow', 'wrist') !== null && sideMidpoint(points, 'hip') !== null && sideMidpoint(points, 'shoulder') !== null;
  return sideAngle(points, 'shoulder', 'elbow', 'wrist') !== null && sideAngle(points, 'shoulder', 'hip', 'ankle') !== null;
}

type Phase = 'up' | 'down';

/** A rep tracker for a joint that opens past `upThreshold` at the top and closes past
 * `downThreshold` at the bottom, counting one rep per full down-then-up cycle. */
function hysteresisTracker(opts: {
  angle: (points: Keypoint[]) => number | null;
  upThreshold: number;
  downThreshold: number;
  onRepComplete: (minAngle: number) => FormFeedback;
}): MovementTracker {
  let phase: Phase = 'up';
  let minAngle = 180;
  return {
    reset() {
      phase = 'up';
      minAngle = 180;
    },
    update(points): RepUpdate {
      const angle = opts.angle(points);
      if (angle === null) return { repCompleted: false, feedback: null };
      if (phase === 'up') {
        if (angle < opts.downThreshold) {
          phase = 'down';
          minAngle = angle;
        }
        return { repCompleted: false, feedback: null };
      }
      minAngle = Math.min(minAngle, angle);
      if (angle <= opts.upThreshold) return { repCompleted: false, feedback: null };
      phase = 'up';
      const feedback = opts.onRepComplete(minAngle);
      minAngle = 180;
      return { repCompleted: true, feedback };
    },
  };
}

function createSquatTracker(): MovementTracker {
  return hysteresisTracker({
    angle: (points) => sideAngle(points, 'hip', 'knee', 'ankle'),
    upThreshold: 160,
    downThreshold: 120,
    onRepComplete: (minAngle) => (minAngle <= 100 ? { status: 'good', message: t('pose.squat.good') } : { status: 'warn', message: t('pose.squat.shallow') }),
  });
}

/** Push-ups need a second signal beyond the hinge angle: a sagging or piked hip is a form fault
 * even on a rep that reaches full depth, so the hip-line angle is tracked alongside the elbow. */
function createPushupTracker(): MovementTracker {
  const ELBOW_UP = 155;
  const ELBOW_DOWN = 110;
  const DEPTH_GOOD = 95;
  const BODY_LINE_MIN = 155;
  let phase: Phase = 'up';
  let minElbow = 180;
  let minBodyLine = 180;
  return {
    reset() {
      phase = 'up';
      minElbow = 180;
      minBodyLine = 180;
    },
    update(points): RepUpdate {
      const elbow = sideAngle(points, 'shoulder', 'elbow', 'wrist');
      if (elbow === null) return { repCompleted: false, feedback: null };
      const bodyLine = sideAngle(points, 'shoulder', 'hip', 'ankle');
      if (phase === 'up') {
        if (elbow < ELBOW_DOWN) {
          phase = 'down';
          minElbow = elbow;
          minBodyLine = bodyLine ?? 180;
        }
        return { repCompleted: false, feedback: null };
      }
      minElbow = Math.min(minElbow, elbow);
      if (bodyLine !== null) minBodyLine = Math.min(minBodyLine, bodyLine);
      if (elbow <= ELBOW_UP) return { repCompleted: false, feedback: null };
      phase = 'up';
      const feedback: FormFeedback =
        minBodyLine < BODY_LINE_MIN
          ? { status: 'warn', message: t('pose.pushup.hips') }
          : minElbow > DEPTH_GOOD
            ? { status: 'warn', message: t('pose.pushup.shallow') }
            : { status: 'good', message: t('pose.pushup.good') };
      minElbow = 180;
      minBodyLine = 180;
      return { repCompleted: true, feedback };
    },
  };
}

/**
 * Pull-ups fail in a direction angle alone won't catch: loading a pull-up heavy enough tends to
 * trade range of motion for momentum — swinging the body to sling the chin up rather than pulling
 * it there. A shallow pull reads directly as a small elbow bend, same as a shallow squat, but the
 * swing itself needs its own signal: how far the hips drift sideways relative to the shoulders
 * during the rep, scaled by torso length so it doesn't depend on distance from the camera.
 */
function createPullupTracker(): MovementTracker {
  const ELBOW_UP = 150;
  const ELBOW_DOWN = 110;
  const DEPTH_GOOD = 80;
  const MAX_SWING_RATIO = 0.15;
  let phase: Phase = 'up';
  let minElbow = 180;
  let startHipX: number | null = null;
  let maxSwing = 0;
  const reset = () => {
    phase = 'up';
    minElbow = 180;
    startHipX = null;
    maxSwing = 0;
  };
  return {
    reset,
    update(points): RepUpdate {
      const elbow = sideAngle(points, 'shoulder', 'elbow', 'wrist');
      if (elbow === null) return { repCompleted: false, feedback: null };
      const hip = sideMidpoint(points, 'hip');
      const shoulder = sideMidpoint(points, 'shoulder');
      const torsoLen = hip && shoulder ? distance(hip, shoulder) : null;

      if (phase === 'up') {
        if (elbow < ELBOW_DOWN) {
          phase = 'down';
          minElbow = elbow;
          startHipX = hip?.x ?? null;
          maxSwing = 0;
        }
        return { repCompleted: false, feedback: null };
      }
      minElbow = Math.min(minElbow, elbow);
      if (hip && torsoLen && startHipX !== null && torsoLen > 0) {
        maxSwing = Math.max(maxSwing, Math.abs(hip.x - startHipX) / torsoLen);
      }
      if (elbow <= ELBOW_UP) return { repCompleted: false, feedback: null };
      const feedback: FormFeedback =
        maxSwing > MAX_SWING_RATIO
          ? { status: 'warn', message: t('pose.pullup.swing') }
          : minElbow > DEPTH_GOOD
            ? { status: 'warn', message: t('pose.pullup.shallow') }
            : { status: 'good', message: t('pose.pullup.good') };
      reset();
      return { repCompleted: true, feedback };
    },
  };
}

export function createTracker(movement: PoseMovement): MovementTracker {
  if (movement === 'squat') return createSquatTracker();
  if (movement === 'pullup') return createPullupTracker();
  return createPushupTracker();
}
