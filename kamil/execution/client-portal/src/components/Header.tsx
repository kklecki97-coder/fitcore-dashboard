import { useLang } from '../i18n';

interface HeaderProps {
  clientName: string;
}

export default function Header({ clientName }: HeaderProps) {
  const { t } = useLang();

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <img src="/fitcore-logo.png" alt="FitCore" style={{ width: 36, height: 36, borderRadius: '50%' }} />
        <div>
          <div style={styles.title}>{t.header.brandName}</div>
          <div style={styles.subtitle}>{clientName}</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: 'var(--header-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    borderBottom: '1px solid var(--glass-border)',
    background: 'var(--bg-secondary)',
    position: 'relative',
    zIndex: 10,
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
};
