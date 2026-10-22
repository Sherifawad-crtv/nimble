import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { overlayRoot } from '../lib/viewport';
import { Banner, Button, IconButton } from '../design';
import { t } from '../i18n';
import { loadPoseDetector, type PoseDetector } from '../pose/detector';
import { createTracker, type PoseMovement } from '../pose/movements';
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
/** How many of the 17 joints must be confidently visible before a reading is trusted. */
const MIN_VISIBLE_JOINTS = 6;

/**
 * Full-screen camera view that counts reps and flags basic form issues for one exercise, using
 * an on-device pose model — nothing is uploaded. Experimental: covers squats and push-ups only.
 */
export function PoseCamera({ movement, exerciseName, target, onClose, onApply }: Props) {
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
      if (stopped || !detector || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState >= 2) {
        const points = await detector.estimate(video);
        if (stopped) return;
        drawSkeleton(canvasRef.current, video, points);
        const seen = points ? points.filter((p) => (p.score ?? 0) >= MIN_SCORE).length >= MIN_VISIBLE_JOINTS : false;
        setPersonVisible(seen);
        if (points && seen) {
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

      <div className="app-pose-stage">
        <video ref={videoRef} className="app-pose-video" playsInline muted />
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

function drawSkeleton(canvas: HTMLCanvasElement | null, video: HTMLVideoElement, points: Keypoint[] | null) {
  if (!canvas) return;
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!points) return;
  const byName = new Map(points.map((p) => [p.name, p]));
  ctx.strokeStyle = '#c8f751';
  ctx.lineWidth = 3;
  for (const [a, b] of SKELETON_EDGES) {
    const pa = byName.get(a);
    const pb = byName.get(b);
    if (!pa || !pb || (pa.score ?? 0) < MIN_SCORE || (pb.score ?? 0) < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  ctx.fillStyle = '#c8f751';
  for (const p of points) {
    if ((p.score ?? 0) < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
