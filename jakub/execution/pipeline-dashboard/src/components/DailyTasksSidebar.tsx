import {
  Heart, UserPlus, MessageSquare, Send,
} from 'lucide-react'
import type { Lead } from '../types'

function DailyTasksSidebar({ engageBatch, dmBatch, followUpLeads, todayDmed, touchDoneForToday, warmupComplete, onMarkReplied }: {
  engageBatch: Lead[]
  dmBatch: Lead[]
  followUpLeads: Lead[]
  todayDmed: number
  touchDoneForToday: boolean
  warmupComplete: boolean
  onMarkReplied: (id: number) => void
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
          <span style={{ fontSize: 13, fontWeight: 600 }}>Warmup</span>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-tertiary)',
            marginBottom: 4,
          }}>
            <span>3-touch warmup</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{warmupComplete ? '3/3' : engageBatch.length > 0 ? `${Math.min(...engageBatch.map(l => l.touch_count || 0)) + 1}/3` : '-'}</span>
          </div>
          <div style={{
            height: 6,
            background: 'var(--bg-elevated)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: warmupComplete ? '100%' : engageBatch.length > 0 ? `${((Math.min(...engageBatch.map(l => l.touch_count || 0))) / 3) * 100}%` : '0%',
              background: warmupComplete ? '#22c55e' : '#6366f1',
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {warmupComplete
            ? 'All 3 touches complete \u2713'
            : engageBatch.length > 0
              ? touchDoneForToday
                ? 'Done for today \u2713'
                : `${engageBatch.length} profiles — touch ${Math.min(...engageBatch.map(l => l.touch_count || 0)) + 1} of 3`
              : 'No leads to warm up'}
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
                : '-'}
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
          {followUpLeads.length > 0 && (
            <span style={{ fontSize: 11, color: '#00e5c8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {followUpLeads.length}
            </span>
          )}
        </div>

        {followUpLeads.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            No DM'd leads awaiting reply
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {followUpLeads.slice(0, 8).map(lead => {
              const daysAgo = lead.dmed_at ? Math.floor((Date.now() - new Date(lead.dmed_at).getTime()) / 86400000) : 0
              return (
                <div key={lead.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)', fontSize: 11,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <a
                      href={`https://instagram.com/${lead.instagram_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {lead.instagram_handle}
                    </a>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 10, flexShrink: 0 }}>
                      {daysAgo === 0 ? 'today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`}
                    </span>
                  </div>
                  <button
                    onClick={() => onMarkReplied(lead.id)}
                    style={{
                      background: '#00e5c8' + '18', border: '1px solid #00e5c8' + '40',
                      borderRadius: 'var(--radius-sm)', padding: '3px 8px',
                      color: '#00e5c8', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-display)', whiteSpace: 'nowrap',
                    }}
                  >
                    Replied
                  </button>
                </div>
              )
            })}
            {followUpLeads.length > 8 && (
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                +{followUpLeads.length - 8} more in Pipeline view
              </div>
            )}
          </div>
        )}
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

export default DailyTasksSidebar
