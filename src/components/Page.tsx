import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, TopBar } from '../design';
import { useIsDesktop } from '../hooks/media';
import { t } from '../i18n';

interface PageProps {
  title: string;
  eyebrow?: string;
  /** Show a back chevron. A path goes there; `true` goes back in history. */
  back?: string | true;
  /** Overrides what the back chevron does (for example to confirm discarding changes). */
  onBack?: () => void;
  trailing?: ReactNode;
  children: ReactNode;
}

/** Standard screen frame: large title on tab roots, back-chevron header on pushed screens. */
export function Page({ title, eyebrow, back, onBack, trailing, children }: PageProps) {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const goBack = () => (onBack ? onBack() : typeof back === 'string' ? navigate(back) : navigate(-1));
  return (
    <div className="app-page">
      {desktop ? (
        <header className="app-page-head">
          {back && <IconButton icon="chev-l" label={t('common.back')} onClick={goBack} />}
          <div className="app-page-title">
            {eyebrow && <div className="t-chip v-muted">{eyebrow}</div>}
            <h1 className="t-title app-title">{title}</h1>
          </div>
          {trailing && <div className="app-page-trailing">{trailing}</div>}
        </header>
      ) : back ? (
        <TopBar variant="back" title={title} onBack={goBack} trailing={trailing} />
      ) : (
        <TopBar variant="large" title={title} eyebrow={eyebrow} trailing={trailing} />
      )}
      <div className="app-page-body">{children}</div>
    </div>
  );
}
