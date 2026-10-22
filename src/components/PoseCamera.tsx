import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { overlayRoot } from '../lib/viewport';
import { Banner, Button, IconButton } from '../design';
import { t } from '../i18n';
import { loadPoseDetector, type PoseDetector } from '../pose/detector';
import { createTracker, isPoseUsable, type PoseMovement } from '../pose/movements';
import type { FormFeedback, Keypoint } from '../pose/pose-types';

type Status = 'loading' | 'ready' | 'denied' | 'error' | 'unsupported';

interface Props {
  movement: PoseMovement;
  exerciseName: string;
  target?: number;
  onClose: () => void;
  onApply: (reps: number) => void;
}

const SKELETON_EDGES: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_hip', 'right_hip'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];
const MIN_SCORE = 0.3;

/**
 * Full-screen camera view that counts reps and flags basic form issues for one exercise, using
 * an on-device pose model — nothing is uploaded. Experimental: covers squats and push-ups only.
 */
export function PoseCamera({ movement, exerciseName, target, onClose, onApply }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [personVisible, setPersonVisible] = useState(false);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }

    let stream: MediaStream | null = null;
    let detector: PoseDetector | null = null;
    let raf = 0;
    let stopped = false;
    const tracker = createTracker(movement);

    const loop = async () => {
      if (stopped || !detector || !videoRef.current || !canvasRef.current || !stageRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        // Match the canvas's own pixel buffer to how it's actually laid out on screen, so there is
        // exactly one source of truth for scale and crop — nothing left for a second element's own
        // CSS sizing to drift out of sync with.
        const box = stageRef.current.getBoundingClientRect();
        const w = Math.round(box.width);
        const h = Math.round(box.height);
        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
          canvas.width = w;
          canvas.height = h;
        }

        const points = await detector.estimate(video);
        if (stopped) return;
        const usable = points ? isPoseUsable(movement, points) : false;
        setPersonVisible(usable);
        drawFrame(canvas, video, usable ? points : null);
        if (points && usable) {
          const update = tracker.update(points);
          if (update.repCompleted) {
            setReps((r) => r + 1);
            setFeedback(update.feedback);
          }
        }
      }
      if (!stopped) raf = requestAnimationFrame(() => void loop());
    };

    void (async () => {
      try {
        // No resolution hint: an explicit ideal width/height pushed some phones (iOS especially)
        // to digitally crop the sensor to match it, zooming in tight enough to cut off the knees.
        // drawFrame()'s cover-crop math already adapts to whatever shape the stream actually is.
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (stopped) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        detector = await loadPoseDetector();
        if (stopped) {
          detector.dispose();
          return;
        }
        setStatus('ready');
        raf = requestAnimationFrame(() => void loop());
      } catch (e) {
        if (stopped) return;
        const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError');
        setStatus(denied ? 'denied' : 'error');
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
      detector?.dispose();
    };
  }, [movement]);

  return createPortal(
    <div className="app-pose" data-theme="dark" role="dialog" aria-modal="true" aria-label={t('pose.title')}>
      <header className="app-pose-head">
        <h2 className="t-heading">{exerciseName}</h2>
        <IconButton icon="close" label={t('pose.close')} variant="ghost" onClick={onClose} />
      </header>

      <div className="app-pose-stage" ref={stageRef}>
        <video ref={videoRef} className="app-pose-video-source" playsInline muted aria-hidden="true" />
        <canvas ref={canvasRef} className="app-pose-canvas" />
        {status === 'loading' && <p className="t-body app-pose-status">{t('pose.loading')}</p>}
        {status === 'ready' && !personVisible && <p className="t-body app-pose-status">{t('pose.noPerson')}</p>}
      </div>

      {status === 'denied' && <Banner message={t('pose.cameraDenied')} />}
      {status === 'error' && <Banner message={t('pose.cameraError')} />}
      {status === 'unsupported' && <Banner message={t('pose.notSupported')} />}

      {status === 'ready' && (
        <div className="app-pose-panel">
          <p className="t-metric app-pose-count">{target ? t('pose.reps', { done: reps, target }) : t('pose.repsNoTarget', { done: reps })}</p>
          {feedback && <p className={`app-pose-feedback ${feedback.status}`}>{feedback.message}</p>}
          {target !== undefined && reps >= target && <p className="t-label v-muted">{t('pose.targetHit')}</p>}
          <Button fullWidth size="lg" onClick={() => onApply(reps)}>
            {t('pose.applyToLog')}
          </Button>
        </div>
      )}
    </div>,
    overlayRoot(),
  );
}

/** How much of the source video to sample (and from where) to fill the canvas edge-to-edge
 * without distorting it, the same math `object-fit: cover` does — computed once per frame so a
 * resize or a stream's native resolution changing is picked up automatically. */
function coverSource(srcW: number, srcH: number, dstW: number, dstH: number) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const sWidth = dstW / scale;
  const sHeight = dstH / scale;
  return { sx: (srcW - sWidth) / 2, sy: (srcH - sHeight) / 2, sWidth, sHeight, scale };
}

/** Draws the current camera frame and, when given, the skeleton on top of it — both through the
 * same transform in the same pass, so the overlay can never end up reading as if it belongs to a
 * different crop or orientation than what's actually on screen. */
function drawFrame(canvas: HTMLCanvasElement, video: HTMLVideoElement, points: Keypoint[] | null) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.width || !canvas.height) return;
  const { sx, sy, sWidth, sHeight, scale } = coverSource(video.videoWidth, video.videoHeight, canvas.width, canvas.height);

  ctx.save();
  // Mirror for a natural selfie view. Everything drawn below — the frame and the skeleton — goes
  // through this same flip, so they can't end up mirrored relative to each other.
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

  if (points) {
    const toCanvas = (p: Keypoint) => ({ x: (p.x - sx) * scale, y: (p.y - sy) * scale });
    const byName = new Map(points.map((p) => [p.name, p]));
    ctx.strokeStyle = '#c8f751';
    ctx.lineWidth = 3;
    for (const [a, b] of SKELETON_EDGES) {
      const pa = byName.get(a);
      const pb = byName.get(b);
      if (!pa || !pb || (pa.score ?? 0) < MIN_SCORE || (pb.score ?? 0) < MIN_SCORE) continue;
      const ca = toCanvas(pa);
      const cb = toCanvas(pb);
      ctx.beginPath();
      ctx.moveTo(ca.x, ca.y);
      ctx.lineTo(cb.x, cb.y);
      ctx.stroke();
    }
    ctx.fillStyle = '#c8f751';
    for (const p of points) {
      if ((p.score ?? 0) < MIN_SCORE) continue;
      const c = toCanvas(p);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
