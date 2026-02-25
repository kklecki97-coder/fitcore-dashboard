export default function DemoModeBadge() {
  return (
    <div style={styles.badge}>
      DEMO MODE
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    position: 'fixed',
    top: 56,
    right: 16,
    zIndex: 9999,
    padding: '5px 12px',
    borderRadius: 6,
    background: 'rgba(0, 229, 200, 0.12)',
    border: '1px solid rgba(0, 229, 200, 0.3)',
    color: '#00e5c8',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    animation: 'demo-pulse 3s ease-in-out infinite',
    pointerEvents: 'none',
  },
};
