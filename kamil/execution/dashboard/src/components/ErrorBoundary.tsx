import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isPl = localStorage.getItem('fitcore-lang') === 'pl';
      const title = isPl ? 'Coś poszło nie tak' : 'Something went wrong';
      const fallback = isPl ? 'Wystąpił nieoczekiwany błąd.' : 'An unexpected error occurred.';
      const reloadLabel = isPl ? 'Odśwież stronę' : 'Reload Page';
      const retryLabel = isPl ? 'Spróbuj ponownie' : 'Try Again';

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <AlertTriangle size={40} color="var(--accent-danger, #ef4444)" />
            </div>
            <h2 style={styles.title}>{title}</h2>
            <p style={styles.message}>
              {this.state.error?.message
                ? this.state.error.message.slice(0, 200)
                : fallback}
            </p>
            <div style={styles.actions}>
              <button style={styles.primaryBtn} onClick={() => window.location.reload()}>
                <RefreshCw size={16} /> {reloadLabel}
              </button>
              <button style={styles.secondaryBtn} onClick={this.handleReset}>
                <RotateCcw size={16} /> {retryLabel}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary, #07090e)',
    zIndex: 9999,
    padding: '24px',
  },
  card: {
    background: 'var(--bg-card, #0c1017)',
    border: '1px solid var(--glass-border, rgba(255,255,255,0.06))',
    borderRadius: 'var(--radius-lg, 16px)',
    padding: '48px 40px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  iconWrap: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary, #e8eaed)',
    fontFamily: 'var(--font-display, Outfit, sans-serif)',
    margin: 0,
  },
  message: {
    fontSize: '14px',
    color: 'var(--text-secondary, #8b95a5)',
    lineHeight: 1.6,
    margin: 0,
    maxWidth: '320px',
    wordBreak: 'break-word',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
  primaryBtn: {
    padding: '12px 20px',
    borderRadius: 'var(--radius-md, 10px)',
    border: 'none',
    background: 'var(--accent-primary, #00e5c8)',
    color: '#07090e',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display, Outfit, sans-serif)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  secondaryBtn: {
    padding: '12px 20px',
    borderRadius: 'var(--radius-md, 10px)',
    border: '1px solid var(--glass-border, rgba(255,255,255,0.06))',
    background: 'transparent',
    color: 'var(--text-secondary, #8b95a5)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display, Outfit, sans-serif)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};
