import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Users, MessageCircle, Phone, CheckCircle, XCircle,
  RefreshCw, Instagram, ExternalLink, ChevronDown, ChevronUp,
  Target, TrendingUp, ArrowRight, ListChecks, Copy, Send,
  Heart, MessageSquare, UserPlus, Check, Play, Pause, Lock
} from 'lucide-react'

// ─── Supabase Config ───
const SUPABASE_URL = 'https://vjimeeiovrqjitoxmzeb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_51_z3oNgQx0IYRwmJhutDQ_YNoq1_G0'

// ─── Constants ───
const DAILY_ENGAGE_LIMIT = 20

// ─── Types ───
interface Lead {
  id: number
  instagram_handle: string
  full_name: string | null
  bio: string | null
  follower_count: number | null
  following_count: number | null
  post_count: number | null
  website: string | null
  is_business_account: boolean
  business_category: string | null
  is_verified: boolean
  likely_us: boolean
  score: number
  status: string
  followed_at: string | null
  engaged_at: string | null
  dmed_at: string | null
  follow_up_at: string | null
  notes: string | null
  dm_draft: string | null
  scraped_at: string | null
  created_at: string | null
}

type PipelineStage = 'new' | 'engaged' | 'dmed' | 'replied' | 'call_booked' | 'closed' | 'dead'
type ViewMode = 'tasks' | 'pipeline'

const STAGES: { key: PipelineStage; label: string; color: string; icon: typeof Search }[] = [
  { key: 'new', label: 'New Leads', color: '#8b92a5', icon: Search },
  { key: 'engaged', label: 'Engaged', color: '#6366f1', icon: Users },
  { key: 'dmed', label: 'DM Sent', color: '#f59e0b', icon: MessageCircle },
  { key: 'replied', label: 'Replied', color: '#00e5c8', icon: MessageCircle },
  { key: 'call_booked', label: 'Call Booked', color: '#22c55e', icon: Phone },
  { key: 'closed', label: 'Closed', color: '#10b981', icon: CheckCircle },
  { key: 'dead', label: 'Dead', color: '#ef4444', icon: XCircle },
]

// ─── Supabase Helper ───
async function supabaseFetch(endpoint: string, options?: RequestInit) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options?.headers || {}),
    },
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Supabase ${resp.status}: ${text}`)
  }
  const text = await resp.text()
  return text ? JSON.parse(text) : null
}

// ─── Shared Components ───

function GlassCard({ children, style, onClick }: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        zIndex: 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, background 0.2s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--glass-border-hover)'
          e.currentTarget.style.background = 'var(--bg-card-hover)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--glass-border)'
        e.currentTarget.style.background = 'var(--bg-card)'
      }}
    >
      {children}
    </div>
  )
}

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

function LeadRow({ lead, onStatusChange }: {
  lead: Lead
  onStatusChange: (id: number, newStatus: PipelineStage) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const stage = STAGES.find(s => s.key === lead.status) || STAGES[0]

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 8,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 20px',
          cursor: 'pointer',
          gap: 16,
        }}
      >
        <div style={{
          width: 10, height: 10,
          borderRadius: '50%',
          background: stage.color,
          flexShrink: 0,
        }} />

        <div style={{ minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Instagram size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>@{lead.instagram_handle}</span>
          </div>
          {lead.full_name && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{lead.full_name}</div>
          )}
        </div>

        <div style={{ minWidth: 80, textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>
            {lead.follower_count ? lead.follower_count.toLocaleString() : '-'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>followers</div>
        </div>

        <div style={{
          minWidth: 50,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
          color: lead.score >= 7 ? 'var(--accent-primary)' :
                 lead.score >= 4 ? 'var(--accent-warm)' : 'var(--text-tertiary)',
        }}>
          {lead.score}/10
        </div>

        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {lead.likely_us && (
            <span style={{
              background: 'var(--accent-secondary-dim)',
              color: 'var(--accent-secondary)',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}>US</span>
          )}
          {lead.is_business_account && (
            <span style={{
              background: 'var(--accent-primary-dim)',
              color: 'var(--accent-primary)',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}>BIZ</span>
          )}
          {lead.website && (
            <span style={{
              background: 'var(--accent-warm-dim)',
              color: 'var(--accent-warm)',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}>SITE</span>
          )}
        </div>

        <div style={{
          background: stage.color + '18',
          color: stage.color,
          fontSize: 12,
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 600,
          minWidth: 90,
          textAlign: 'center',
        }}>
          {stage.label}
        </div>

        {expanded ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
      </div>

      {expanded && (
        <div style={{
          padding: '0 20px 20px 46px',
          borderTop: '1px solid var(--glass-border)',
        }}>
          <div style={{ paddingTop: 16 }}>
            {lead.bio && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                {lead.bio}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <a
                href={`https://instagram.com/${lead.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: 'var(--accent-primary)', fontSize: 13, textDecoration: 'none',
                }}
              >
                <Instagram size={14} /> Profile <ExternalLink size={12} />
              </a>
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    color: 'var(--accent-warm)', fontSize: 13, textDecoration: 'none',
                  }}
                >
                  Website <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 4 }}>Move to:</span>
              {STAGES.map(s => (
                <button
                  key={s.key}
                  onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, s.key) }}
                  disabled={s.key === lead.status}
                  style={{
                    background: s.key === lead.status ? s.color + '30' : 'var(--bg-elevated)',
                    color: s.key === lead.status ? s.color : 'var(--text-secondary)',
                    border: `1px solid ${s.key === lead.status ? s.color + '50' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 12px',
                    fontSize: 11,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    cursor: s.key === lead.status ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {lead.notes && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
              }}>
                {lead.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Activity Chart ───

const CHART_RANGES = [
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

// ─── Daily Tasks Components ───

function EngageBatchCard({ leads, onMarkAllEngaged, dailyLimitReached }: {
  leads: Lead[]
  onMarkAllEngaged: () => void
  dailyLimitReached: boolean
}) {
  const [marking, setMarking] = useState(false)
  const [done, setDone] = useState(false)
  const [openingAll, setOpeningAll] = useState(false)
  const [openedCount, setOpenedCount] = useState(0)
  const [openTimerRef, setOpenTimerRef] = useState<ReturnType<typeof setInterval> | null>(null)

  const handleMarkAll = async () => {
    setMarking(true)
    await onMarkAllEngaged()
    setDone(true)
    setMarking(false)
  }

  const handleOpenAll = () => {
    if (openingAll) {
      // Stop
      if (openTimerRef) clearInterval(openTimerRef)
      setOpenTimerRef(null)
      setOpeningAll(false)
      return
    }

    setOpeningAll(true)
    setOpenedCount(0)

    // Open the first one immediately
    window.open(`https://instagram.com/${leads[0].instagram_handle}`, '_blank')
    setOpenedCount(1)

    if (leads.length <= 1) {
      setOpeningAll(false)
      return
    }

    // Open the rest every 5 seconds
    let idx = 1
    const timer = setInterval(() => {
      if (idx >= leads.length) {
        clearInterval(timer)
        setOpenTimerRef(null)
        setOpeningAll(false)
        return
      }
      window.open(`https://instagram.com/${leads[idx].instagram_handle}`, '_blank')
      idx++
      setOpenedCount(idx)
    }, 5000)

    setOpenTimerRef(timer)
  }

  if (leads.length === 0) {
    return (
      <GlassCard style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <UserPlus size={20} color="#6366f1" />
          <div style={{ fontSize: 18, fontWeight: 600 }}>Engage Batch</div>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: 20 }}>
          {dailyLimitReached ? (
            <>
              <div style={{ color: 'var(--accent-success)', fontWeight: 600, marginBottom: 6 }}>
                <Check size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Daily engage limit reached (20/20)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Come back tomorrow for the next batch. Don't exceed 20 follows/day to stay safe on Instagram.
              </div>
            </>
          ) : (
            <>No new leads to engage. Run <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>find_instagram_leads.py --output supabase</code> to add more.</>
          )}
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserPlus size={20} color="#6366f1" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Engage Batch</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {leads.length} profiles to follow, like 3 posts, comment on 1
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleOpenAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: openingAll ? 'var(--accent-warm-dim)' : 'var(--bg-elevated)',
              color: openingAll ? 'var(--accent-warm)' : 'var(--text-secondary)',
              border: `1px solid ${openingAll ? 'var(--accent-warm)' + '50' : 'var(--glass-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              fontSize: 13,
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {openingAll
              ? <><Pause size={14} /> Opening {openedCount}/{leads.length}...</>
              : <><Play size={14} /> Open All (5s apart)</>}
          </button>
          <button
            onClick={handleMarkAll}
            disabled={marking || done}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: done ? 'var(--accent-success-dim)' : 'var(--accent-secondary-dim)',
              color: done ? 'var(--accent-success)' : 'var(--accent-secondary)',
              border: `1px solid ${done ? 'var(--accent-success)' + '50' : 'var(--accent-secondary)' + '50'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              fontSize: 13,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              cursor: marking || done ? 'default' : 'pointer',
              transition: 'all 0.2s',
              opacity: marking ? 0.6 : 1,
            }}
          >
            {done ? <><Check size={16} /> All Engaged</> :
             marking ? <><RefreshCw size={16} className="spin" /> Marking...</> :
             <><CheckCircle size={16} /> Mark All as Engaged</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {leads.map((lead, i) => (
          <div
            key={lead.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--glass-border)',
              gap: 12,
            }}
          >
            <div style={{
              color: 'var(--text-tertiary)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              minWidth: 24,
              textAlign: 'center',
            }}>
              {i + 1}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Instagram size={13} color="var(--text-secondary)" />
                <span style={{ fontWeight: 600, fontSize: 13 }}>@{lead.instagram_handle}</span>
                {lead.full_name && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{lead.full_name}</span>
                )}
              </div>
              {lead.bio && (
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginTop: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 500,
                }}>
                  {lead.bio}
                </div>
              )}
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              minWidth: 60,
              textAlign: 'right',
            }}>
              {lead.follower_count ? lead.follower_count.toLocaleString() : '-'}
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: lead.score >= 7 ? 'var(--accent-primary)' :
                     lead.score >= 4 ? 'var(--accent-warm)' : 'var(--text-tertiary)',
              minWidth: 36,
              textAlign: 'center',
            }}>
              {lead.score}/10
            </div>

            <a
              href={`https://instagram.com/${lead.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--accent-secondary-dim)',
                color: 'var(--accent-secondary)',
                border: '1px solid var(--accent-secondary)30',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 12px',
                fontSize: 11,
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              <ExternalLink size={12} /> Open
            </a>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16,
        padding: 12,
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        color: 'var(--text-tertiary)',
        display: 'flex',
        gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserPlus size={12} /> Follow each profile
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Heart size={12} /> Like 3 recent posts
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={12} /> Comment on 1 post
        </div>
      </div>
    </GlassCard>
  )
}

function DmBatchCard({ leads, onMarkAllDmed }: {
  leads: Lead[]
  onMarkAllDmed: () => void
}) {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [marking, setMarking] = useState(false)
  const [done, setDone] = useState(false)
  const [openingAll, setOpeningAll] = useState(false)
  const [openedCount, setOpenedCount] = useState(0)
  const [openTimerRef, setOpenTimerRef] = useState<ReturnType<typeof setInterval> | null>(null)

  const handleCopy = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleMarkAll = async () => {
    setMarking(true)
    await onMarkAllDmed()
    setDone(true)
    setMarking(false)
  }

  const handleOpenAll = () => {
    if (openingAll) {
      if (openTimerRef) clearInterval(openTimerRef)
      setOpenTimerRef(null)
      setOpeningAll(false)
      return
    }

    setOpeningAll(true)
    setOpenedCount(0)

    window.open(`https://instagram.com/${leads[0].instagram_handle}`, '_blank')
    setOpenedCount(1)

    if (leads.length <= 1) {
      setOpeningAll(false)
      return
    }

    let idx = 1
    const timer = setInterval(() => {
      if (idx >= leads.length) {
        clearInterval(timer)
        setOpenTimerRef(null)
        setOpeningAll(false)
        return
      }
      window.open(`https://instagram.com/${leads[idx].instagram_handle}`, '_blank')
      idx++
      setOpenedCount(idx)
    }, 20000)

    setOpenTimerRef(timer)
  }

  const readyCount = leads.filter(l => l.dm_draft).length

  if (leads.length === 0) {
    return (
      <GlassCard style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Send size={20} color="#f59e0b" />
          <div style={{ fontSize: 18, fontWeight: 600 }}>DM Batch</div>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: 20 }}>
          No leads ready for DMs yet. Leads become ready 24 hours after engagement.
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Send size={20} color="#f59e0b" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>DM Batch</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {leads.length} leads ready — {readyCount} with draft DMs
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleOpenAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: openingAll ? 'var(--accent-warm-dim)' : 'var(--bg-elevated)',
              color: openingAll ? 'var(--accent-warm)' : 'var(--text-secondary)',
              border: `1px solid ${openingAll ? 'var(--accent-warm)' + '50' : 'var(--glass-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              fontSize: 13,
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {openingAll
              ? <><Pause size={14} /> Opening {openedCount}/{leads.length}...</>
              : <><Play size={14} /> Open All (20s apart)</>}
          </button>
          <button
            onClick={handleMarkAll}
            disabled={marking || done}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: done ? 'var(--accent-success-dim)' : 'var(--accent-warm-dim)',
              color: done ? 'var(--accent-success)' : 'var(--accent-warm)',
              border: `1px solid ${done ? 'var(--accent-success)' + '50' : 'var(--accent-warm)' + '50'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              fontSize: 13,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              cursor: marking || done ? 'default' : 'pointer',
              transition: 'all 0.2s',
              opacity: marking ? 0.6 : 1,
            }}
          >
            {done ? <><Check size={16} /> All DM'd</> :
             marking ? <><RefreshCw size={16} className="spin" /> Marking...</> :
             <><CheckCircle size={16} /> Mark All as DM'd</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {leads.map(lead => {
          const engagedAgo = lead.engaged_at
            ? Math.floor((Date.now() - new Date(lead.engaged_at).getTime()) / (1000 * 60 * 60))
            : null

          return (
            <div
              key={lead.id}
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
                padding: 16,
              }}
            >
              {/* Lead header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Instagram size={14} color="var(--text-secondary)" />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>@{lead.instagram_handle}</span>
                  {lead.full_name && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{lead.full_name}</span>
                  )}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                  }}>
                    {lead.follower_count ? lead.follower_count.toLocaleString() + ' followers' : ''}
                  </span>
                </div>
                {engagedAgo !== null && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Engaged {engagedAgo < 48 ? `${engagedAgo}h ago` : `${Math.floor(engagedAgo / 24)}d ago`}
                  </span>
                )}
              </div>

              {/* DM Draft */}
              {lead.dm_draft ? (
                <div style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--glass-border)',
                  padding: 14,
                  marginBottom: 10,
                }}>
                  <div style={{
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {lead.dm_draft}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--accent-danger-dim)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--accent-danger)30',
                  padding: 12,
                  marginBottom: 10,
                  fontSize: 12,
                  color: 'var(--accent-danger)',
                }}>
                  DM draft not generated. Run: <code style={{ fontFamily: 'var(--font-mono)' }}>python3 jakub/execution/generate_dm_drafts.py</code>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {lead.dm_draft && (
                  <button
                    onClick={() => handleCopy(lead.id, lead.dm_draft!)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: copiedId === lead.id ? 'var(--accent-success-dim)' : 'var(--accent-warm-dim)',
                      color: copiedId === lead.id ? 'var(--accent-success)' : 'var(--accent-warm)',
                      border: `1px solid ${copiedId === lead.id ? 'var(--accent-success)' : 'var(--accent-warm)'}30`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 14px',
                      fontSize: 12,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {copiedId === lead.id ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy DM</>}
                  </button>
                )}
                <a
                  href={`https://instagram.com/${lead.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--accent-secondary-dim)',
                    color: 'var(--accent-secondary)',
                    border: '1px solid var(--accent-secondary)30',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    fontSize: 12,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <ExternalLink size={13} /> Open Profile
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

function DailyTasksSidebar({ engageBatch, dmBatch, todayEngaged, todayDmed }: {
  engageBatch: Lead[]
  dmBatch: Lead[]
  todayEngaged: number
  todayDmed: number
}) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div style={{
      width: 280,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Date header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Today's Tasks
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
          {dateStr}
        </div>
      </div>

      {/* Step 1: Engage */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            background: '#6366f1' + '20',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: '#6366f1',
            fontFamily: 'var(--font-mono)',
          }}>
            STEP 1
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Engage</span>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-tertiary)',
            marginBottom: 4,
          }}>
            <span>Follow + Like + Comment</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.min(todayEngaged, DAILY_ENGAGE_LIMIT)}/{DAILY_ENGAGE_LIMIT}</span>
          </div>
          <div style={{
            height: 6,
            background: 'var(--bg-elevated)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min((todayEngaged / DAILY_ENGAGE_LIMIT) * 100, 100)}%`,
              background: '#6366f1',
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {engageBatch.length > 0
            ? `${engageBatch.length} profiles ready`
            : todayEngaged >= DAILY_ENGAGE_LIMIT ? 'Done for today' : 'No new leads'}
        </div>
      </div>

      {/* Step 2: DM */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            background: '#f59e0b' + '20',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: '#f59e0b',
            fontFamily: 'var(--font-mono)',
          }}>
            STEP 2
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Send DMs</span>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-tertiary)',
            marginBottom: 4,
          }}>
            <span>Copy-paste DMs</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {dmBatch.length > 0 || todayDmed > 0
                ? `${todayDmed}/${dmBatch.length + todayDmed}`
                : '—'}
            </span>
          </div>
          <div style={{
            height: 6,
            background: 'var(--bg-elevated)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: dmBatch.length + todayDmed > 0 ? `${(todayDmed / (dmBatch.length + todayDmed)) * 100}%` : '0%',
              background: '#f59e0b',
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {dmBatch.length > 0
            ? `${dmBatch.length} leads waiting for DM`
            : todayDmed > 0 ? `${todayDmed} DM'd today` : 'No leads ready for DMs'}
        </div>
      </div>

      {/* Step 3: Follow Up */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            background: '#00e5c8' + '20',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: '#00e5c8',
            fontFamily: 'var(--font-mono)',
          }}>
            STEP 3
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Follow Up</span>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Check replies and update statuses in Pipeline view
        </div>
      </div>

      {/* Daily limits info */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Daily Limits
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><UserPlus size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Follows</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>max 20/day</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><Heart size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Likes</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>max 60/day</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><MessageSquare size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Comments</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>1 per person</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><Send size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> DMs</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>max 20/day</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PIN Gate ───

const CORRECT_PIN = '2635'

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = () => {
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem('pipeline_unlocked', '1')
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setPin('')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '48px 40px',
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-card)',
        textAlign: 'center',
        width: 340,
        animation: shake ? 'shake 0.4s ease' : undefined,
      }}>
        <div style={{
          background: 'var(--accent-primary-dim)',
          borderRadius: 'var(--radius-md)',
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Lock size={24} color="var(--accent-primary)" />
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Outreach Pipeline</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>Enter PIN to continue</div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: 48,
                height: 56,
                background: 'var(--bg-elevated)',
                border: `1px solid ${error ? 'var(--accent-danger)' : pin.length === i ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                transition: 'border-color 0.2s',
              }}
            >
              {pin[i] ? '\u2022' : ''}
            </div>
          ))}
        </div>

        <input
          type="tel"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4)
            setPin(val)
            setError(false)
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && pin.length === 4) handleSubmit() }}
          autoFocus
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 240, margin: '0 auto' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => {
            if (key === null) return <div key={i} />
            return (
              <button
                key={i}
                onClick={() => {
                  if (key === 'del') {
                    setPin(p => p.slice(0, -1))
                    setError(false)
                  } else {
                    const next = pin + key
                    if (next.length <= 4) {
                      setPin(next)
                      setError(false)
                      if (next.length === 4) {
                        setTimeout(() => {
                          if (next === CORRECT_PIN) {
                            sessionStorage.setItem('pipeline_unlocked', '1')
                            onUnlock()
                          } else {
                            setError(true)
                            setShake(true)
                            setTimeout(() => setShake(false), 500)
                            setPin('')
                          }
                        }, 150)
                      }
                    }
                  }
                }}
                style={{
                  height: 52,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: key === 'del' ? 14 : 20,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card-hover)'
                  e.currentTarget.style.borderColor = 'var(--glass-border-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.borderColor = 'var(--glass-border)'
                }}
              >
                {key === 'del' ? '\u2190' : key}
              </button>
            )
          })}
        </div>

        {error && (
          <div style={{ color: 'var(--accent-danger)', fontSize: 13, marginTop: 16, fontWeight: 500 }}>
            Wrong PIN. Try again.
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}

// ─── Main App ───

function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('tasks')
  const [engageBatchIds, setEngageBatchIds] = useState<number[] | null>(null)
  const [filterStage, setFilterStage] = useState<PipelineStage | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'score' | 'followers' | 'recent'>('score')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await supabaseFetch('instagram_leads?select=*&order=score.desc&limit=1000')
      setLeads(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Snapshot the engage batch once on first load — no auto-refilling
  useEffect(() => {
    if (engageBatchIds !== null || leads.length === 0) return
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const alreadyEngagedToday = leads.filter(l => l.engaged_at && new Date(l.engaged_at).getTime() >= todayStart.getTime()).length
    const slots = Math.max(0, DAILY_ENGAGE_LIMIT - alreadyEngagedToday)
    const ids = leads.filter(l => l.status === 'new').sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, slots).map(l => l.id)
    setEngageBatchIds(ids)
  }, [leads, engageBatchIds])

  const handleStatusChange = async (id: number, newStatus: PipelineStage) => {
    const updates: Record<string, string | null> = { status: newStatus }
    const now = new Date().toISOString()

    if (newStatus === 'engaged') updates.engaged_at = now
    if (newStatus === 'dmed') updates.dmed_at = now

    try {
      await supabaseFetch(`instagram_leads?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } as Lead : l))
      fetchLeads()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  // Batch update helper
  const batchUpdateStatus = async (ids: number[], newStatus: PipelineStage, timestampField?: string) => {
    const now = new Date().toISOString()
    const updates: Record<string, string> = { status: newStatus }
    if (timestampField) updates[timestampField] = now

    try {
      const idList = ids.join(',')
      await supabaseFetch(`instagram_leads?id=in.(${idList})`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setLeads(prev => prev.map(l =>
        ids.includes(l.id) ? { ...l, ...updates } as Lead : l
      ))
    } catch (err) {
      console.error('Failed to batch update:', err)
    }
  }

  // ─── Computed data ───
  const counts: Record<string, number> = {}
  for (const stage of STAGES) counts[stage.key] = 0
  for (const lead of leads) {
    const s = lead.status || 'new'
    counts[s] = (counts[s] || 0) + 1
  }

  // Count how many were engaged/dmed today (for sidebar progress + daily cap)
  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const todayEngaged = useMemo(() =>
    leads.filter(l => {
      if (!l.engaged_at) return false
      return new Date(l.engaged_at).getTime() >= todayStart
    }).length,
    [leads, todayStart]
  )

  const todayDmed = useMemo(() =>
    leads.filter(l => {
      if (!l.dmed_at) return false
      return new Date(l.dmed_at).getTime() >= todayStart
    }).length,
    [leads, todayStart]
  )

  // Daily activity data for chart (last 90 days — chart filters internally)
  const dailyActivity = useMemo(() => {
    const days: { date: string; label: string; engaged: number; dmed: number }[] = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const dayStart = d.getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000

      const engaged = leads.filter(l => {
        if (!l.engaged_at) return false
        const t = new Date(l.engaged_at).getTime()
        return t >= dayStart && t < dayEnd
      }).length

      const dmed = leads.filter(l => {
        if (!l.dmed_at) return false
        const t = new Date(l.dmed_at).getTime()
        return t >= dayStart && t < dayEnd
      }).length

      days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        engaged,
        dmed,
      })
    }
    return days
  }, [leads])

  // Today's engage batch: snapshotted on load, shrinks as leads are marked dead/engaged
  const engageBatch = useMemo(() =>
    engageBatchIds === null
      ? []
      : leads.filter(l => engageBatchIds.includes(l.id) && l.status === 'new'),
    [leads, engageBatchIds]
  )

  // DM-ready batch: leads with status=engaged (no wait time for demo)
  const dmBatch = useMemo(() => {
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
    return leads
      .filter(l => {
        if (l.status !== 'engaged') return false
        if (!l.engaged_at) return false
        return new Date(l.engaged_at).getTime() < todayMidnight.getTime()
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [leads])

  // Pipeline view filters
  const filtered = leads
    .filter(l => filterStage === 'all' || l.status === filterStage)
    .filter(l => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        l.instagram_handle.toLowerCase().includes(q) ||
        (l.full_name || '').toLowerCase().includes(q) ||
        (l.bio || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
      if (sortBy === 'followers') return (b.follower_count || 0) - (a.follower_count || 0)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

  const usLeads = leads.filter(l => l.likely_us).length
  const activeLeads = leads.filter(l => !['dead', 'closed'].includes(l.status)).length
  const conversionRate = leads.length > 0
    ? ((counts['closed'] || 0) / leads.length * 100).toFixed(1)
    : '0.0'

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{
        padding: '32px 40px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Target size={28} color="var(--accent-primary)" />
              <h1 style={{ fontSize: 26, fontWeight: 700 }}>Outreach Pipeline</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, marginLeft: 40 }}>
              Instagram DM outreach tracker
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* View toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            padding: 3,
            border: '1px solid var(--glass-border)',
          }}>
            <button
              onClick={() => setView('tasks')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: view === 'tasks' ? 'var(--accent-primary)' + '18' : 'transparent',
                color: view === 'tasks' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                fontSize: 13,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <ListChecks size={15} /> Daily Tasks
            </button>
            <button
              onClick={() => setView('pipeline')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: view === 'pipeline' ? 'var(--accent-primary)' + '18' : 'transparent',
                color: view === 'pipeline' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                fontSize: 13,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Target size={15} /> Pipeline
            </button>
          </div>

          <button
            onClick={fetchLeads}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '16px 40px 0' }}>
          <GlassCard style={{ borderColor: 'var(--accent-danger)' }}>
            <div style={{ color: 'var(--accent-danger)', fontSize: 14 }}>
              {error}
            </div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 8 }}>
              Make sure the <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>instagram_leads</code> table exists in Supabase.
            </div>
          </GlassCard>
        </div>
      )}

      {/* Loading */}
      {loading && leads.length === 0 ? (
        <div style={{ padding: '40px' }}>
          <GlassCard>
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div>Loading leads from Supabase...</div>
            </div>
          </GlassCard>
        </div>
      ) : view === 'tasks' ? (
        /* ═══════════════════════════════════════════════ */
        /* ═══ DAILY TASKS VIEW ═══════════════════════ */
        /* ═══════════════════════════════════════════════ */
        <div style={{
          padding: '24px 40px 40px',
          display: 'flex',
          gap: 24,
          alignItems: 'flex-start',
        }}>
          {/* Sidebar */}
          <DailyTasksSidebar
            engageBatch={engageBatch}
            dmBatch={dmBatch}
            todayEngaged={todayEngaged}
            todayDmed={todayDmed}
          />

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <EngageBatchCard
              leads={engageBatch}
              dailyLimitReached={todayEngaged >= DAILY_ENGAGE_LIMIT}
              onMarkAllEngaged={() => batchUpdateStatus(
                engageBatch.map(l => l.id),
                'engaged',
                'engaged_at'
              )}
            />

            <DmBatchCard
              leads={dmBatch}
              onMarkAllDmed={() => batchUpdateStatus(
                dmBatch.map(l => l.id),
                'dmed',
                'dmed_at'
              )}
            />
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════ */
        /* ═══ PIPELINE VIEW (original) ═══════════════ */
        /* ═══════════════════════════════════════════════ */
        <div style={{ padding: '24px 40px 40px' }}>
          {/* Top stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            <StatCard label="Total Leads" value={leads.length} color="var(--text-primary)" icon={Users} />
            <StatCard label="Active Pipeline" value={activeLeads} sub="Excluding dead & closed" color="var(--accent-primary)" icon={TrendingUp} />
            <StatCard label="US-Based" value={usLeads} sub={`${leads.length > 0 ? ((usLeads / leads.length) * 100).toFixed(0) : 0}% of total`} color="var(--accent-secondary)" icon={Target} />
            <StatCard label="Conversion Rate" value={`${conversionRate}%`} sub={`${counts['closed'] || 0} closed`} color="var(--accent-success)" icon={CheckCircle} />
          </div>

          {/* Pipeline visualization */}
          <div style={{ marginBottom: 24 }}>
            <PipelineBar stages={STAGES} counts={counts} />
          </div>

          {/* Conversion funnel */}
          <GlassCard style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Conversion Funnel</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {STAGES.filter(s => s.key !== 'dead').map((stage, i, arr) => (
                <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: 28, fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: stage.color,
                    }}>
                      {counts[stage.key] || 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{stage.label}</div>
                    {i > 0 && counts[arr[i - 1].key] > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {((counts[stage.key] || 0) / counts[arr[i - 1].key] * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight size={16} color="var(--text-tertiary)" />
                  )}
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Daily activity chart */}
          <DailyActivityChart data={dailyActivity} />

          {/* Lead list header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              Leads ({filtered.length})
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
              }}>
                <Search size={14} color="var(--text-tertiary)" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontFamily: 'var(--font-display)',
                    width: 160,
                  }}
                />
              </div>

              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value as PipelineStage | 'all')}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 14px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">All stages</option>
                {STAGES.map(s => (
                  <option key={s.key} value={s.key}>{s.label} ({counts[s.key] || 0})</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'score' | 'followers' | 'recent')}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 14px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="score">Sort by Score</option>
                <option value="followers">Sort by Followers</option>
                <option value="recent">Sort by Recent</option>
              </select>
            </div>
          </div>

          {/* Lead list */}
          {filtered.length === 0 ? (
            <GlassCard>
              <div style={{
                textAlign: 'center',
                padding: 40,
                color: 'var(--text-secondary)',
              }}>
                <Instagram size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No leads yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  Run <code style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-elevated)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}>python3 jakub/execution/find_instagram_leads.py --output supabase</code> to find leads
                </div>
              </div>
            </GlassCard>
          ) : (
            <div>
              {filtered.map(lead => (
                <LeadRow key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        select option {
          background: #0c1017;
          color: #8b92a5;
        }
        code {
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </div>
  )
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('pipeline_unlocked') === '1')

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />
  }

  return <Dashboard />
}
