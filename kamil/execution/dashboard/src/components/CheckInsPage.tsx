import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Search, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, Flag,
  TrendingUp, TrendingDown, Moon,
  Smile, Frown, Meh, SmilePlus, Angry,
  Award, Target,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, CheckIn } from '../types';

interface CheckInsPageProps {
  clients: Client[];
  checkIns: CheckIn[];
  onUpdateCheckIn: (id: string, updates: Partial<CheckIn>) => void;
  onViewClient: (id: string) => void;
}

type FilterTab = 'pending' | 'flagged' | 'reviewed' | 'all';

// ── Tiny inline sparkline ──
function Sparkline({ data, color, height = 28, width = 100 }: { data: number[]; color: string; height?: number; width?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {(() => {
        const lastX = width;
        const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
        return <circle cx={lastX} cy={lastY} r={2.5} fill={color} />;
      })()}
    </svg>
  );
}

// ── Delta badge ──
function DeltaBadge({ current, previous, unit, inverse }: { current: number; previous: number; unit: string; inverse?: boolean }) {
  const diff = current - previous;
  const isGood = inverse ? diff < 0 : diff > 0;
  const isBad = inverse ? diff > 0 : diff < 0;
  if (Math.abs(diff) < 0.01) return <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>—</span>;
  const color = isGood ? 'var(--accent-success)' : isBad ? 'var(--accent-danger)' : 'var(--text-tertiary)';
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 600, color }}>
      <Icon size={10} />
      {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit}
    </span>
  );
}

const moodIcons: Record<number, { icon: typeof Smile; color: string; label: string }> = {
  1: { icon: Angry, color: 'var(--accent-danger)', label: 'Terrible' },
  2: { icon: Frown, color: 'var(--accent-warm)', label: 'Bad' },
  3: { icon: Meh, color: 'var(--text-secondary)', label: 'Okay' },
  4: { icon: Smile, color: 'var(--accent-success)', label: 'Good' },
  5: { icon: SmilePlus, color: 'var(--accent-primary)', label: 'Great' },
};

function ScoreBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '2px', background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: '18px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function CheckInsPage({ clients, checkIns, onUpdateCheckIn, onViewClient }: CheckInsPageProps) {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [flagDrafts, setFlagDrafts] = useState<Record<string, string>>({});

  // ── Computed data ──
  const completedCheckIns = checkIns.filter(ci => ci.status === 'completed');
  const scheduledCheckIns = checkIns.filter(ci => ci.status === 'scheduled');
  const pendingReview = completedCheckIns.filter(ci => ci.reviewStatus === 'pending');
  const flagged = completedCheckIns.filter(ci => ci.reviewStatus === 'flagged');
  const reviewed = completedCheckIns.filter(ci => ci.reviewStatus === 'reviewed');

  // Filter the list
  const filtered = (() => {
    let list: CheckIn[];
    switch (filter) {
      case 'pending': list = pendingReview; break;
      case 'flagged': list = flagged; break;
      case 'reviewed': list = reviewed; break;
      default: list = completedCheckIns;
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(ci => ci.clientName.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  })();

  // Get previous check-in for comparison
  const getPrevious = (ci: CheckIn): CheckIn | null => {
    const clientCIs = completedCheckIns
      .filter(c => c.clientId === ci.clientId && c.id !== ci.id && new Date(c.date) < new Date(ci.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return clientCIs[0] || null;
  };

  // Get trend data (last N completed check-ins for a client)
  const getTrend = (clientId: string, field: keyof CheckIn, n = 6): number[] => {
    return completedCheckIns
      .filter(ci => ci.clientId === clientId && ci[field] != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-n)
      .map(ci => ci[field] as number);
  };

  // ── Priority score (higher = needs more attention) ──
  const getPriority = (ci: CheckIn): number => {
    let score = 0;
    if (ci.reviewStatus === 'flagged') score += 100;
    if (ci.mood && ci.mood <= 2) score += 30;
    if (ci.energy && ci.energy <= 3) score += 20;
    if (ci.stress && ci.stress >= 7) score += 25;
    if (ci.adherence && ci.adherence < 60) score += 30;
    if (ci.sleepHours && ci.sleepHours < 6) score += 15;
    // Check for declining trends
    const prev = getPrevious(ci);
    if (prev) {
      if (prev.adherence && ci.adherence && ci.adherence < prev.adherence - 10) score += 20;
      if (prev.mood && ci.mood && ci.mood < prev.mood) score += 10;
    }
    return score;
  };

  // Sort pending by priority
  if (filter === 'pending') {
    filtered.sort((a, b) => getPriority(b) - getPriority(a));
  }

  // ── Status color helper ──
  const getClientStatus = (ci: CheckIn): { color: string; label: string } => {
    const priority = getPriority(ci);
    if (priority >= 50) return { color: 'var(--accent-danger)', label: 'Needs Attention' };
    if (priority >= 20) return { color: 'var(--accent-warm)', label: 'Watch' };
    return { color: 'var(--accent-success)', label: 'On Track' };
  };

  const handleMarkReviewed = (id: string) => {
    const feedback = feedbackDrafts[id] || '';
    onUpdateCheckIn(id, { reviewStatus: 'reviewed', coachFeedback: feedback });
    setExpandedId(null);
    setFeedbackDrafts(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleFlag = (id: string) => {
    const reason = flagDrafts[id] || '';
    onUpdateCheckIn(id, { reviewStatus: 'flagged', flagReason: reason });
    setFlagDrafts(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const tabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'pending', label: 'To Review', count: pendingReview.length, color: 'var(--accent-warm)' },
    { key: 'flagged', label: 'Flagged', count: flagged.length, color: 'var(--accent-danger)' },
    { key: 'reviewed', label: 'Done', count: reviewed.length, color: 'var(--accent-success)' },
    { key: 'all', label: 'All', count: completedCheckIns.length, color: 'var(--text-secondary)' },
  ];

  return (
    <div style={styles.page}>
      {/* Summary Cards */}
      <div style={{ ...styles.summaryRow, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        <GlassCard delay={0}>
          <div style={styles.summaryLabel}>To Review</div>
          <div style={{ ...styles.summaryValue, color: pendingReview.length > 0 ? 'var(--accent-warm)' : 'var(--text-primary)' }}>
            {pendingReview.length}
          </div>
          <div style={styles.summaryHint}>check-ins waiting</div>
        </GlassCard>
        <GlassCard delay={0.05}>
          <div style={styles.summaryLabel}>Flagged</div>
          <div style={{ ...styles.summaryValue, color: flagged.length > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
            {flagged.length}
          </div>
          <div style={styles.summaryHint}>need intervention</div>
        </GlassCard>
        <GlassCard delay={0.1}>
          <div style={styles.summaryLabel}>Avg Adherence</div>
          <div style={styles.summaryValue}>
            {completedCheckIns.length > 0
              ? Math.round(completedCheckIns.filter(ci => ci.adherence != null).reduce((s, ci) => s + (ci.adherence || 0), 0) / completedCheckIns.filter(ci => ci.adherence != null).length)
              : 0}%
          </div>
          <div style={styles.summaryHint}>across all clients</div>
        </GlassCard>
        <GlassCard delay={0.15}>
          <div style={styles.summaryLabel}>Upcoming</div>
          <div style={styles.summaryValue}>{scheduledCheckIns.length}</div>
          <div style={styles.summaryHint}>scheduled this week</div>
        </GlassCard>
      </div>

      {/* Main Queue */}
      <GlassCard delay={0.2}>
        {/* Header with tabs */}
        <div style={styles.queueHeader}>
          <div style={styles.queueTitleRow}>
            <ClipboardCheck size={18} color="var(--accent-primary)" />
            <h3 style={styles.queueTitle}>Check-In Review Queue</h3>
          </div>
          <div style={styles.tabRow}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  ...styles.tab,
                  ...(filter === tab.key ? { background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', borderColor: 'rgba(0,229,200,0.15)' } : {}),
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{ ...styles.tabBadge, background: filter === tab.key ? tab.color : 'rgba(255,255,255,0.1)', color: filter === tab.key ? '#fff' : 'var(--text-tertiary)' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={styles.searchRow}>
          <div style={styles.searchBox}>
            <Search size={14} color="var(--text-tertiary)" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* Queue List */}
        <div style={styles.queueList}>
          {filtered.length === 0 && (
            <div style={styles.emptyState}>
              {filter === 'pending' ? (
                <>
                  <CheckCircle2 size={32} color="var(--accent-success)" />
                  <p>All caught up! No check-ins to review.</p>
                </>
              ) : (
                <p style={{ color: 'var(--text-tertiary)' }}>No check-ins match your filter.</p>
              )}
            </div>
          )}

          <AnimatePresence>
            {filtered.map((ci, idx) => {
              const prev = getPrevious(ci);
              const client = clients.find(c => c.id === ci.clientId);
              const isExpanded = expandedId === ci.id;
              const status = getClientStatus(ci);
              const MoodIcon = ci.mood ? moodIcons[ci.mood]?.icon || Meh : null;
              const moodColor = ci.mood ? moodIcons[ci.mood]?.color || 'var(--text-secondary)' : '';

              return (
                <motion.div
                  key={ci.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: idx * 0.02 }}
                  style={styles.queueItem}
                >
                  {/* Collapsed row */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : ci.id)}
                    style={styles.queueItemHeader}
                  >
                    {/* Left: avatar + name + date */}
                    <div style={styles.queueItemLeft}>
                      <div style={{ ...styles.avatar, background: getAvatarColor(ci.clientId) }}>
                        {getInitials(ci.clientName)}
                      </div>
                      <div>
                        <div style={styles.queueClientName}>{ci.clientName}</div>
                        <div style={styles.queueDate}>
                          {new Date(ci.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {client && <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}>{client.plan}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Center: key metrics at a glance */}
                    {!isMobile && (
                      <div style={styles.queueMetrics}>
                        {ci.weight && (
                          <div style={styles.metricChip}>
                            <span style={styles.metricChipValue}>{ci.weight}kg</span>
                            {prev?.weight && <DeltaBadge current={ci.weight} previous={prev.weight} unit="kg" inverse />}
                          </div>
                        )}
                        {ci.adherence != null && (
                          <div style={styles.metricChip}>
                            <span style={{ ...styles.metricChipValue, color: ci.adherence >= 80 ? 'var(--accent-success)' : ci.adherence >= 60 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>
                              {ci.adherence}%
                            </span>
                          </div>
                        )}
                        {MoodIcon && (
                          <div style={styles.metricChip}>
                            <MoodIcon size={14} color={moodColor} />
                          </div>
                        )}
                        {ci.sleepHours && (
                          <div style={styles.metricChip}>
                            <Moon size={10} color="var(--text-tertiary)" />
                            <span style={styles.metricChipValue}>{ci.sleepHours}h</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Right: status + expand */}
                    <div style={styles.queueItemRight}>
                      <span style={{ ...styles.statusDot, background: status.color }} />
                      {ci.reviewStatus === 'flagged' && <Flag size={13} color="var(--accent-danger)" />}
                      {ci.reviewStatus === 'reviewed' && <CheckCircle2 size={13} color="var(--accent-success)" />}
                      {ci.reviewStatus === 'pending' && <Clock size={13} color="var(--accent-warm)" />}
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={styles.expandedContent}>
                          {/* Side-by-side comparison */}
                          <div style={{ ...styles.comparisonGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                            {/* This Week */}
                            <div style={styles.comparisonCol}>
                              <div style={styles.comparisonLabel}>This Week — {new Date(ci.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                              <div style={styles.metricsGrid}>
                                {ci.weight != null && (
                                  <div style={styles.metricCell}>
                                    <span style={styles.metricCellLabel}>Weight</span>
                                    <span style={styles.metricCellValue}>{ci.weight}kg</span>
                                    {prev?.weight != null && <DeltaBadge current={ci.weight} previous={prev.weight} unit="kg" inverse />}
                                  </div>
                                )}
                                {ci.bodyFat != null && (
                                  <div style={styles.metricCell}>
                                    <span style={styles.metricCellLabel}>Body Fat</span>
                                    <span style={styles.metricCellValue}>{ci.bodyFat}%</span>
                                    {prev?.bodyFat != null && <DeltaBadge current={ci.bodyFat} previous={prev.bodyFat} unit="%" inverse />}
                                  </div>
                                )}
                                {ci.adherence != null && (
                                  <div style={styles.metricCell}>
                                    <span style={styles.metricCellLabel}>Adherence</span>
                                    <span style={{ ...styles.metricCellValue, color: ci.adherence >= 80 ? 'var(--accent-success)' : ci.adherence >= 60 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>{ci.adherence}%</span>
                                    {prev?.adherence != null && <DeltaBadge current={ci.adherence} previous={prev.adherence} unit="%" />}
                                  </div>
                                )}
                                {ci.sleepHours != null && (
                                  <div style={styles.metricCell}>
                                    <span style={styles.metricCellLabel}>Sleep</span>
                                    <span style={styles.metricCellValue}>{ci.sleepHours}h</span>
                                    {prev?.sleepHours != null && <DeltaBadge current={ci.sleepHours} previous={prev.sleepHours} unit="h" />}
                                  </div>
                                )}
                              </div>

                              {/* Wellness bars */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                                {ci.mood && (
                                  <div style={styles.wellnessRow}>
                                    <span style={styles.wellnessLabel}>Mood</span>
                                    <ScoreBar value={ci.mood} max={5} color={moodIcons[ci.mood]?.color || 'var(--text-secondary)'} />
                                  </div>
                                )}
                                {ci.energy != null && (
                                  <div style={styles.wellnessRow}>
                                    <span style={styles.wellnessLabel}>Energy</span>
                                    <ScoreBar value={ci.energy} color={ci.energy >= 7 ? 'var(--accent-success)' : ci.energy >= 4 ? 'var(--accent-warm)' : 'var(--accent-danger)'} />
                                  </div>
                                )}
                                {ci.stress != null && (
                                  <div style={styles.wellnessRow}>
                                    <span style={styles.wellnessLabel}>Stress</span>
                                    <ScoreBar value={ci.stress} color={ci.stress <= 3 ? 'var(--accent-success)' : ci.stress <= 6 ? 'var(--accent-warm)' : 'var(--accent-danger)'} />
                                  </div>
                                )}
                                {ci.nutritionScore != null && (
                                  <div style={styles.wellnessRow}>
                                    <span style={styles.wellnessLabel}>Nutrition</span>
                                    <ScoreBar value={ci.nutritionScore} color={ci.nutritionScore >= 7 ? 'var(--accent-success)' : ci.nutritionScore >= 4 ? 'var(--accent-warm)' : 'var(--accent-danger)'} />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Trends */}
                            <div style={styles.comparisonCol}>
                              <div style={styles.comparisonLabel}>8-Week Trends</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {(() => {
                                  const weightTrend = getTrend(ci.clientId, 'weight');
                                  return weightTrend.length >= 2 && (
                                    <div style={styles.trendRow}>
                                      <span style={styles.trendLabel}>Weight</span>
                                      <Sparkline data={weightTrend} color="var(--accent-primary)" />
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const adherenceTrend = getTrend(ci.clientId, 'adherence');
                                  return adherenceTrend.length >= 2 && (
                                    <div style={styles.trendRow}>
                                      <span style={styles.trendLabel}>Adherence</span>
                                      <Sparkline data={adherenceTrend} color="var(--accent-success)" />
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const moodTrend = getTrend(ci.clientId, 'mood');
                                  return moodTrend.length >= 2 && (
                                    <div style={styles.trendRow}>
                                      <span style={styles.trendLabel}>Mood</span>
                                      <Sparkline data={moodTrend} color="var(--accent-warm)" />
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const sleepTrend = getTrend(ci.clientId, 'sleepHours');
                                  return sleepTrend.length >= 2 && (
                                    <div style={styles.trendRow}>
                                      <span style={styles.trendLabel}>Sleep</span>
                                      <Sparkline data={sleepTrend} color="var(--accent-secondary)" />
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const energyTrend = getTrend(ci.clientId, 'energy');
                                  return energyTrend.length >= 2 && (
                                    <div style={styles.trendRow}>
                                      <span style={styles.trendLabel}>Energy</span>
                                      <Sparkline data={energyTrend} color="#f59e0b" />
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Client notes / wins / challenges */}
                          <div style={{ ...styles.notesGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr' }}>
                            {ci.notes && (
                              <div style={styles.noteBlock}>
                                <span style={styles.noteLabel}>Client Notes</span>
                                <p style={styles.noteText}>{ci.notes}</p>
                              </div>
                            )}
                            {ci.wins && (
                              <div style={styles.noteBlock}>
                                <span style={{ ...styles.noteLabel, color: 'var(--accent-success)' }}>
                                  <Award size={11} /> Wins
                                </span>
                                <p style={styles.noteText}>{ci.wins}</p>
                              </div>
                            )}
                            {ci.challenges && (
                              <div style={styles.noteBlock}>
                                <span style={{ ...styles.noteLabel, color: 'var(--accent-warm)' }}>
                                  <Target size={11} /> Challenges
                                </span>
                                <p style={styles.noteText}>{ci.challenges}</p>
                              </div>
                            )}
                          </div>

                          {/* Previous coach feedback (if exists) */}
                          {ci.coachFeedback && ci.reviewStatus === 'reviewed' && (
                            <div style={styles.existingFeedback}>
                              <span style={{ ...styles.noteLabel, color: 'var(--accent-primary)' }}>Your Feedback</span>
                              <p style={styles.noteText}>{ci.coachFeedback}</p>
                            </div>
                          )}

                          {/* Flag reason */}
                          {ci.reviewStatus === 'flagged' && ci.flagReason && (
                            <div style={styles.flagBanner}>
                              <AlertTriangle size={14} />
                              <span>{ci.flagReason}</span>
                            </div>
                          )}

                          {/* Action bar */}
                          {ci.reviewStatus !== 'reviewed' && (
                            <div style={styles.actionBar}>
                              <textarea
                                value={feedbackDrafts[ci.id] ?? ci.coachFeedback}
                                onChange={e => setFeedbackDrafts(prev => ({ ...prev, [ci.id]: e.target.value }))}
                                placeholder="Write your feedback..."
                                style={styles.feedbackInput}
                                rows={2}
                              />
                              <div style={styles.actionButtons}>
                                <button
                                  onClick={() => onViewClient(ci.clientId)}
                                  style={styles.actionBtnSecondary}
                                >
                                  View Profile
                                </button>
                                {ci.reviewStatus !== 'flagged' && (
                                  <div style={styles.flagGroup}>
                                    <input
                                      value={flagDrafts[ci.id] || ''}
                                      onChange={e => setFlagDrafts(prev => ({ ...prev, [ci.id]: e.target.value }))}
                                      placeholder="Flag reason..."
                                      style={styles.flagInput}
                                    />
                                    <button
                                      onClick={() => handleFlag(ci.id)}
                                      style={styles.actionBtnDanger}
                                    >
                                      <Flag size={13} />
                                      Flag
                                    </button>
                                  </div>
                                )}
                                <button
                                  onClick={() => handleMarkReviewed(ci.id)}
                                  style={styles.actionBtnPrimary}
                                >
                                  <CheckCircle2 size={13} />
                                  Mark Reviewed
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Already reviewed — option to unflag */}
                          {ci.reviewStatus === 'flagged' && (
                            <div style={styles.actionButtons}>
                              <button onClick={() => onViewClient(ci.clientId)} style={styles.actionBtnSecondary}>View Profile</button>
                              <textarea
                                value={feedbackDrafts[ci.id] ?? ci.coachFeedback}
                                onChange={e => setFeedbackDrafts(prev => ({ ...prev, [ci.id]: e.target.value }))}
                                placeholder="Add feedback and resolve..."
                                style={{ ...styles.feedbackInput, flex: 1 }}
                                rows={1}
                              />
                              <button onClick={() => handleMarkReviewed(ci.id)} style={styles.actionBtnPrimary}>
                                <CheckCircle2 size={13} />
                                Resolve & Review
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </GlassCard>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    overflowY: 'auto',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  summaryRow: {
    display: 'grid',
    gap: '16px',
  },
  summaryLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    marginTop: '4px',
  },
  summaryHint: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
  },
  queueHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  queueTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  queueTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  tabRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '10px',
    lineHeight: '16px',
  },
  searchRow: {
    marginBottom: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
  },
  queueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '40px 20px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  queueItem: {
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.03)',
    background: 'rgba(255,255,255,0.01)',
    overflow: 'hidden',
  },
  queueItemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background 0.1s',
    gap: '16px',
  },
  queueItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  queueClientName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  queueDate: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  queueMetrics: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    justifyContent: 'center',
  },
  metricChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.04)',
    fontSize: '12px',
  },
  metricChipValue: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontSize: '12px',
  },
  queueItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  expandedContent: {
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: '16px',
  },
  comparisonGrid: {
    display: 'grid',
    gap: '16px',
  },
  comparisonCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  comparisonLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  metricCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  metricCellLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  metricCellValue: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
  },
  wellnessRow: {
    display: 'grid',
    gridTemplateColumns: '70px 1fr',
    alignItems: 'center',
    gap: '8px',
  },
  wellnessLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  trendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  trendLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    minWidth: '60px',
  },
  notesGrid: {
    display: 'grid',
    gap: '12px',
  },
  noteBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  noteLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  noteText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: 0,
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  existingFeedback: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  flagBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.15)',
    color: 'var(--accent-danger)',
    fontSize: '12px',
    fontWeight: 500,
  },
  actionBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  feedbackInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    resize: 'vertical',
    outline: 'none',
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionBtnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  actionBtnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  actionBtnDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239,68,68,0.2)',
    background: 'rgba(239,68,68,0.08)',
    color: 'var(--accent-danger)',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  flagGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  flagInput: {
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239,68,68,0.15)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    width: '160px',
  },
};
