import { sideAngle } from './angles';
import { t } from '../i18n';
import type { FormFeedback, Keypoint, MovementTracker, RepUpdate } from './pose-types';
import type { MeasuredAs } from '../types';

export type PoseMovement = 'squat' | 'pushup';

/** Name patterns matched against the exercise library, in order. Only bodyweight-rep exercises
 * qualify — a barbell back squat isn't framed or paced the way this tracker expects. */
const PATTERNS: [RegExp, PoseMovement][] = [
  [/push[\s-]?up/i, 'pushup'],
  [/squat/i, 'squat'],
];

export function detectMovement(exerciseName: string, measuredAs: MeasuredAs): PoseMovement | null {
  if (measuredAs !== 'reps') return null;
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

export function createTracker(movement: PoseMovement): MovementTracker {
  return movement === 'squat' ? createSquatTracker() : createPushupTracker();
}
