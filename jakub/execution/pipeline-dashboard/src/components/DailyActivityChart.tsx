import { useState } from 'react'
import GlassCard from './GlassCard'

export const CHART_RANGES = [
  { label: '1d', days: 1 },
  { label: '3d', days: 3 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
] as const

function DailyActivityChart({ data }: {
  data: { date: string; label: string; engaged: number; dmed: number }[]
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [rangeDays, setRangeDays] = useState(7)

  // Slice data to selected range
  const visibleData = data.slice(-rangeDays)

  const maxVal = Math.max(...visibleData.map(d => Math.max(d.engaged, d.dmed)), 1)
  const chartHeight = 160
  const padLeft = 30
  const padRight = 10

  // How often to show x-axis labels to avoid crowding
  const labelStep = rangeDays <= 7 ? 1 : rangeDays <= 30 ? 3 : rangeDays <= 60 ? 7 : 10

  // Build SVG points for each line
  const getX = (i: number, width: number) => {
    if (visibleData.length <= 1) return padLeft
    return padLeft + (i / (visibleData.length - 1)) * (width - padLeft - padRight)
  }
  const getY = (val: number) => chartHeight - (val / maxVal) * (chartHeight - 10)

  // Totals for the selected range
  const totalEngaged = visibleData.reduce((s, d) => s + d.engaged, 0)
  const totalDmed = visibleData.reduce((s, d) => s + d.dmed, 0)

  return (
    <GlassCard style={{ marginBottom: 24 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Daily Activity</div>
          {hoveredIdx === null && (
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
              <span><span style={{ color: '#6366f1', fontWeight: 600 }}>{totalEngaged}</span> engaged</span>
              <span><span style={{ color: '#f59e0b', fontWeight: 600 }}>{totalDmed}</span> DM'd</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          {hoveredIdx !== null ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '4px 10px',
              background: 'var(--glass-bg)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--glass-border)',
            }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {visibleData[hoveredIdx].label}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                <span style={{ color: '#6366f1', fontWeight: 600 }}>{visibleData[hoveredIdx].engaged}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>engaged</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{visibleData[hoveredIdx].dmed}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>DM'd</span>
              </span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Engaged</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ color: 'var(--text-secondary)' }}>DM'd</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Range filter pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {CHART_RANGES.map(r => (
          <button
            key={r.label}
            onClick={() => { setRangeDays(r.days); setHoveredIdx(null) }}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-mono)',
              borderRadius: 'var(--radius-sm)',
              border: rangeDays === r.days ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
              background: rangeDays === r.days ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: rangeDays === r.days ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', height: chartHeight + 30 }}>
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 600 ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = chartHeight - pct * (chartHeight - 10)
            return (
              <g key={pct}>
                <line x1={padLeft} y1={y} x2={600 - padRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                {pct > 0 && (
                  <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)" fontFamily="var(--font-mono)">
                    {Math.round(maxVal * pct)}
                  </text>
                )}
              </g>
            )
          })}

          {visibleData.length > 1 ? (
            <>
              {/* Engaged area fill */}
              <path
                d={`M${getX(0, 600)},${chartHeight} ${visibleData.map((d, i) => `L${getX(i, 600)},${getY(d.engaged)}`).join(' ')} L${getX(visibleData.length - 1, 600)},${chartHeight} Z`}
                fill="url(#engagedGradient)"
                opacity={0.15}
              />

              {/* DM'd area fill */}
              <path
                d={`M${getX(0, 600)},${chartHeight} ${visibleData.map((d, i) => `L${getX(i, 600)},${getY(d.dmed)}`).join(' ')} L${getX(visibleData.length - 1, 600)},${chartHeight} Z`}
                fill="url(#dmedGradient)"
                opacity={0.15}
              />

              {/* Engaged line */}
              <polyline
                points={visibleData.map((d, i) => `${getX(i, 600)},${getY(d.engaged)}`).join(' ')}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* DM'd line */}
              <polyline
                points={visibleData.map((d, i) => `${getX(i, 600)},${getY(d.dmed)}`).join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : null}

          {/* Data points */}
          {visibleData.map((d, i) => (
            <g key={d.date}>
              <circle cx={getX(i, 600)} cy={getY(d.engaged)} r={hoveredIdx === i ? 5 : 3} fill="#6366f1" stroke="var(--bg-primary)" strokeWidth={1.5} />
              <circle cx={getX(i, 600)} cy={getY(d.dmed)} r={hoveredIdx === i ? 5 : 3} fill="#f59e0b" stroke="var(--bg-primary)" strokeWidth={1.5} />
            </g>
          ))}

          {/* Hover vertical line */}
          {hoveredIdx !== null && (
            <line
              x1={getX(hoveredIdx, 600)}
              y1={5}
              x2={getX(hoveredIdx, 600)}
              y2={chartHeight}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          )}

          {/* Invisible hover zones */}
          {visibleData.map((_d, i) => {
            const zoneWidth = (600 - padLeft - padRight) / visibleData.length
            return (
              <rect
                key={i}
                x={getX(i, 600) - zoneWidth / 2}
                y={0}
                width={zoneWidth}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              />
            )
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="engagedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dmedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis labels */}
        <div style={{
          display: 'flex',
          paddingLeft: padLeft,
          paddingRight: padRight,
          marginTop: chartHeight + 6,
        }}>
          {visibleData.map((day, i) => {
            const isToday = day.date === new Date().toISOString().slice(0, 10)
            const isHovered = hoveredIdx === i
            const showLabel = isHovered || i % labelStep === 0 || i === visibleData.length - 1
            return (
              <div
                key={day.date}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  color: isHovered
                    ? 'var(--text-primary)'
                    : isToday
                      ? 'var(--accent-primary)'
                      : 'var(--text-tertiary)',
                  fontWeight: isHovered || isToday ? 600 : 400,
                  minWidth: 0,
                  overflow: 'hidden',
                  transition: 'color 0.15s ease',
                }}
              >
                {showLabel ? day.label : ''}
              </div>
            )
          })}
        </div>
      </div>
    </GlassCard>
  )
}

export default DailyActivityChart
