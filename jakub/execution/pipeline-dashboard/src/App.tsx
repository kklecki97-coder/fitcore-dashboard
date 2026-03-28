import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Users, MessageCircle, CheckCircle,
  RefreshCw, Instagram, Target, TrendingUp, ArrowRight, ListChecks,
  Heart, Send, Check,
} from 'lucide-react'
import type { Lead, PipelineStage, ViewMode, Account } from './types'
import { STAGES, ACCOUNTS, DAILY_ENGAGE_LIMIT, supabaseFetch } from './types'
import GlassCard from './components/GlassCard'
import StatCard from './components/StatCard'
import PipelineBar from './components/PipelineBar'
import LeadRow from './components/LeadRow'
import DailyActivityChart from './components/DailyActivityChart'
import EngageBatchCard from './components/EngageBatchCard'
import DmBatchCard from './components/DmBatchCard'
import DailyTasksSidebar from './components/DailyTasksSidebar'
import AccountSwitcher from './components/AccountSwitcher'
import PinGate from './components/PinGate'

// ─── Main App ───

function Dashboard() {
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('tasks')
  const [engageBatchIds, setEngageBatchIds] = useState<Record<Account, number[] | null>>({ jakub: null, kamil: null })
  const [filterStage, setFilterStage] = useState<PipelineStage | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'score' | 'followers' | 'recent'>('score')
  const [account, setAccount] = useState<Account>(() => (localStorage.getItem('pipeline_account') as Account) || 'jakub')

  const [confirmSwitch, setConfirmSwitch] = useState<Account | null>(null)

  const handleAccountChange = (a: Account) => {
    if (a === account) return
    setConfirmSwitch(a)
  }

  const confirmAccountSwitch = () => {
    if (confirmSwitch) {
      setAccount(confirmSwitch)
      localStorage.setItem('pipeline_account', confirmSwitch)
      setConfirmSwitch(null)
    }
  }

  // Leads that belong to this account: assigned to them OR worked by them
  const leads = useMemo(() => allLeads.filter(l =>
    l.account === account || l.engaged_by === account || l.dmed_by === account
  ), [allLeads, account])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await supabaseFetch('instagram_leads?select=*&order=score.desc&limit=2000')
      setAllLeads(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
      setAllLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Auto-assign unassigned new leads evenly between operators (persists to Supabase)
  useEffect(() => {
    if (allLeads.length === 0) return
    const unassigned = allLeads.filter(l => l.status === 'new' && !l.account)
    if (unassigned.length === 0) return

    // Sort by score descending, interleave assignment
    const sorted = [...unassigned].sort((a, b) => (b.score || 0) - (a.score || 0))
    const jakubCount = allLeads.filter(l => l.account === 'jakub' && l.status === 'new').length
    const kamilCount = allLeads.filter(l => l.account === 'kamil' && l.status === 'new').length

    const assignments: { id: number; account: string }[] = []
    let jCount = jakubCount
    let kCount = kamilCount

    for (const lead of sorted) {
      if (jCount <= kCount) {
        assignments.push({ id: lead.id, account: 'jakub' })
        jCount++
      } else {
        assignments.push({ id: lead.id, account: 'kamil' })
        kCount++
      }
    }

    // Update local state immediately
    setAllLeads(prev => prev.map(l => {
      const a = assignments.find(x => x.id === l.id)
      return a ? { ...l, account: a.account } : l
    }))

    // Persist to Supabase in background
    for (const a of assignments) {
      supabaseFetch(`instagram_leads?id=eq.${a.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ account: a.account }),
      }).catch(err => console.error('Failed to assign lead:', err))
    }
  }, [allLeads.length]) // only run when lead count changes (new leads loaded)

  // Snapshot engage batches - now based on pre-assigned leads
  // Wait until all leads are assigned (no unassigned new leads)
  useEffect(() => {
    if (allLeads.length === 0) return
    const hasUnassigned = allLeads.some(l => l.status === 'new' && !l.account)
    if (hasUnassigned) return // wait for auto-assign to finish

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const ts = todayStart.getTime()

    const jakubEngagedToday = allLeads.filter(l => l.engaged_by === 'jakub' && l.last_touch_at && new Date(l.last_touch_at).getTime() >= ts).length
    const kamilEngagedToday = allLeads.filter(l => l.engaged_by === 'kamil' && l.last_touch_at && new Date(l.last_touch_at).getTime() >= ts).length

    const jakubSlots = Math.max(0, DAILY_ENGAGE_LIMIT - jakubEngagedToday)
    const kamilSlots = Math.max(0, DAILY_ENGAGE_LIMIT - kamilEngagedToday)

    // Each operator only sees leads assigned to them
    const jakubNew = allLeads.filter(l => l.status === 'new' && l.account === 'jakub').sort((a, b) => (b.score || 0) - (a.score || 0))
    const kamilNew = allLeads.filter(l => l.status === 'new' && l.account === 'kamil').sort((a, b) => (b.score || 0) - (a.score || 0))

    setEngageBatchIds({
      jakub: jakubNew.slice(0, jakubSlots).map(l => l.id),
      kamil: kamilNew.slice(0, kamilSlots).map(l => l.id),
    })
  }, [allLeads])

  // Handle a single touch on a lead (warmup progression)
  const handleTouch = async (id: number) => {
    const lead = allLeads.find(l => l.id === id)
    if (!lead) return

    const now = new Date().toISOString()
    const currentTouches = lead.touch_count || 0
    const newTouchCount = currentTouches + 1
    const touchField = `touch${newTouchCount}_at`

    const updates: Record<string, string | number | null> = {
      touch_count: newTouchCount,
      [touchField]: now,
      last_touch_at: now,
      engaged_by: account,
    }

    if (newTouchCount === 1) {
      // First touch: move from new to warming
      updates.status = 'warming'
      updates.engaged_at = now
    } else if (newTouchCount >= 3) {
      // All 3 touches done: move to warm (ready for DM after cooldown)
      updates.status = 'warm'
    }

    try {
      await supabaseFetch(`instagram_leads?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setAllLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } as Lead : l))
    } catch (err) {
      console.error('Failed to record touch:', err)
    }
  }

  // Batch touch: mark all leads in batch as touched once
  const batchTouch = async (ids: number[]) => {
    for (const id of ids) {
      await handleTouch(id)
    }
    fetchLeads() // refresh after batch
  }

  const handleStatusChange = async (id: number, newStatus: PipelineStage) => {
    const updates: Record<string, string | null> = { status: newStatus }
    const now = new Date().toISOString()

    if (newStatus === 'warming') { updates.engaged_at = now; updates.engaged_by = account }
    if (newStatus === 'dmed') { updates.dmed_at = now; updates.dmed_by = account }

    try {
      await supabaseFetch(`instagram_leads?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setAllLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } as Lead : l))
      fetchLeads()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }



  // ─── Computed data (filtered to current account's work) ───
  // For pipeline counts, only show leads this account worked on (not the shared new pool)
  const accountLeads = useMemo(() => allLeads.filter(l =>
    l.account === account || l.engaged_by === account || l.dmed_by === account
  ), [allLeads, account])

  const counts: Record<string, number> = {}
  for (const stage of STAGES) counts[stage.key] = 0
  for (const lead of accountLeads) {
    const s = lead.status || 'new'
    counts[s] = (counts[s] || 0) + 1
  }

  // Count how many this account engaged/dmed today
  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])



  const todayDmed = useMemo(() =>
    allLeads.filter(l => {
      if (l.dmed_by !== account || !l.dmed_at) return false
      return new Date(l.dmed_at).getTime() >= todayStart
    }).length,
    [allLeads, account, todayStart]
  )

  // Daily activity data for chart - filtered by account
  const dailyActivity = useMemo(() => {
    const days: { date: string; label: string; engaged: number; dmed: number }[] = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const dayStart = d.getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000

      const engaged = allLeads.filter(l => {
        if (l.engaged_by !== account || !l.engaged_at) return false
        const t = new Date(l.engaged_at).getTime()
        return t >= dayStart && t < dayEnd
      }).length

      const dmed = allLeads.filter(l => {
        if (l.dmed_by !== account || !l.dmed_at) return false
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
  }, [allLeads, account])

  // Today's warmup batch: leads assigned to this account that need touches
  // Rule: only ONE touch per day. If last touch was today, show "done for today"
  const todayMidnight = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
  }, [])

  const { engageBatch, touchDoneForToday, warmupComplete } = useMemo(() => {
    // First: leads currently being warmed (touch 1 or 2 — not done yet)
    const warming = allLeads
      .filter(l => l.status === 'warming' && l.account === account && (l.touch_count || 0) < 3)
      .sort((a, b) => (b.score || 0) - (a.score || 0))

    // If warming batch exists, check if last touch was already done today
    if (warming.length > 0) {
      const lastTouched = warming.some(l => l.last_touch_at && new Date(l.last_touch_at).getTime() >= todayMidnight)
      if (lastTouched) {
        // Already touched today — don't show batch, show "done for today"
        return { engageBatch: warming, touchDoneForToday: true, warmupComplete: false }
      }
      return { engageBatch: warming, touchDoneForToday: false, warmupComplete: false }
    }

    // Check if we already did a touch today (touch 3 just completed, leads moved to warm)
    const touchedTodayCount = allLeads.filter(l =>
      l.engaged_by === account && l.last_touch_at && new Date(l.last_touch_at).getTime() >= todayMidnight
    ).length
    if (touchedTodayCount > 0) {
      // Already touched leads today — done for today, don't load new batch
      return { engageBatch: [], touchDoneForToday: true, warmupComplete: false }
    }

    // Check if there are warm leads (3/3 touches done) not yet DM'd — don't start a new batch,
    // the operator should be sending DMs to these leads instead
    const warmUndmed = allLeads.filter(l =>
      l.status === 'warm' && l.engaged_by === account && !l.dmed_at
    )
    if (warmUndmed.length > 0) {
      // Warm leads exist — no new warmup batch, DM batch takes priority
      return { engageBatch: [], touchDoneForToday: true, warmupComplete: true }
    }

    // Check if DMs were sent today — don't start a new warmup batch on the same day
    const dmedTodayCount = allLeads.filter(l =>
      l.dmed_by === account && l.dmed_at && new Date(l.dmed_at).getTime() >= todayMidnight
    ).length
    if (dmedTodayCount > 0) {
      return { engageBatch: [], touchDoneForToday: true, warmupComplete: false }
    }

    // Otherwise, pick next batch of new leads
    const ids = engageBatchIds[account]
    const newBatch = ids === null
      ? []
      : allLeads.filter(l => ids.includes(l.id) && l.status === 'new')
    return { engageBatch: newBatch, touchDoneForToday: false, warmupComplete: false }
  }, [allLeads, engageBatchIds, account, todayMidnight])

  // DM-ready batch: leads with all 3 touches done, ready next day
  // But only show DMs if there's no active warming batch — finish warmup first
  const dmBatch = useMemo(() => {
    const hasWarmingBatch = allLeads.some(l =>
      l.status === 'warming' && (l.engaged_by === account || l.account === account) && (l.touch_count || 0) < 3
    )
    if (hasWarmingBatch) return []

    return allLeads
      .filter(l => {
        if (l.status !== 'warm') return false
        if (l.engaged_by !== account) return false
        if (!l.last_touch_at) return false
        // Ready next day: last touch must be before today
        return new Date(l.last_touch_at).getTime() < todayMidnight
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [allLeads, account, todayMidnight])

  // Touch history: day-by-day calendar from first touch to today, including missed days
  // Activity history: touches + DMs, day by day
  const touchHistory = useMemo(() => {
    const dayMap: Record<string, { touch: number; count: number }> = {}
    for (const lead of allLeads) {
      if (lead.engaged_by !== account && lead.account !== account) continue
      for (const t of [1, 2, 3] as const) {
        const ts = lead[`touch${t}_at` as 'touch1_at' | 'touch2_at' | 'touch3_at']
        if (!ts) continue
        const day = ts.slice(0, 10)
        const key = `${day}-${t}`
        if (!dayMap[key]) dayMap[key] = { touch: t, count: 0 }
        dayMap[key].count++
      }
      // Track DMs as touch 4 (special value for display)
      if (lead.dmed_by === account && lead.dmed_at) {
        const day = lead.dmed_at.slice(0, 10)
        const key = `${day}-4`
        if (!dayMap[key]) dayMap[key] = { touch: 4, count: 0 }
        dayMap[key].count++
      }
    }

    const activeDates = Object.keys(dayMap).map(k => k.slice(0, 10))
    if (activeDates.length === 0) return []

    // Fill every day from first touch to today
    const firstDate = activeDates.sort()[0]
    const today = new Date().toISOString().slice(0, 10)
    const rows: { date: string; touch: number | null; count: number }[] = []
    const cur = new Date(firstDate + 'T12:00:00')
    const end = new Date(today + 'T12:00:00')

    while (cur <= end) {
      const day = cur.toISOString().slice(0, 10)
      const entry = Object.entries(dayMap).find(([k]) => k.startsWith(day))
      if (entry) {
        rows.push({ date: day, touch: entry[1].touch, count: entry[1].count })
      } else {
        rows.push({ date: day, touch: null, count: 0 })
      }
      cur.setDate(cur.getDate() + 1)
    }

    return rows.reverse()
  }, [allLeads, account])

  // Follow-up leads: DM'd by this account, awaiting reply
  const followUpLeads = useMemo(() =>
    allLeads.filter(l => l.status === 'dmed' && l.dmed_by === account)
      .sort((a, b) => new Date(a.dmed_at || 0).getTime() - new Date(b.dmed_at || 0).getTime()),
    [allLeads, account]
  )

  // Pipeline view filters - show leads this account worked + new leads
  const filtered = accountLeads
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

  const usLeads = accountLeads.filter(l => l.likely_us).length
  const conversionRate = accountLeads.length > 0
    ? ((counts['closed'] || 0) / accountLeads.length * 100).toFixed(1)
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
              <h1 style={{ fontSize: 26, fontWeight: 700 }}>FitCore Outreach</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, marginLeft: 40 }}>
              Polish fitness coaches · Instagram DM pipeline
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Account switcher */}
          <AccountSwitcher account={account} onChange={handleAccountChange} />

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

      {/* Pipeline Summary + Progress */}
      {!loading && allLeads.length > 0 && (
        <div style={{ padding: '16px 40px 0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Pipeline stats */}
          {[
            { label: 'Total', value: accountLeads.length, color: 'var(--text-secondary)' },
            { label: 'New', value: counts['new'] || 0, color: '#6b7280' },
            { label: 'Warming', value: counts['warming'] || 0, color: '#6366f1' },
            { label: 'Ready', value: counts['warm'] || 0, color: '#f59e0b' },
            { label: "DM'd", value: counts['dmed'] || 0, color: '#fb923c' },
            { label: 'Replied', value: counts['replied'] || 0, color: '#00e5c8' },
            { label: 'Closed', value: counts['closed'] || 0, color: '#22c55e' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70,
            }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</span>
            </div>
          ))}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Today's progress for both operators */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)', padding: '10px 16px',
            display: 'flex', gap: 20, alignItems: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today</div>
            {ACCOUNTS.map(a => {
              const eng = allLeads.filter(l => l.engaged_by === a.key && l.last_touch_at && new Date(l.last_touch_at).getTime() >= todayStart).length
              const dm = allLeads.filter(l => l.dmed_by === a.key && l.dmed_at && new Date(l.dmed_at).getTime() >= todayStart).length
              return (
                <div key={a.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: a.color }}>{a.label}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {eng}/{DAILY_ENGAGE_LIMIT} eng · {dm} DM
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && allLeads.length === 0 ? (
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
            followUpLeads={followUpLeads}
            todayDmed={todayDmed}
            touchDoneForToday={touchDoneForToday}
            warmupComplete={warmupComplete}
            onMarkReplied={(id) => handleStatusChange(id, 'replied')}
          />

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Today's Plan Card */}
            <GlassCard style={{ marginBottom: 20, borderColor: 'var(--accent-primary)' + '40' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'var(--accent-primary)' + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Target size={16} color="var(--accent-primary)" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Today's Plan</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Warmup task */}
                {engageBatch.length > 0 && (() => {
                  const touchNum = Math.min(...engageBatch.map(l => (l.touch_count || 0))) + 1
                  const isFirstTouch = touchNum === 1

                  if (touchDoneForToday) {
                    return (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        background: 'rgba(34, 197, 94, 0.08)', borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                      }}>
                        <Check size={16} color="#22c55e" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
                            Touch {touchNum - 1}/3 done for today!
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            Come back tomorrow for Touch {touchNum}/3 — same {engageBatch.length} profiles
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: '#6366f1' + '10', borderRadius: 'var(--radius-sm)',
                      border: '1px solid #6366f1' + '25',
                    }}>
                      <Heart size={16} color="#6366f1" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          Warmup — Touch {touchNum}/3
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {isFirstTouch
                            ? `Follow ${engageBatch.length} profiles + Like 2-3 posts each + Comment on 1 post each`
                            : `Like 2-3 posts + Comment on 1 post for ${engageBatch.length} profiles`}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: '#6366f1',
                        fontFamily: 'var(--font-mono)',
                        background: '#6366f1' + '18', padding: '4px 8px', borderRadius: 6,
                      }}>
                        {engageBatch.length} leads
                      </div>
                    </div>
                  )
                })()}

                {/* DM task */}
                {dmBatch.length > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: '#f59e0b' + '10', borderRadius: 'var(--radius-sm)',
                    border: '1px solid #f59e0b' + '25',
                  }}>
                    <Send size={16} color="#f59e0b" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Send DMs
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        Copy-paste personalized DMs to {dmBatch.length} warmed-up leads
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: '#f59e0b',
                      fontFamily: 'var(--font-mono)',
                      background: '#f59e0b' + '18', padding: '4px 8px', borderRadius: 6,
                    }}>
                      {dmBatch.length} leads
                    </div>
                  </div>
                )}

                {/* Follow-up task */}
                {followUpLeads.length > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: '#00e5c8' + '10', borderRadius: 'var(--radius-sm)',
                    border: '1px solid #00e5c8' + '25',
                  }}>
                    <MessageCircle size={16} color="#00e5c8" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Check Replies
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        Check if any DM'd leads replied — mark as replied
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: '#00e5c8',
                      fontFamily: 'var(--font-mono)',
                      background: '#00e5c8' + '18', padding: '4px 8px', borderRadius: 6,
                    }}>
                      {followUpLeads.length} pending
                    </div>
                  </div>
                )}

                {/* Nothing to do */}
                {engageBatch.length === 0 && dmBatch.length === 0 && followUpLeads.length === 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  }}>
                    <Check size={16} color="var(--accent-success)" />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      All caught up! No tasks for today.
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            <EngageBatchCard
              leads={touchDoneForToday ? [] : engageBatch}
              dailyLimitReached={touchDoneForToday}
              onMarkAllTouched={() => batchTouch(engageBatch.map(l => l.id))}
            />

            <DmBatchCard
              leads={dmBatch}
              onMarkAllDmed={async () => {
                // Only write to Supabase — do NOT update local state yet
                const ids = dmBatch.map(l => l.id)
                const now = new Date().toISOString()
                const idList = ids.join(',')
                await supabaseFetch(`instagram_leads?id=in.(${idList})`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: 'dmed', dmed_at: now, dmed_by: account }),
                })
                // Return ids so the card can track what was marked
                return ids
              }}
              onCommitDmed={(ids: number[]) => {
                // Called after undo window expires — update local state
                const now = new Date().toISOString()
                setAllLeads(prev => prev.map(l =>
                  ids.includes(l.id) ? { ...l, status: 'dmed' as PipelineStage, dmed_at: now, dmed_by: account } as Lead : l
                ))
              }}
              onUndoDmed={async (ids: number[]) => {
                // Revert Supabase — local state was never changed
                if (ids.length === 0) return
                const idList = ids.join(',')
                await supabaseFetch(`instagram_leads?id=in.(${idList})`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: 'warm', dmed_at: null, dmed_by: null }),
                })
              }}
            />

            {/* Touch History Log */}
            {touchHistory.length > 0 && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
                backdropFilter: 'blur(20px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <ListChecks size={18} color="var(--accent-primary)" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Touch History</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {touchHistory.map(row => {
                    const d = new Date(row.date + 'T12:00:00')
                    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    const missed = row.touch === null
                    const isDm = row.touch === 4
                    const color = missed ? 'var(--text-tertiary)' : isDm ? '#fb923c' : row.touch === 1 ? '#6366f1' : row.touch === 2 ? '#f59e0b' : '#00e5c8'
                    return (
                      <div key={row.date} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '8px 12px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: `3px solid ${missed ? '#ffffff18' : color}`,
                        opacity: missed ? 0.5 : 1,
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 100, flexShrink: 0 }}>
                          {label}
                        </div>
                        {missed ? (
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>missed</div>
                        ) : (
                          <>
                            <div style={{
                              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                              color, background: color + '18',
                              padding: '2px 8px', borderRadius: 4,
                            }}>
                              {isDm ? 'DMs sent' : `Touch ${row.touch}/3`}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                              {row.count} leads
                            </div>
                            <div style={{ fontSize: 14 }}>✅</div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
            <StatCard label="Your Leads" value={accountLeads.length} sub="Assigned to you" color="var(--accent-primary)" icon={TrendingUp} />
            <StatCard label="Poland-Based" value={usLeads} sub={`${accountLeads.length > 0 ? ((usLeads / accountLeads.length) * 100).toFixed(0) : 0}% of your leads`} color="var(--accent-secondary)" icon={Target} />
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
              {filtered.map((lead, i) => (
                <div key={lead.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{
                    width: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <LeadRow lead={lead} onStatusChange={handleStatusChange} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Account switch confirmation modal */}
      {confirmSwitch && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}
          onClick={() => setConfirmSwitch(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              width: 380,
              boxShadow: 'var(--shadow-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Instagram size={20} color={ACCOUNTS.find(a => a.key === confirmSwitch)?.color} />
              <div style={{ fontSize: 18, fontWeight: 700 }}>Switch Account</div>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Switch to <span style={{
                fontWeight: 700,
                color: ACCOUNTS.find(a => a.key === confirmSwitch)?.color,
              }}>{ACCOUNTS.find(a => a.key === confirmSwitch)?.label}</span>?
              <br />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                This changes which account's tasks and stats you see.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmSwitch(null)}
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 20px',
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAccountSwitch}
                style={{
                  background: ACCOUNTS.find(a => a.key === confirmSwitch)?.color + '20',
                  color: ACCOUNTS.find(a => a.key === confirmSwitch)?.color,
                  border: `1px solid ${ACCOUNTS.find(a => a.key === confirmSwitch)?.color}50`,
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 20px',
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Switch to {ACCOUNTS.find(a => a.key === confirmSwitch)?.label}
              </button>
            </div>
          </div>
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
