import { Search } from 'lucide-react'
import GlassCard from './GlassCard'

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string
  value: number | string
  sub?: string
  color: string
  icon: typeof Search
}) {
  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</div>
          {sub && <div style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{
          background: color + '18',
          borderRadius: 'var(--radius-sm)',
          padding: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </GlassCard>
  )
}

export default StatCard
