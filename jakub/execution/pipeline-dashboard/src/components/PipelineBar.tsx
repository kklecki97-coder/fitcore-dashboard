import GlassCard from './GlassCard'
import { STAGES } from '../types'

function PipelineBar({ stages, counts }: { stages: typeof STAGES; counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Pipeline Stages</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {Object.values(counts).reduce((a, b) => a + b, 0)} total leads
        </div>
      </div>

      <div style={{
        display: 'flex',
        height: 32,
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        marginBottom: 20,
        background: 'var(--bg-elevated)',
      }}>
        {stages.filter(s => s.key !== 'dead').map(stage => {
          const count = counts[stage.key] || 0
          const pct = (count / total) * 100
          if (pct === 0) return null
          return (
            <div
              key={stage.key}
              title={`${stage.label}: ${count}`}
              style={{
                width: `${pct}%`,
                background: stage.color,
                opacity: 0.8,
                transition: 'width 0.5s ease',
                minWidth: count > 0 ? 4 : 0,
              }}
            />
          )
        })}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 12,
      }}>
        {stages.map(stage => {
          const count = counts[stage.key] || 0
          const Icon = stage.icon
          return (
            <div
              key={stage.key}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 14px',
                textAlign: 'center',
              }}
            >
              <Icon size={16} color={stage.color} style={{ marginBottom: 6 }} />
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: stage.color,
              }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{stage.label}</div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

export default PipelineBar
