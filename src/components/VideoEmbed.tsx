import { useState } from 'react';
import { Icon, StatusChip, VideoPreview } from '../design';
import { t } from '../i18n';
import type { Exercise } from '../types';

const PROVIDER_NAME = { youtube: 'YouTube', vimeo: 'Vimeo' } as const;

function embedSrc(e: Pick<Exercise, 'videoProvider' | 'videoId'>): string {
  return e.videoProvider === 'vimeo'
    ? `https://player.vimeo.com/video/${e.videoId}?playsinline=1&autoplay=1&muted=1`
    : `https://www.youtube-nocookie.com/embed/${e.videoId}?playsinline=1&rel=0&autoplay=1&mute=1`;
}

interface Props {
  exercise: Pick<Exercise, 'name' | 'videoUrl' | 'videoProvider' | 'videoId' | 'thumbnailUrl' | 'linkStatus' | 'cues'>;
  /** Hide the cues line (when the caller shows them elsewhere). */
  hideCues?: boolean;
}

/**
 * Inline preview through the official player only. Nothing loads or plays until the user taps,
 * playback stays inline (never forced fullscreen), and it never starts with sound.
 */
export function VideoEmbed({ exercise, hideCues }: Props) {
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const provider = exercise.videoProvider ? PROVIDER_NAME[exercise.videoProvider] : undefined;
  const unavailable = exercise.linkStatus === 'unavailable';

  return (
    <div className="app-video">
      {!exercise.videoId || !exercise.videoProvider ? null : unavailable ? (
        <div className="app-video-frame">
          <VideoPreview state="unavailable" provider={provider as 'YouTube' | 'Vimeo'} title={exercise.name} />
          <a className="app-video-open t-body-strong" href={exercise.videoUrl} target="_blank" rel="noopener noreferrer">
            {t('video.open', { provider: provider ?? '' })}
            <Icon name="external" size={16} />
          </a>
        </div>
      ) : playing ? (
        <div className="app-video-frame">
          <iframe
            title={exercise.name}
            src={embedSrc(exercise)}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <button type="button" className="app-video-frame app-video-poster" onClick={() => setPlaying(true)} aria-label={t('video.play', { name: exercise.name })}>
          {exercise.thumbnailUrl && !thumbFailed && <img src={exercise.thumbnailUrl} alt="" loading="lazy" onError={() => setThumbFailed(true)} />}
          <span className="v-play">
            <Icon name="play" size={30} />
          </span>
          {provider && <span className="v-vid-prov t-chip">{provider}</span>}
        </button>
      )}
      {unavailable && (
        <div className="app-video-status">
          <StatusChip kind="link" value="unavailable" />
        </div>
      )}
      {!hideCues && exercise.cues && <p className="t-body app-cues">{exercise.cues}</p>}
    </div>
  );
}

/** Small square thumbnail for lists. Falls back to the design system's play tile. */
export function Thumb({ url, status }: { url?: string; status?: Exercise['linkStatus'] }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="app-thumb" data-status={status}>
      {url && !failed ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} /> : <Icon name={status === 'unavailable' ? 'alert' : 'play'} size={18} />}
    </span>
  );
}
