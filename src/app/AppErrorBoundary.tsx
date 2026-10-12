import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';

interface State {
  error: Error | null;
}

const clearDemoData = () => {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith('origin.'))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* storage unavailable: nothing to clear */
  }
  window.location.replace('/');
};

/** A render error must never leave a blank screen: show what failed and a way out. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="app-crash" role="alert">
        <h1 className="t-title app-title">{t('crash.title')}</h1>
        <p className="t-body">{t('crash.body')}</p>
        <pre className="app-crash-detail">{String(error.message || error)}</pre>
        <div className="app-form-actions">
          <button type="button" className="v-btn v-btn-md v-btn-primary t-button-md full" onClick={() => window.location.reload()}>
            {t('crash.reload')}
          </button>
          <button type="button" className="v-btn v-btn-md v-btn-secondary t-button-md full" onClick={clearDemoData}>
            {t('crash.reset')}
          </button>
        </div>
      </main>
    );
  }
}
