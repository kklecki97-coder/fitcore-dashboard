import { useState, useRef, useEffect } from 'react'
import {
  Instagram, ExternalLink, Send, Copy, Check, CheckCircle, RefreshCw, Play, Pause, Undo2,
} from 'lucide-react'
import GlassCard from './GlassCard'
import type { Lead } from '../types'

function DmBatchCard({ leads, onMarkAllDmed, onCommitDmed, onUndoDmed }: {
  leads: Lead[]
  onMarkAllDmed: () => Promise<number[]>
  onCommitDmed: (ids: number[]) => void
  onUndoDmed: (ids: number[]) => Promise<void>
}) {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [marking, setMarking] = useState(false)
  const [done, setDone] = useState(false)
  const [undoCountdown, setUndoCountdown] = useState(0)
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const markedIdsRef = useRef<number[]>([])
  const markedCountRef = useRef(0)
  const [openingAll, setOpeningAll] = useState(false)
  const [openedCount, setOpenedCount] = useState(0)
  const [openTimerRef, setOpenTimerRef] = useState<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current)
    }
  }, [])

  const handleCopy = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
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
    const ids = await onMarkAllDmed()
    markedIdsRef.current = ids
    markedCountRef.current = ids.length
    setDone(true)
    setMarking(false)
    setUndoCountdown(10)
    undoTimerRef.current = setInterval(() => {
      setUndoCountdown(prev => {
        if (prev <= 1) {
          if (undoTimerRef.current) clearInterval(undoTimerRef.current)
          undoTimerRef.current = null
          // Undo window expired — commit local state
          onCommitDmed(markedIdsRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleUndo = async () => {
    if (undoTimerRef.current) clearInterval(undoTimerRef.current)
    undoTimerRef.current = null
    setUndoCountdown(0)
    setDone(false)
    const ids = markedIdsRef.current
    markedIdsRef.current = []
    markedCountRef.current = 0
    await onUndoDmed(ids)
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
    }, 30000)

    setOpenTimerRef(timer)
  }

  // Show undo state when done and countdown active — leads prop still has data since we didn't update local state
  if (done && undoCountdown > 0) {
    const count = markedCountRef.current
    return (
      <GlassCard style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Check size={20} color="#22c55e" />
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#22c55e' }}>
                {count} leads marked as DM'd
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Accidentally clicked? Undo within {undoCountdown} seconds
              </div>
            </div>
          </div>
          <button
            onClick={handleUndo}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#ef444420',
              color: '#ef4444',
              border: '1px solid #ef444450',
              borderRadius: 'var(--radius-md)',
              padding: '12px 24px',
              fontSize: 14,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Undo2 size={16} /> Undo ({undoCountdown}s)
          </button>
        </div>
      </GlassCard>
    )
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
              {leads.length} leads ready - {readyCount} with draft DMs
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
              : <><Play size={14} /> Open All (30s apart)</>}
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

export default DmBatchCard
