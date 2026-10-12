import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { overlayRoot } from '../../lib/viewport';
import { RestTimer } from '../../design';
import { buildRestPlan } from '../../timer/engine';
import { useTimer } from '../../timer/useTimer';

interface Props {
  seconds: number;
  next?: string;
  onClose: () => void;
}

/** Rest between sets. Full-screen, always dark, counts against the real clock. */
export function RestOverlay({ seconds, next, onClose }: Props) {
  const [extra, setExtra] = useState(0);
  const plan = useMemo(() => buildRestPlan(Math.max(5, seconds + extra)), [seconds, extra]);
  const timer = useTimer(plan);
  const { start } = timer;
  const finished = timer.snap.status === 'finished';

  useEffect(() => start(), [start]);
  useEffect(() => {
    if (finished) onClose();
  }, [finished, onClose]);

  return createPortal(
    <div className="app-rest" data-theme="dark" role="dialog" aria-modal="true" aria-label="Rest">
      <RestTimer
        remaining={timer.snap.segmentRemainingSec}
        total={plan.totalSec}
        next={next}
        onAdd={() => setExtra((e) => e + 15)}
        onSub={() => setExtra((e) => e - 15)}
        onSkip={onClose}
      />
    </div>,
    overlayRoot(),
  );
}
