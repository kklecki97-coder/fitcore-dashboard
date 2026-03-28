import { useState } from 'react'
import {
  Heart, Instagram, ExternalLink, UserPlus, MessageSquare,
  CheckCircle, RefreshCw, Check, Play, Pause,
} from 'lucide-react'
import GlassCard from './GlassCard'
import type { Lead } from '../types'

function EngageBatchCard({ leads, onMarkAllTouched, dailyLimitReached }: {
  leads: Lead[]
  onMarkAllTouched: () => void
  dailyLimitReached: boolean
}) {
  const [marking, setMarking] = useState(false)
  const [done, setDone] = useState(false)
  const [openingAll, setOpeningAll] = useState(false)
  const [openedCount, setOpenedCount] = useState(0)
  const [openTimerRef, setOpenTimerRef] = useState<ReturnType<typeof setInterval> | null>(null)

  // Determine what touch this batch is on (all leads in a batch should be at the same touch level)
  const currentTouch = Math.min(...leads.map(l => (l.touch_count || 0))) + 1
  const touchLabels: Record<number, { title: string; desc: string; btn: string }> = {
    1: { title: 'Touch 1 — First Contact', desc: 'Follow + Like 2-3 posts + Comment on 1 post', btn: 'Mark Touch 1 Done' },
    2: { title: 'Touch 2 — Stay Visible', desc: 'Like 2-3 more posts + Comment on another post', btn: 'Mark Touch 2 Done' },
    3: { title: 'Touch 3 — Final Warmup', desc: 'Like + Comment again — after this they move to DM queue', btn: 'Mark Touch 3 Done' },
  }
  const touchInfo = touchLabels[currentTouch] || touchLabels[1]

  const handleMarkAll = async () => {
    setMarking(true)
    await onMarkAllTouched()
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
    }, 10000)

    setOpenTimerRef(timer)
  }

  if (leads.length === 0) {
    return (
      <GlassCard style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Heart size={20} color="#6366f1" />
          <div style={{ fontSize: 18, fontWeight: 600 }}>Warmup Batch</div>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: 20 }}>
          {dailyLimitReached ? (
            <>
              <div style={{ color: 'var(--accent-success)', fontWeight: 600, marginBottom: 6 }}>
                <Check size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Today's touch done!
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Come back tomorrow for the next touch. Same batch will show up.
              </div>
            </>
          ) : (
            <>No leads to warm up. Run the scraper to add more.</>
          )}
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Heart size={20} color="#6366f1" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{touchInfo.title}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3].map(t => (
                  <div key={t} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: t <= (currentTouch - 1) ? '#6366f1' : t === currentTouch ? '#6366f1' + '60' : 'var(--glass-border)',
                    border: t === currentTouch ? '2px solid #6366f1' : 'none',
                    boxSizing: 'border-box',
                  }} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {leads.length} profiles — {touchInfo.desc}
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
              : <><Play size={14} /> Open All (10s apart)</>}
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
            {done ? <><Check size={16} /> Touch {currentTouch} Done!</> :
             marking ? <><RefreshCw size={16} className="spin" /> Marking...</> :
             <><CheckCircle size={16} /> {touchInfo.btn}</>}
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

export default EngageBatchCard
