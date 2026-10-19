import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';
import { isChunkError, reloadForNewVersion } from '../lib/chunkReload';

interface State {
  error: Error | null;
  /** The first components in the tree where it failed, to say where to look. */
  where: string;
}

const clearDemoData = () => {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith('nimble.') || k.startsWith('origin.'))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* storage unavailable: nothing to clear */
  }
  window.location.replace('/');
};

const demo = !import.meta.env.VITE_SUPABASE_URL;

/** A render error must never leave a blank screen: show what failed and a way out. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, where: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
    if (isChunkError(error)) reloadForNewVersion();
    this.setState({ where: (info.componentStack ?? '').trim().split('\n').slice(0, 4).map((l) => l.trim()).join('  '), });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="app-crash" role="alert">
        <h1 className="t-title app-title">{t('crash.title')}</h1>
        <p className="t-body">{demo ? t('crash.body') : t('crash.body.account')}</p>
        <pre className="app-crash-detail">{String(error.message || error)}{this.state.where ? `\n${this.state.where}` : ''}</pre>
        <div className="app-form-actions">
          <button type="button" className="v-btn v-btn-md v-btn-primary t-button-md full" onClick={() => window.location.reload()}>
            {t('crash.reload')}
          </button>
          {demo && (
            <button type="button" className="v-btn v-btn-md v-btn-secondary t-button-md full" onClick={clearDemoData}>
              {t('crash.reset')}
            </button>
          )}
        </div>
      </main>
    );
  }
}
