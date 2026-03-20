import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { useLang } from '../i18n';

export default function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const { lang } = useLang();

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setUpdateSW(() => update);
        setShowBanner(true);
      },
      onOfflineReady() {
        // silent — no need to notify
      },
    });
  }, []);

  if (!showBanner) return null;

  const handleRefresh = () => {
    updateSW?.(true);
  };

  const text = lang === 'pl' ? 'Nowa wersja dostępna' : 'New version available';
  const btnText = lang === 'pl' ? 'Odśwież' : 'Refresh';

  return (
    <div style={styles.banner}>
      <span style={styles.text}>{text}</span>
      <button style={styles.btn} onClick={handleRefresh}>
        <RefreshCw size={14} />
        {btnText}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    position: 'fixed',
    bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 25000,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderRadius: '12px',
    background: '#0c1017',
    border: '1px solid rgba(0,229,200,0.25)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(0,229,200,0.08)',
    whiteSpace: 'nowrap',
  },
  text: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-display)',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--accent)',
    color: '#07090e',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
};
