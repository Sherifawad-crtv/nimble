import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, IconButton } from '../design';
import { useIsDesktop } from '../hooks/media';
import { t } from '../i18n';

const CRUMBS: Record<string, 'nav.clients' | 'nav.library' | 'nav.workouts'> = {
  '/coach/clients': 'nav.clients',
  '/coach/library': 'nav.library',
  '/coach/workouts': 'nav.workouts',
};

interface PageProps {
  title: string;
  /** Second headline line in the accent colour: the one value that matters on this screen. */
  accent?: string;
  /** One sentence-case line under the title. */
  subtitle?: string;
  /** Show a back chevron. A path goes there; `true` goes back in history. */
  back?: string | true;
  /** Overrides what the back chevron does (for example to confirm discarding changes). */
  onBack?: () => void;
  /** Round controls or a small button, top right. */
  trailing?: ReactNode;
  children: ReactNode;
}

/**
 * Screen frame from the source screens: a heavy italic uppercase headline top left with round
 * controls top right. Pushed screens get a back control above the title. Once the title scrolls
 * away, a compact sticky bar keeps the title and controls in reach (iOS large-title behaviour).
 */
export function Page({ title, accent, subtitle, back, onBack, trailing, children }: PageProps) {
  const navigate = useNavigate();
  const sentinel = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);
  const goBack = () => (onBack ? onBack() : typeof back === 'string' ? navigate(back) : navigate(-1));

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setCondensed(!!entry && !entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const desktop = useIsDesktop();
  useEffect(() => {
    document.title = `${title} · ${t('notifyPrompt.app')}`;
  }, [title]);
  const crumb = typeof back === 'string' ? CRUMBS[back] : undefined;

  const backButton = back && desktop && crumb ? (
    <button type="button" className="app-crumb" onClick={goBack}>
      <Icon name="chev-l" size={18} />
      {t(crumb)}
    </button>
  ) : back ? <IconButton icon="chev-l" label={t('common.back')} onClick={goBack} /> : null;

  return (
    <div className="app-page">
      <div className={condensed ? 'app-compact on' : 'app-compact'} aria-hidden={!condensed}>
        <div className="app-compact-in">
          {backButton ?? <span className="app-compact-spacer" />}
          <span className="app-compact-title">{title}</span>
          {trailing ? <span className="app-compact-trailing">{trailing}</span> : <span className="app-compact-spacer" />}
        </div>
      </div>

      <header className={back ? 'app-head pushed' : 'app-head'}>
        {back && (
          <div className="app-head-bar">
            {backButton}
            {trailing && <div className="app-head-trailing">{trailing}</div>}
          </div>
        )}
        <div className="app-head-row">
          <div className="app-head-text">
            <h1 className={back ? 't-title app-title' : 't-headline app-title'}>
              {title}
              {accent && <span className="app-accent">{accent}</span>}
            </h1>
            {subtitle && <p className="t-label app-subtitle">{subtitle}</p>}
          </div>
          {!back && trailing && <div className="app-head-trailing">{trailing}</div>}
        </div>
        <div ref={sentinel} className="app-head-sentinel" aria-hidden="true" />
      </header>

      <div className="app-page-body">{children}</div>
    </div>
  );
}
