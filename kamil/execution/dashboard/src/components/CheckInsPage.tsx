import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Search, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, Flag,
  TrendingUp, TrendingDown, Moon,
  Smile, Frown, Meh, SmilePlus, Angry,
  Award, Target, MessageSquare, Camera, Plus, X, Send,
  Image as ImageIcon,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { getLocale } from '../lib/locale';
import { sparklinePoints } from '../utils/sparklines';
import type { Client, CheckIn, Message, Page } from '../types';

interface CheckInsPageProps {
  clients: Client[];
  checkIns: CheckIn[];
  onUpdateCheckIn: (id: string, updates: Partial<CheckIn>) => void;
  onViewClient: (id: string) => void;
  onSendMessage: (msg: Message) => void;
  onNavigate?: (page: Page) => void; // kept for future use
  onConfetti?: () => void;
}

type FilterTab = 'pending' | 'flagged' | 'reviewed' | 'missed' | 'all';

// ── Tiny inline sparkline (memoized to avoid re-renders when parent state changes) ──
const Sparkline = React.memo(function Sparkline({ data, color, height = 28, width = 100 }: { data: number[]; color: string; height?: number; width?: number }) {
  if (data.length < 2) return null;
  const points = sparklinePoints(data, height, width);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
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
});

// ── Delta badge ──
function DeltaBadge({ current, previous, unit, inverse }: { current: number; previous: number; unit: string; inverse?: boolean }) {
  const diff = current - previous;
  const isGood = inverse ? diff < 0 : diff > 0;
  const isBad = inverse ? diff > 0 : diff < 0;
  if (Math.abs(diff) < 0.01) return <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>-</span>;
  const color = isGood ? 'var(--accent-success)' : isBad ? 'var(--accent-danger)' : 'var(--text-tertiary)';
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, color }}>
      <Icon size={10} />
      {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit}
    </span>
  );
}

function ScoreBar({ value, max = 10, color, compact }: { value: number; max?: number; color: string; compact?: boolean }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '4px' : '6px' }}>
      <div style={{ flex: 1, height: compact ? '3px' : '4px', borderRadius: '2px', background: 'var(--score-bar-track)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '2px', background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: compact ? '12px' : '13px', fontWeight: 700, color, minWidth: '18px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function CheckInsPage({ clients, checkIns, onUpdateCheckIn, onViewClient, onSendMessage, onNavigate: _onNavigate, onConfetti }: CheckInsPageProps) {
  const isMobile = useIsMobile();
  const { lang, t } = useLang();
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [flagDrafts, setFlagDrafts] = useState<Record<string, string>>({});
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});
  const [messageModal, setMessageModal] = useState<{ clientId: string; clientName: string } | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [showFlagInput, setShowFlagInput] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; label: string } | null>(null);

  const locale = getLocale(lang);

  const moodIcons: Record<number, { icon: typeof Smile; color: string; label: string }> = {
    1: { icon: Angry, color: 'var(--accent-danger)', label: t.checkIns.moodLabels[1] },
    2: { icon: Frown, color: 'var(--accent-warm)', label: t.checkIns.moodLabels[2] },
    3: { icon: Meh, color: 'var(--text-secondary)', label: t.checkIns.moodLabels[3] },
    4: { icon: Smile, color: 'var(--accent-success)', label: t.checkIns.moodLabels[4] },
    5: { icon: SmilePlus, color: 'var(--accent-primary)', label: t.checkIns.moodLabels[5] },
  };

  // ── Computed data ──
  const completedCheckIns = checkIns.filter(ci => ci.status === 'completed');
  const pendingReview = completedCheckIns.filter(ci => ci.reviewStatus === 'pending');
  const flagged = completedCheckIns.filter(ci => ci.reviewStatus === 'flagged');
  const reviewed = completedCheckIns.filter(ci => ci.reviewStatus === 'reviewed');
  const missedCheckIns = checkIns.filter(ci => ci.status === 'missed');

  // Point 1: Days since last check-in for a client
  const getDaysSinceLastCheckIn = (clientId: string): number | null => {
    const clientCompleted = completedCheckIns
      .filter(ci => ci.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (clientCompleted.length === 0) return null;
    const lastDate = new Date(clientCompleted[0].date);
    const now = new Date();
    return Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
  };

  // Filter the list
  const filtered = (() => {
    let list: CheckIn[];
    switch (filter) {
      case 'pending': list = pendingReview; break;
      case 'flagged': list = flagged; break;
      case 'reviewed': list = reviewed; break;
      case 'missed': list = missedCheckIns; break;
      default: list = [...completedCheckIns, ...missedCheckIns];
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
    if (ci.steps != null && ci.steps < 5000) score += 30;
    if (ci.sleepHours && ci.sleepHours < 6) score += 15;
    // Check for declining trends
    const prev = getPrevious(ci);
    if (prev) {
      if (prev.steps && ci.steps && ci.steps < prev.steps - 2000) score += 20;
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
    onConfetti?.();
  };

  const handleFlag = (id: string) => {
    const reason = flagDrafts[id] || '';
    onUpdateCheckIn(id, { reviewStatus: 'flagged', flagReason: reason });
    setFlagDrafts(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  // Point 6: Add follow-up note to a reviewed check-in
  const handleAddFollowUp = (ci: CheckIn) => {
    const text = followUpDrafts[ci.id]?.trim();
    if (!text) return;
    const newNote = { text, date: new Date().toISOString().split('T')[0] };
    onUpdateCheckIn(ci.id, { followUpNotes: [...(ci.followUpNotes || []), newNote] });
    setFollowUpDrafts(prev => { const n = { ...prev }; delete n[ci.id]; return n; });
  };

  const tabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'pending', label: t.checkIns.pending, count: pendingReview.length, color: 'var(--accent-warm)' },
    { key: 'flagged', label: t.checkIns.flagged, count: flagged.length, color: 'var(--accent-danger)' },
    { key: 'reviewed', label: t.checkIns.reviewed, count: reviewed.length, color: 'var(--accent-success)' },
    { key: 'all', label: t.checkIns.all, count: completedCheckIns.length + missedCheckIns.length, color: 'var(--text-secondary)' },
  ];

  return (
    <div style={{ ...styles.page, padding: isMobile ? '14px 16px' : '32px 40px', gap: isMobile ? '14px' : '24px' }}>
      {/* Main Queue */}
      <GlassCard delay={0.2} style={isMobile ? { padding: '16px' } : undefined}>
        {/* Header with tabs */}
        <div style={{ ...styles.queueHeader, marginBottom: isMobile ? '12px' : '16px' }}>
          <div style={styles.queueTitleRow}>
            <ClipboardCheck size={isMobile ? 15 : 18} color="var(--accent-primary)" />
            <h3 style={{ ...styles.queueTitle, fontSize: isMobile ? '15px' : '18px' }}>{t.checkIns.reviewQueue}</h3>
          </div>
          <div style={{ ...styles.tabRow, gap: isMobile ? '4px' : '6px' }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  ...styles.tab,
                  ...(isMobile ? { fontSize: '12px', padding: '4px 8px', gap: '4px' } : {}),
                  ...(filter === tab.key ? { background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', borderColor: 'rgba(0,229,200,0.15)' } : {}),
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{ ...styles.tabBadge, background: filter === tab.key ? tab.color : 'var(--bg-subtle-hover)', color: filter === tab.key ? '#fff' : 'var(--text-tertiary)', ...(isMobile ? { fontSize: '10px', padding: '0px 5px' } : {}) }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ ...styles.searchRow, marginBottom: isMobile ? '10px' : '12px' }}>
          <div style={{ ...styles.searchBox, ...(isMobile ? { padding: '6px 10px' } : {}) }}>
            <Search size={isMobile ? 12 : 14} color="var(--text-tertiary)" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.checkIns.searchClients}
              style={{ ...styles.searchInput, fontSize: isMobile ? '13px' : '14px' }}
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
                  <p>{t.checkIns.allCaughtUp}</p>
                </>
              ) : (
                <p style={{ color: 'var(--text-tertiary)' }}>{t.checkIns.noMatch}</p>
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
                    style={{ ...styles.queueItemHeader, ...(isMobile ? { padding: '10px 12px', gap: '10px' } : {}) }}
                  >
                    {/* Left: avatar + name + date + days since */}
                    <div style={{ ...styles.queueItemLeft, gap: isMobile ? '8px' : '12px' }}>
                      <div style={{ ...styles.avatar, background: getAvatarColor(ci.clientId), ...(isMobile ? { width: '30px', height: '30px', fontSize: '12px', borderRadius: '8px' } : {}) }}>
                        {getInitials(ci.clientName)}
                      </div>
                      <div>
                        <div style={{ ...styles.queueClientName, fontSize: isMobile ? '14px' : '15px' }}>{ci.clientName}</div>
                        <div style={{ ...styles.queueDate, fontSize: isMobile ? '11px' : '13px' }}>
                          {new Date(ci.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                          {client && <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}>{client.plan}</span>}
                          {(() => {
                            const days = getDaysSinceLastCheckIn(ci.clientId);
                            if (days === null) return null;
                            const isLate = days > 10;
                            const isWarning = days >= 7 && days <= 10;
                            return (
                              <span style={{
                                marginLeft: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '8px',
                                background: isLate ? 'var(--accent-danger-dim)' : isWarning ? 'var(--accent-warm-dim)' : 'var(--bg-subtle-hover)',
                                color: isLate ? 'var(--accent-danger)' : isWarning ? 'var(--accent-warm)' : 'var(--text-tertiary)',
                              }}>
                                {days === 0 ? t.checkIns.today : t.checkIns.dAgo(days)}
                              </span>
                            );
                          })()}
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
                        {ci.steps != null && (
                          <div style={styles.metricChip}>
                            <span style={{ ...styles.metricChipValue, color: ci.steps >= 8000 ? 'var(--accent-success)' : ci.steps >= 5000 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>
                              {ci.steps.toLocaleString()}
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
                      {ci.status === 'missed' ? (
                        <>
                          <span style={{ ...styles.statusDot, background: 'var(--accent-danger)' }} />
                          <AlertTriangle size={13} color="var(--accent-danger)" />
                        </>
                      ) : (
                        <>
                          <span style={{ ...styles.statusDot, background: status.color }} />
                          {ci.reviewStatus === 'flagged' && <Flag size={13} color="var(--accent-danger)" />}
                          {ci.reviewStatus === 'reviewed' && <CheckCircle2 size={13} color="var(--accent-success)" />}
                          {ci.reviewStatus === 'pending' && <Clock size={13} color="var(--accent-warm)" />}
                        </>
                      )}
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
                        <div style={{ ...styles.expandedContent, ...(isMobile ? { padding: '0 12px 12px', paddingTop: '12px', gap: '12px' } : {}) }}>
                          {/* Missed check-in - simplified view */}
                          {ci.status === 'missed' ? (
                            <>
                              <div style={styles.missedBanner}>
                                <AlertTriangle size={isMobile ? 15 : 18} color="var(--accent-danger)" />
                                <div>
                                  <div style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {t.checkIns.missedCheckIn(ci.clientName)}
                                  </div>
                                  <div style={{ fontSize: isMobile ? '11px' : '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                    {t.checkIns.dueOn} {new Date(ci.date).toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })} - {t.checkIns.noDataSubmitted}
                                  </div>
                                </div>
                              </div>
                              <div style={styles.actionButtons}>
                                <button onClick={() => onViewClient(ci.clientId)} style={styles.actionBtnSecondary}>
                                  {t.checkIns.viewProfile}
                                </button>
                                <button
                                  onClick={() => setMessageModal({ clientId: ci.clientId, clientName: ci.clientName })}
                                  style={styles.actionBtnMessage}
                                >
                                  <MessageSquare size={13} />
                                  {t.checkIns.sendFollowUp}
                                </button>
                              </div>
                            </>
                          ) : (
                          <>
                          {/* Side-by-side comparison */}
                          <div style={{ ...styles.comparisonGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                            {/* This Week */}
                            <div style={styles.comparisonCol}>
                              <div style={{ ...styles.comparisonLabel, fontSize: isMobile ? '11px' : '15px' }}>{t.checkIns.thisWeek} - {new Date(ci.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</div>
                              <div style={{ ...styles.metricsGrid, gap: isMobile ? '6px' : '8px' }}>
                                {ci.weight != null && (
                                  <div style={{ ...styles.metricCell, padding: isMobile ? '8px 10px' : '10px 12px' }}>
                                    <span style={{ ...styles.metricCellLabel, fontSize: isMobile ? '10px' : '14px' }}>{t.checkIns.weight}</span>
                                    <span style={{ ...styles.metricCellValue, fontSize: isMobile ? '18px' : '22px' }}>{ci.weight}kg</span>
                                    {prev?.weight != null && <DeltaBadge current={ci.weight} previous={prev.weight} unit="kg" inverse />}
                                  </div>
                                )}
                                {ci.bodyFat != null && (
                                  <div style={{ ...styles.metricCell, padding: isMobile ? '8px 10px' : '10px 12px' }}>
                                    <span style={{ ...styles.metricCellLabel, fontSize: isMobile ? '10px' : '14px' }}>{t.checkIns.bodyFat}</span>
                                    <span style={{ ...styles.metricCellValue, fontSize: isMobile ? '18px' : '22px' }}>{ci.bodyFat}%</span>
                                    {prev?.bodyFat != null && <DeltaBadge current={ci.bodyFat} previous={prev.bodyFat} unit="%" inverse />}
                                  </div>
                                )}
                                {ci.steps != null && (
                                  <div style={{ ...styles.metricCell, padding: isMobile ? '8px 10px' : '10px 12px' }}>
                                    <span style={{ ...styles.metricCellLabel, fontSize: isMobile ? '10px' : '14px' }}>{t.checkIns.steps}</span>
                                    <span style={{ ...styles.metricCellValue, fontSize: isMobile ? '18px' : '22px', color: ci.steps >= 8000 ? 'var(--accent-success)' : ci.steps >= 5000 ? 'var(--accent-warm)' : 'var(--accent-danger)' }}>{ci.steps.toLocaleString()}</span>
                                    {prev?.steps != null && <DeltaBadge current={ci.steps} previous={prev.steps} unit="" />}
                                  </div>
                                )}
                                {ci.sleepHours != null && (
                                  <div style={{ ...styles.metricCell, padding: isMobile ? '8px 10px' : '10px 12px' }}>
                                    <span style={{ ...styles.metricCellLabel, fontSize: isMobile ? '10px' : '14px' }}>{t.checkIns.sleepHours}</span>
                                    <span style={{ ...styles.metricCellValue, fontSize: isMobile ? '18px' : '22px' }}>{ci.sleepHours}h</span>
                                    {prev?.sleepHours != null && <DeltaBadge current={ci.sleepHours} previous={prev.sleepHours} unit="h" />}
                                  </div>
                                )}
                              </div>

                              {/* Wellness bars */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '4px' : '6px', marginTop: isMobile ? '8px' : '12px' }}>
                                {ci.mood && (
                                  <div style={{ ...styles.wellnessRow, gridTemplateColumns: isMobile ? '55px 1fr' : '70px 1fr' }}>
                                    <span style={{ ...styles.wellnessLabel, fontSize: isMobile ? '12px' : '15px' }}>{t.checkIns.mood}</span>
                                    <ScoreBar value={ci.mood} max={5} color={moodIcons[ci.mood]?.color || 'var(--text-secondary)'} compact={isMobile} />
                                  </div>
                                )}
                                {ci.energy != null && (
                                  <div style={{ ...styles.wellnessRow, gridTemplateColumns: isMobile ? '55px 1fr' : '70px 1fr' }}>
                                    <span style={{ ...styles.wellnessLabel, fontSize: isMobile ? '12px' : '15px' }}>{t.checkIns.energy}</span>
                                    <ScoreBar value={ci.energy} color={ci.energy >= 7 ? 'var(--accent-success)' : ci.energy >= 4 ? 'var(--accent-warm)' : 'var(--accent-danger)'} compact={isMobile} />
                                  </div>
                                )}
                                {ci.stress != null && (
                                  <div style={{ ...styles.wellnessRow, gridTemplateColumns: isMobile ? '55px 1fr' : '70px 1fr' }}>
                                    <span style={{ ...styles.wellnessLabel, fontSize: isMobile ? '12px' : '15px' }}>{t.checkIns.stress}</span>
                                    <ScoreBar value={ci.stress} color={ci.stress <= 3 ? 'var(--accent-success)' : ci.stress <= 6 ? 'var(--accent-warm)' : 'var(--accent-danger)'} compact={isMobile} />
                                  </div>
                                )}
                                {ci.nutritionScore != null && (
                                  <div style={{ ...styles.wellnessRow, gridTemplateColumns: isMobile ? '55px 1fr' : '70px 1fr' }}>
                                    <span style={{ ...styles.wellnessLabel, fontSize: isMobile ? '12px' : '15px' }}>{t.checkIns.nutritionScore}</span>
                                    <ScoreBar value={ci.nutritionScore} color={ci.nutritionScore >= 7 ? 'var(--accent-success)' : ci.nutritionScore >= 4 ? 'var(--accent-warm)' : 'var(--accent-danger)'} compact={isMobile} />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Trends */}
                            <div style={styles.comparisonCol}>
                              <div style={{ ...styles.comparisonLabel, fontSize: isMobile ? '11px' : '15px' }}>{t.checkIns.weekTrends}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
                                {(() => {
                                  const weightTrend = getTrend(ci.clientId, 'weight');
                                  return weightTrend.length >= 2 && (
                                    <div style={{ ...styles.trendRow, padding: isMobile ? '6px 10px' : '8px 12px' }}>
                                      <span style={{ ...styles.trendLabel, fontSize: isMobile ? '12px' : '15px', minWidth: isMobile ? '45px' : '60px' }}>{t.checkIns.weight}</span>
                                      <Sparkline data={weightTrend} color="var(--accent-primary)" />
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const stepsTrend = getTrend(ci.clientId, 'steps');
                                  return stepsTrend.length >= 2 && (
                                    <div style={{ ...styles.trendRow, padding: isMobile ? '6px 10px' : '8px 12px' }}>
                                      <span style={{ ...styles.trendLabel, fontSize: isMobile ? '12px' : '15px', minWidth: isMobile ? '45px' : '60px' }}>{t.checkIns.steps}</span>
                                      <Sparkline data={stepsTrend} color="var(--accent-success)" />
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const moodTrend = getTrend(ci.clientId, 'mood');
                                  return moodTrend.length >= 2 && (
                                    <div style={{ ...styles.trendRow, padding: isMobile ? '6px 10px' : '8px 12px' }}>
                                      <span style={{ ...styles.trendLabel, fontSize: isMobile ? '12px' : '15px', minWidth: isMobile ? '45px' : '60px' }}>{t.checkIns.mood}</span>
                                      <Sparkline data={moodTrend} color="var(--accent-warm)" />
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const sleepTrend = getTrend(ci.clientId, 'sleepHours');
                                  return sleepTrend.length >= 2 && (
                                    <div style={{ ...styles.trendRow, padding: isMobile ? '6px 10px' : '8px 12px' }}>
                                      <span style={{ ...styles.trendLabel, fontSize: isMobile ? '12px' : '15px', minWidth: isMobile ? '45px' : '60px' }}>{t.checkIns.sleepHours}</span>
                                      <Sparkline data={sleepTrend} color="var(--accent-secondary)" />
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const energyTrend = getTrend(ci.clientId, 'energy');
                                  return energyTrend.length >= 2 && (
                                    <div style={{ ...styles.trendRow, padding: isMobile ? '6px 10px' : '8px 12px' }}>
                                      <span style={{ ...styles.trendLabel, fontSize: isMobile ? '12px' : '15px', minWidth: isMobile ? '45px' : '60px' }}>{t.checkIns.energy}</span>
                                      <Sparkline data={energyTrend} color="#f59e0b" />
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Client notes / wins / challenges */}
                          <div style={{ ...styles.notesGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? '8px' : '12px' }}>
                            {ci.notes && (
                              <div style={styles.noteBlock}>
                                <span style={{ ...styles.noteLabel, fontSize: isMobile ? '10px' : '14px' }}>{t.checkIns.notes}</span>
                                <p style={{ ...styles.noteText, fontSize: isMobile ? '12px' : '17px', padding: isMobile ? '6px 8px' : '8px 10px' }}>{ci.notes}</p>
                              </div>
                            )}
                            {ci.wins && (
                              <div style={styles.noteBlock}>
                                <span style={{ ...styles.noteLabel, color: 'var(--accent-success)', fontSize: isMobile ? '10px' : '14px' }}>
                                  <Award size={isMobile ? 9 : 11} /> {t.checkIns.wins}
                                </span>
                                <p style={{ ...styles.noteText, fontSize: isMobile ? '12px' : '17px', padding: isMobile ? '6px 8px' : '8px 10px', background: 'var(--accent-success-dim)', border: '1px solid rgba(34,197,94,0.1)' }}>{ci.wins}</p>
                              </div>
                            )}
                            {ci.challenges && (
                              <div style={styles.noteBlock}>
                                <span style={{ ...styles.noteLabel, color: 'var(--accent-warm)', fontSize: isMobile ? '10px' : '14px' }}>
                                  <Target size={isMobile ? 9 : 11} /> {t.checkIns.challenges}
                                </span>
                                <p style={{ ...styles.noteText, fontSize: isMobile ? '12px' : '17px', padding: isMobile ? '6px 8px' : '8px 10px', background: 'var(--accent-warm-dim)', border: '1px solid rgba(245,158,11,0.1)' }}>{ci.challenges}</p>
                              </div>
                            )}
                          </div>

                          {/* Progress Photos */}
                          {ci.photos && ci.photos.length > 0 && (
                            <div>
                              <span style={{ ...styles.noteLabel, color: 'var(--accent-secondary)', fontSize: isMobile ? '10px' : '14px' }}>
                                <Camera size={isMobile ? 9 : 11} /> {t.checkIns.progressPhotos}
                              </span>
                              <div style={{ ...styles.photosRow, gap: isMobile ? '8px' : '12px' }}>
                                {ci.photos.map((photo, pi) => (
                                  <div
                                    key={pi}
                                    style={{ ...styles.photoCard, cursor: photo.url ? 'pointer' : 'default' }}
                                    onClick={() => { if (photo.url) setLightboxPhoto({ url: photo.url, label: photo.label }); }}
                                  >
                                    {photo.url ? (
                                      <img src={photo.url} alt={photo.label} style={styles.photoImage} />
                                    ) : (
                                      <div style={{ ...styles.photoPlaceholder, ...(isMobile ? { height: '80px' } : {}) }}>
                                        <ImageIcon size={isMobile ? 18 : 24} color="var(--text-tertiary)" style={{ opacity: 0.4 }} />
                                      </div>
                                    )}
                                    <span style={{ ...styles.photoLabel, fontSize: isMobile ? '10px' : '12px' }}>{photo.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {ci.photos && ci.photos.length === 0 && ci.status === 'completed' && (
                            <div style={{ ...styles.noPhotoBanner, fontSize: isMobile ? '11px' : '14px', padding: isMobile ? '8px 10px' : '10px 14px' }}>
                              <Camera size={isMobile ? 12 : 14} color="var(--text-tertiary)" />
                              <span>{t.checkIns.noPhotosThisWeek}</span>
                            </div>
                          )}

                          {/* Previous coach feedback (if exists) */}
                          {ci.coachFeedback && ci.reviewStatus === 'reviewed' && (
                            <div style={styles.existingFeedback}>
                              <span style={{ ...styles.noteLabel, color: 'var(--accent-primary)', fontSize: isMobile ? '10px' : '14px' }}>{t.checkIns.yourFeedback}</span>
                              <p style={{ ...styles.noteText, fontSize: isMobile ? '12px' : '17px', padding: isMobile ? '6px 8px' : '8px 10px', background: 'rgba(0,229,200,0.04)', border: '1px solid rgba(0,229,200,0.1)' }}>{ci.coachFeedback}</p>
                            </div>
                          )}

                          {/* Point 6: Follow-up notes (for reviewed/flagged) */}
                          {ci.followUpNotes && ci.followUpNotes.length > 0 && (
                            <div>
                              <span style={{ ...styles.noteLabel, color: 'var(--accent-secondary)' }}>
                                <ClipboardCheck size={11} /> {t.checkIns.followUpNotes}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                {ci.followUpNotes.map((fn, fi) => (
                                  <div key={fi} style={styles.followUpNote}>
                                    <span style={styles.followUpDate}>
                                      {new Date(fn.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span style={styles.followUpText}>{fn.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Point 6: Add follow-up note (only for flagged check-ins) */}
                          {ci.reviewStatus === 'flagged' && (
                            <div style={{ ...styles.followUpInput, gap: isMobile ? '6px' : '8px' }}>
                              <input
                                value={followUpDrafts[ci.id] || ''}
                                onChange={e => setFollowUpDrafts(prev => ({ ...prev, [ci.id]: e.target.value }))}
                                placeholder={t.checkIns.addFollowUpPlaceholder}
                                style={{ ...styles.followUpField, fontSize: isMobile ? '12px' : '15px', padding: isMobile ? '6px 8px' : '8px 12px' }}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddFollowUp(ci); }}
                              />
                              <button
                                onClick={() => handleAddFollowUp(ci)}
                                style={{
                                  ...styles.followUpBtn,
                                  opacity: followUpDrafts[ci.id]?.trim() ? 1 : 0.4,
                                }}
                                disabled={!followUpDrafts[ci.id]?.trim()}
                              >
                                <Plus size={13} />
                                {t.checkIns.addNote}
                              </button>
                            </div>
                          )}

                          {/* Flag reason */}
                          {ci.reviewStatus === 'flagged' && ci.flagReason && (
                            <div style={styles.flagBanner}>
                              <AlertTriangle size={14} />
                              <span>{ci.flagReason}</span>
                            </div>
                          )}

                          {/* Action bar - pending check-ins */}
                          {ci.reviewStatus === 'pending' && (
                            <div style={styles.actionBar}>
                              <div>
                                <textarea
                                  value={feedbackDrafts[ci.id] ?? ci.coachFeedback}
                                  onChange={e => setFeedbackDrafts(prev => ({ ...prev, [ci.id]: e.target.value }))}
                                  placeholder={t.checkIns.writeFeedbackPlaceholder}
                                  style={{ ...styles.feedbackInput, fontSize: isMobile ? '13px' : '18px', padding: isMobile ? '8px 10px' : '10px 12px' }}
                                  rows={2}
                                />
                                <div style={{ fontSize: isMobile ? '10px' : '12px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Send size={isMobile ? 8 : 10} />
                                  {lang === 'pl' ? 'Twoja opinia będzie widoczna dla klienta' : 'Your feedback will be visible to the client'}
                                </div>
                              </div>
                              {/* Flag input - only shown when toggled */}
                              {showFlagInput === ci.id && (
                                <div style={{ ...styles.flagRow, ...(isMobile ? { padding: '6px 10px', gap: '6px' } : {}) }}>
                                  <Flag size={isMobile ? 11 : 13} color="var(--accent-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                  <input
                                    value={flagDrafts[ci.id] || ''}
                                    onChange={e => setFlagDrafts(prev => ({ ...prev, [ci.id]: e.target.value }))}
                                    placeholder={t.checkIns.flagReasonPlaceholder}
                                    style={{ ...styles.flagInput, fontSize: isMobile ? '12px' : '15px' }}
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter' && flagDrafts[ci.id]?.trim()) handleFlag(ci.id); if (e.key === 'Escape') setShowFlagInput(null); }}
                                  />
                                  <button
                                    onClick={() => handleFlag(ci.id)}
                                    style={{ ...styles.actionBtnDanger, opacity: flagDrafts[ci.id]?.trim() ? 1 : 0.5, fontSize: isMobile ? '12px' : '17px', padding: isMobile ? '5px 10px' : '8px 12px' }}
                                    disabled={!flagDrafts[ci.id]?.trim()}
                                  >
                                    <Send size={isMobile ? 10 : 12} />
                                  </button>
                                </div>
                              )}
                              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '6px' : '8px', flexWrap: isMobile ? undefined : 'wrap' }}>
                                {isMobile ? (
                                  <>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button onClick={() => onViewClient(ci.clientId)} style={{ ...styles.actionBtnSecondary, flex: 1, justifyContent: 'center', fontSize: '12px', padding: '7px 10px' }}>
                                        {t.checkIns.viewProfile}
                                      </button>
                                      <button onClick={() => setShowFlagInput(showFlagInput === ci.id ? null : ci.id)} style={{ ...styles.actionBtnDanger, flex: 1, justifyContent: 'center', fontSize: '12px', padding: '7px 10px', ...(showFlagInput === ci.id ? { background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' } : {}) }}>
                                        <Flag size={11} />
                                        {t.checkIns.flag}
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => handleMarkReviewed(ci.id)}
                                      style={{ ...styles.actionBtnPrimary, justifyContent: 'center', fontSize: '13px', padding: '10px 16px' }}
                                    >
                                      <CheckCircle2 size={13} />
                                      {t.checkIns.markReviewed}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => onViewClient(ci.clientId)} style={styles.actionBtnSecondary}>
                                      {t.checkIns.viewProfile}
                                    </button>
                                    <button onClick={() => setShowFlagInput(showFlagInput === ci.id ? null : ci.id)} style={{ ...styles.actionBtnDanger, ...(showFlagInput === ci.id ? { background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' } : {}) }}>
                                      <Flag size={13} />
                                      {t.checkIns.flag}
                                    </button>
                                    <div style={{ flex: 1 }} />
                                    <button onClick={() => handleMarkReviewed(ci.id)} style={styles.actionBtnPrimary}>
                                      <CheckCircle2 size={13} />
                                      {t.checkIns.markReviewed}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action bar - flagged check-ins */}
                          {ci.reviewStatus === 'flagged' && (
                            <div style={styles.actionBar}>
                              <div>
                                <textarea
                                  value={feedbackDrafts[ci.id] ?? ci.coachFeedback}
                                  onChange={e => setFeedbackDrafts(prev => ({ ...prev, [ci.id]: e.target.value }))}
                                  placeholder={t.checkIns.addFeedbackPlaceholder}
                                  style={{ ...styles.feedbackInput, fontSize: isMobile ? '13px' : '18px', padding: isMobile ? '8px 10px' : '10px 12px' }}
                                  rows={2}
                                />
                                <div style={{ fontSize: isMobile ? '10px' : '12px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Send size={isMobile ? 8 : 10} />
                                  {lang === 'pl' ? 'Twoja opinia będzie widoczna dla klienta' : 'Your feedback will be visible to the client'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '6px' : '8px', flexWrap: isMobile ? undefined : 'wrap' }}>
                                {isMobile ? (
                                  <>
                                    <button onClick={() => onViewClient(ci.clientId)} style={{ ...styles.actionBtnSecondary, justifyContent: 'center', fontSize: '12px', padding: '7px 10px' }}>
                                      {t.checkIns.viewProfile}
                                    </button>
                                    <button onClick={() => handleMarkReviewed(ci.id)} style={{ ...styles.actionBtnPrimary, justifyContent: 'center', fontSize: '13px', padding: '10px 16px' }}>
                                      <CheckCircle2 size={13} />
                                      {t.checkIns.resolveReview}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => onViewClient(ci.clientId)} style={styles.actionBtnSecondary}>{t.checkIns.viewProfile}</button>
                                    <div style={{ flex: 1 }} />
                                    <button onClick={() => handleMarkReviewed(ci.id)} style={styles.actionBtnPrimary}>
                                      <CheckCircle2 size={13} />
                                      {t.checkIns.resolveReview}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Reviewed - just view profile */}
                          {ci.reviewStatus === 'reviewed' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => onViewClient(ci.clientId)} style={{ ...styles.actionBtnSecondary, flex: isMobile ? 1 : undefined, justifyContent: 'center', ...(isMobile ? { fontSize: '12px', padding: '7px 10px' } : {}) }}>{t.checkIns.viewProfile}</button>
                            </div>
                          )}
                          </>
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

      {/* Quick Message Modal */}
      <AnimatePresence>
        {messageModal && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!messageSent) { setMessageModal(null); setMessageDraft(''); } }}
          >
            <motion.div
              style={styles.messageModal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.messageModalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ ...styles.avatar, background: getAvatarColor(messageModal.clientId), width: '32px', height: '32px', fontSize: '14px' }}>
                    {getInitials(messageModal.clientName)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {t.checkIns.messageClient(messageModal.clientName.split(' ')[0])}
                    </h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{t.checkIns.quickMessage}</span>
                  </div>
                </div>
                <button
                  style={styles.messageCloseBtn}
                  onClick={() => { setMessageModal(null); setMessageDraft(''); setMessageSent(false); }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={styles.messageModalBody}>
                {messageSent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={styles.messageSentState}
                  >
                    <CheckCircle2 size={32} color="var(--accent-success)" />
                    <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t.checkIns.messageSent}</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>
                      {t.checkIns.messageSentTo(messageModal.clientName.split(' ')[0])}
                    </p>
                    <button
                      style={styles.actionBtnSecondary}
                      onClick={() => { setMessageModal(null); setMessageDraft(''); setMessageSent(false); }}
                    >
                      {t.checkIns.close}
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <textarea
                      value={messageDraft}
                      onChange={e => setMessageDraft(e.target.value)}
                      placeholder={`Hey ${messageModal.clientName.split(' ')[0]}, ...`}
                      style={styles.messageTextarea}
                      rows={4}
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        style={styles.actionBtnSecondary}
                        onClick={() => { setMessageModal(null); setMessageDraft(''); }}
                      >
                        {t.checkIns.cancel}
                      </button>
                      <button
                        style={{
                          ...styles.messageSendBtn,
                          opacity: messageDraft.trim() ? 1 : 0.4,
                          cursor: messageDraft.trim() ? 'pointer' : 'not-allowed',
                        }}
                        disabled={!messageDraft.trim()}
                        onClick={() => {
                          const msg: Message = {
                            id: crypto.randomUUID(),
                            clientId: messageModal.clientId,
                            clientName: messageModal.clientName,
                            clientAvatar: '',
                            text: messageDraft.trim(),
                            timestamp: new Date().toISOString(),
                            isRead: true,
                            isFromCoach: true,
                          };
                          onSendMessage(msg);
                          setMessageSent(true);
                          setMessageDraft('');
                          setTimeout(() => {
                            setMessageModal(null);
                            setMessageSent(false);
                          }, 1800);
                        }}
                      >
                        <Send size={14} />
                        {t.checkIns.sendMessage}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxPhoto(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              cursor: 'pointer',
            }}
          >
            <motion.img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.label}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 120px)',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              }}
            />
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '12px',
                fontSize: '14px',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {lightboxPhoto.label}
            </motion.span>
            <button
              onClick={() => setLightboxPhoto(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
    fontSize: '18px',
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
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabBadge: {
    fontSize: '11px',
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
    fontSize: '14px',
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
    fontSize: '14px',
  },
  queueItem: {
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-subtle)',
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
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  queueClientName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  queueDate: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
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
    background: 'var(--bg-subtle)',
    fontSize: '13px',
  },
  metricChipValue: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontSize: '13px',
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
    borderTop: '1px solid var(--border-subtle)',
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
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle-strong)',
  },
  metricCellLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  metricCellValue: {
    fontSize: '18px',
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
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  trendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle-strong)',
  },
  trendLabel: {
    fontSize: '13px',
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
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  noteText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: 0,
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
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
    fontSize: '13px',
    fontWeight: 500,
  },
  missedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.12)',
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
    fontSize: '14px',
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
    color: 'var(--text-on-accent)',
    fontSize: '13px',
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
    fontSize: '13px',
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
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  // Point 4: Full-width flag row
  flagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(239,68,68,0.04)',
    border: '1px solid rgba(239,68,68,0.1)',
  },
  flagInput: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239,68,68,0.15)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
  },
  // Point 2: Send Message button
  actionBtnMessage: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(0,229,200,0.2)',
    background: 'rgba(0,229,200,0.06)',
    color: 'var(--accent-primary)',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  // Point 5: Progress photos
  photosRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  photoCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  photoPlaceholder: {
    width: '80px',
    height: '100px',
    borderRadius: 'var(--radius-sm)',
    border: '1px dashed var(--border-dashed)',
    background: 'var(--bg-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: '80px',
    height: '100px',
    borderRadius: 'var(--radius-sm)',
    objectFit: 'cover' as const,
    border: '1px solid var(--glass-border)',
  },
  photoLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'capitalize',
  },
  noPhotoBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px dashed var(--border-dashed)',
    background: 'var(--bg-subtle)',
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  // Point 6: Follow-up notes
  followUpNote: {
    display: 'flex',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
  },
  followUpDate: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    flexShrink: 0,
    minWidth: '50px',
  },
  followUpText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  followUpInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  followUpField: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
  },
  followUpBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--accent-secondary)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  // Quick message modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay-bg)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageModal: {
    width: '440px',
    maxWidth: 'calc(100vw - 32px)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    overflow: 'hidden',
  },
  messageModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--glass-border)',
  },
  messageCloseBtn: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageModalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  messageTextarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontFamily: 'var(--font-display)',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.5,
  },
  messageSendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  messageSentState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 0',
  },
};
