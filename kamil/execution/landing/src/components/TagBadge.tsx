export default function TagBadge({ tags, limit }: { tags: string[]; limit?: number }) {
  const visible = limit ? tags.slice(0, limit) : tags;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {visible.map(tag => (
        <span key={tag} style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--accent-primary)',
          background: 'var(--accent-primary-dim)',
          padding: '3px 10px',
          borderRadius: 999,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}>
          {tag}
        </span>
      ))}
    </div>
  );
}
