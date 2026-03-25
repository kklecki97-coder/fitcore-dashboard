import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, ArrowUpDown,
  Flame, Pause, Sparkles, MoreHorizontal,
  User, MessageSquare, Edit3, Play, Trash2, X, Save, Dumbbell, Star,
  ShieldAlert,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, WorkoutProgram, WorkoutLog, CheckIn, Message } from '../types';

/* ── Engagement helpers (inline, no external deps) ── */

function getScoreColor(score: number): string {
  if (score >= 80) return '#20dba4';
  if (score >= 50) return '#f59e0b';
  if (score >= 25) return '#f97316';
  return '#e8637a';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 50) return 'good';
  if (score >= 25) return 'needsAttention';
  return 'atRisk';
}

interface EngagementResult {
  total: number;
  trend: 'up' | 'stable' | 'down';
  label: string;
}

function calculateEngagementScore(
  client: Client,
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  messages: Message[],
): EngagementResult {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Workout completion (45%)
  const clientLogs = workoutLogs.filter(
    l => l.clientId === client.id && new Date(l.date).getTime() > thirtyDaysAgo,
  );
  const completedLogs = clientLogs.filter(l => l.completed).length;
  const workoutScore = clientLogs.length > 0
    ? Math.min(100, (completedLogs / Math.max(clientLogs.length, 1)) * 100)
    : client.progress; // fallback to progress field

  // Check-in rate (25%)
  const clientCheckIns = checkIns.filter(
    ci => ci.clientId === client.id && new Date(ci.date).getTime() > thirtyDaysAgo,
  );
  const completedCheckIns = clientCheckIns.filter(ci => ci.status === 'completed').length;
  const checkInScore = clientCheckIns.length > 0
    ? (completedCheckIns / clientCheckIns.length) * 100
    : 50;

  // Streak (20%)
  const streakScore = Math.min(100, (client.streak / 14) * 100);

  // Message responsiveness (10%)
  const clientMessages = messages.filter(
    m => m.clientId === client.id && new Date(m.timestamp).getTime() > thirtyDaysAgo,
  );
  const messageScore = clientMessages.length > 0 ? Math.min(100, clientMessages.length * 15) : 40;

  const total = Math.round(
    workoutScore * 0.45 + checkInScore * 0.25 + streakScore * 0.20 + messageScore * 0.10,
  );

  // Simple trend based on streak
  const trend: 'up' | 'stable' | 'down' =
    client.streak >= 7 ? 'up' : client.streak >= 3 ? 'stable' : 'down';

  return { total, trend, label: getScoreLabel(total) };
}

/* ── Inline ScoreRing (matches production ScoreRing.tsx) ── */

function ScoreRing({
  score, size = 44, strokeWidth = 3.5,
}: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: size * 0.3,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color,
          lineHeight: 1,
        }}>
          {score}
        </span>
      </div>
    </div>
  );
}

/* ── Component ── */

interface ClientsPageProps {
  clients: Client[];
  programs: WorkoutProgram[];
  workoutLogs: WorkoutLog[];
  checkIns: CheckIn[];
  messages: Message[];
  onViewClient: (id: string) => void;
  onAddClient: () => void;
  onNavigate?: (page: 'messages') => void;
  onUpdateClient: (id: string, updates: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientsPage({
  clients: allClients, programs, workoutLogs, checkIns, messages: allMessages,
  onViewClient, onAddClient, onNavigate, onUpdateClient, onDeleteClient,
}: ClientsPageProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEngagement, setFilterEngagement] = useState<'all' | 'at-risk'>('all');
  const [sortBy, setSortBy] = useState<'status' | 'name' | 'newest' | 'plan' | 'engagement'>('status');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Edit Plan modal state
  const [editModal, setEditModal] = useState<{ clientId: string; plan: Client['plan']; status: Client['status'] } | null>(null);
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Pre-compute engagement scores
  const engagementMap = useMemo(() => {
    const map: Record<string, EngagementResult> = {};
    for (const c of allClients) {
      map[c.id] = calculateEngagementScore(c, workoutLogs, checkIns, allMessages);
    }
    return map;
  }, [allClients, workoutLogs, checkIns, allMessages]);

  // Close dropdown when clicking anywhere
  const closeMenu = useCallback(() => setOpenMenuId(null), []);
  useEffect(() => {
    if (openMenuId) {
      document.addEventListener('click', closeMenu);
      return () => document.removeEventListener('click', closeMenu);
    }
  }, [openMenuId, closeMenu]);

  const filtered = allClients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || c.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesEngagement = filterEngagement === 'all' || (engagementMap[c.id]?.total ?? 0) < 50;
    return matchesSearch && matchesPlan && matchesStatus && matchesEngagement;
  });

  const statusOrder: Record<string, number> = { active: 0, paused: 1, pending: 2 };
  const planOrder: Record<string, number> = { Elite: 0, Premium: 1, Basic: 2 };

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'status': {
        const s = statusOrder[a.status] - statusOrder[b.status];
        return s !== 0 ? s : a.name.localeCompare(b.name);
      }
      case 'name':
        return a.name.localeCompare(b.name);
      case 'newest':
        return b.startDate.localeCompare(a.startDate);
      case 'plan': {
        const p = planOrder[a.plan] - planOrder[b.plan];
        return p !== 0 ? p : a.name.localeCompare(b.name);
      }
      case 'engagement': {
        const eA = engagementMap[a.id]?.total ?? 0;
        const eB = engagementMap[b.id]?.total ?? 0;
        return eA - eB;
      }
      default:
        return 0;
    }
  });

  const statusIcon = (status: Client['status']) => {
    switch (status) {
      case 'active': return <Flame size={14} color="var(--accent-success)" />;
      case 'paused': return <Pause size={14} color="var(--accent-warm)" />;
      case 'pending': return <Sparkles size={14} color="var(--accent-secondary)" />;
    }
  };

  const planBadge = (plan: Client['plan']) => {
    const colors: Record<string, { color: string; bg: string }> = {
      Elite: { color: 'var(--accent-warm)', bg: 'var(--accent-warm-dim)' },
      Premium: { color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-dim)' },
      Basic: { color: 'var(--text-secondary)', bg: 'var(--bg-subtle-hover)' },
    };
    return colors[plan] || { color: 'var(--accent-primary)', bg: 'var(--accent-primary-dim)' };
  };

  const handleTogglePause = (clientId: string) => {
    const client = allClients.find(c => c.id === clientId);
    if (client) {
      onUpdateClient(clientId, { status: client.status === 'paused' ? 'active' : 'paused' });
    }
  };

  const handleDelete = (clientId: string) => {
    onDeleteClient(clientId);
    setDeleteConfirm(null);
  };

  const handleSaveEdit = () => {
    if (!editModal) return;
    const rateMap: Record<string, number> = { Basic: 99, Premium: 199, Elite: 299 };
    onUpdateClient(editModal.clientId, {
      plan: editModal.plan,
      status: editModal.status,
      monthlyRate: rateMap[editModal.plan],
    });
    setEditModal(null);
  };

  const engagementLabelMap: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Good',
    needsAttention: 'At Risk',
    atRisk: 'Critical',
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '14px 16px' : '32px 40px', gap: isMobile ? '14px' : '24px' }}>
      {/* Top Bar */}
      <div style={{ ...styles.topBar, flexWrap: isMobile ? 'wrap' : undefined, gap: isMobile ? '8px' : '12px' }}>
        <div style={{ ...styles.searchBox, maxWidth: isMobile ? '100%' : '360px', order: isMobile ? -1 : undefined, ...(isMobile ? { padding: '8px 12px', gap: '8px' } : {}) }}>
          <Search size={isMobile ? 14 : 16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...styles.searchInput, ...(isMobile ? { fontSize: '13px' } : {}) }}
          />
        </div>

        <div className={isMobile ? 'hide-scrollbar' : ''} style={{
          ...styles.filters,
          ...(isMobile ? {
            flex: '1 1 100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          } : {}),
        }}>
          <div style={{ ...styles.filterGroup, flexShrink: 0, ...(isMobile ? { padding: '6px 8px', gap: '4px' } : {}) }}>
            <Filter size={isMobile ? 12 : 14} color="var(--text-tertiary)" />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              style={{ ...styles.select, ...(isMobile ? { fontSize: '12px' } : {}) }}
            >
              <option value="all">All Plans</option>
              <option value="Elite">Elite</option>
              <option value="Premium">Premium</option>
              <option value="Basic">Basic</option>
            </select>
          </div>
          <div style={{ ...styles.filterGroup, flexShrink: 0, ...(isMobile ? { padding: '6px 8px', gap: '4px' } : {}) }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...styles.select, ...(isMobile ? { fontSize: '12px' } : {}) }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div style={{ ...styles.filterGroup, flexShrink: 0, ...(isMobile ? { padding: '6px 8px', gap: '4px' } : {}) }}>
            <ArrowUpDown size={isMobile ? 12 : 14} color="var(--text-tertiary)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{ ...styles.select, ...(isMobile ? { fontSize: '12px' } : {}) }}
            >
              <option value="status">Sort: Status</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="newest">Sort: Newest</option>
              <option value="plan">Sort: Plan Tier</option>
              <option value="engagement">Sort: Engagement</option>
            </select>
          </div>
          <button
            onClick={() => setFilterEngagement(filterEngagement === 'all' ? 'at-risk' : 'all')}
            style={{
              ...styles.atRiskBtn,
              flexShrink: 0,
              ...(isMobile ? { fontSize: '12px', padding: '6px 8px' } : {}),
              ...(filterEngagement === 'at-risk' ? {
                background: 'var(--accent-danger-dim)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: 'var(--accent-danger)',
              } : {}),
            }}
          >
            <ShieldAlert size={14} />
            {filterEngagement === 'at-risk' ? 'At Risk Only' : 'All Clients'}
          </button>
        </div>

        <button onClick={onAddClient} style={{ ...styles.addBtn, ...(isMobile ? { flex: 1, justifyContent: 'center', fontSize: '13px', padding: '8px 14px', gap: '4px' } : {}) }}>
          <Plus size={isMobile ? 14 : 16} />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div style={{ ...styles.miniStats, gap: isMobile ? '10px' : '24px', flexWrap: isMobile ? 'wrap' : undefined }}>
        <div style={{ ...styles.miniStat, ...(isMobile ? { fontSize: '12px' } : {}) }}>
          <span style={{ color: 'var(--accent-success)' }}>
            {allClients.filter(c => c.status === 'active').length}
          </span> Active
        </div>
        <div style={{ ...styles.miniStat, ...(isMobile ? { fontSize: '12px' } : {}) }}>
          <span style={{ color: 'var(--accent-warm)' }}>
            {allClients.filter(c => c.status === 'paused').length}
          </span> Paused
        </div>
        <div style={{ ...styles.miniStat, ...(isMobile ? { fontSize: '12px' } : {}) }}>
          <span style={{ color: 'var(--text-primary)' }}>
            {allClients.length}
          </span> Total
        </div>
      </div>

      {/* Client Cards Grid */}
      {sorted.length === 0 ? (
        <div style={styles.emptyState}>
          <User size={48} color="var(--text-tertiary)" />
          <div style={styles.emptyTitle}>
            {allClients.length === 0 ? 'No clients yet' : 'No clients match your filters'}
          </div>
          <div style={styles.emptySub}>
            {allClients.length === 0
              ? 'Add your first client to get started.'
              : 'Try adjusting your search or filters.'}
          </div>
          {allClients.length === 0 && (
            <button onClick={onAddClient} style={{ ...styles.addBtn, marginTop: '16px' }}>
              <Plus size={16} /> Add Client
            </button>
          )}
        </div>
      ) : (
      <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {sorted.map((client, i) => {
          const badge = planBadge(client.plan);
          const engagement = engagementMap[client.id];
          const score = engagement?.total ?? 0;
          const label = engagement?.label ?? 'good';
          return (
            <GlassCard
              key={client.id}
              delay={i * 0.04}
              hover
              onClick={() => onViewClient(client.id)}
              style={{ ...(isMobile ? { padding: '14px 16px' } : {}), overflow: 'visible', ...(openMenuId === client.id ? { zIndex: 50, position: 'relative' as const } : {}) }}
            >
              <div style={{ ...styles.cardTop, ...(isMobile ? { marginBottom: '12px' } : {}) }}>
                <div style={{ ...styles.clientInfo, ...(isMobile ? { gap: '8px' } : {}) }}>
                  <div className="avatar-tooltip-wrap" style={styles.avatarWrap}>
                    <div style={{ ...styles.avatar, background: getAvatarColor(client.id), ...(isMobile ? { width: '30px', height: '30px', fontSize: '12px', borderRadius: '8px' } : {}) }}>
                      {getInitials(client.name)}
                    </div>
                    {(() => {
                      const keyNotes = client.notesHistory?.filter(n => n.isKey) || [];
                      const displayNotes = keyNotes.length > 0
                        ? keyNotes
                        : client.notesHistory?.slice(0, 1) || [];
                      return displayNotes.length > 0 ? (
                        <div className="avatar-tooltip" style={styles.tooltip}>
                          <div style={styles.tooltipLabel}>
                            {keyNotes.length > 0 ? (
                              <><Star size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />Key Notes</>
                            ) : 'Latest Note'}
                          </div>
                          {displayNotes.map((n, idx) => (
                            <div key={idx} style={idx > 0 ? { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--glass-border)' } : undefined}>
                              {n.text}
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <div style={{ ...styles.clientName, ...(isMobile ? { fontSize: '14px' } : {}) }}>{client.name}</div>
                    <div style={{ ...styles.clientEmail, ...(isMobile ? { fontSize: '11px' } : {}) }}>{client.email}</div>
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === client.id ? null : client.id);
                    }}
                    style={styles.moreBtn}
                  >
                    <MoreHorizontal size={isMobile ? 14 : 16} color="var(--text-tertiary)" />
                  </button>
                  {openMenuId === client.id && (
                      <div className="dropdown-menu" style={styles.dropdownMenu}>
                        <button
                          style={styles.menuItem}
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onViewClient(client.id); }}
                        >
                          <User size={14} /> View Profile
                        </button>
                        <button
                          style={styles.menuItem}
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onNavigate?.('messages'); }}
                        >
                          <MessageSquare size={14} /> Message
                        </button>
                        <button
                          style={styles.menuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setEditModal({ clientId: client.id, plan: client.plan, status: client.status });
                          }}
                        >
                          <Edit3 size={14} /> Edit Plan
                        </button>
                        <button
                          style={styles.menuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleTogglePause(client.id);
                          }}
                        >
                          {client.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                          {client.status === 'paused' ? 'Resume' : 'Pause'}
                        </button>
                        <div style={styles.menuDivider} />
                        <button
                          style={{ ...styles.menuItem, color: 'var(--accent-danger)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setDeleteConfirm(client.id);
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                  )}
                </div>
              </div>

              {/* Badges: Plan + Status + Programs */}
              <div style={{ ...styles.cardMeta, ...(isMobile ? { marginBottom: '10px', gap: '6px' } : {}) }}>
                <span style={{ ...styles.planBadge, color: badge.color, background: badge.bg, ...(isMobile ? { fontSize: '11px', padding: '2px 8px' } : {}) }}>
                  {client.plan}
                </span>
                <span style={{ ...styles.statusBadge, ...(isMobile ? { fontSize: '11px' } : {}) }}>
                  {statusIcon(client.status)}
                  <span style={{ textTransform: 'capitalize' }}>{client.status}</span>
                </span>
                {programs.filter(p => p.clientIds.includes(client.id)).map(p => (
                  <span key={p.id} style={{ ...styles.programBadge, ...(isMobile ? { fontSize: '10px' } : {}) }}>
                    <Dumbbell size={isMobile ? 8 : 10} />
                    {p.name}
                  </span>
                ))}
              </div>

              {/* Engagement Row: Ring + Stats */}
              <div style={styles.engagementRow}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <ScoreRing
                    score={score}
                    size={isMobile ? 36 : 44}
                    strokeWidth={isMobile ? 3 : 3.5}
                  />
                  <span style={{
                    fontSize: isMobile ? '8px' : '9px',
                    fontWeight: 600,
                    color: getScoreColor(score),
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>
                    {engagementLabelMap[label] || label}
                  </span>
                </div>
                <div style={styles.cardStats}>
                  <div style={styles.cardStatItem}>
                    <div style={{ ...styles.cardStatLabel, ...(isMobile ? { fontSize: '10px' } : {}) }}>Progress</div>
                    <div style={{ ...styles.cardStatValue, ...(isMobile ? { fontSize: '13px' } : {}) }}>{client.progress}%</div>
                  </div>
                  <div style={styles.cardStatItem}>
                    <div style={{ ...styles.cardStatLabel, ...(isMobile ? { fontSize: '10px' } : {}) }}>Rate</div>
                    <div style={{ ...styles.cardStatValue, ...(isMobile ? { fontSize: '13px' } : {}) }}>${client.monthlyRate}</div>
                  </div>
                  <div style={styles.cardStatItem}>
                    <div style={{ ...styles.cardStatLabel, ...(isMobile ? { fontSize: '10px' } : {}) }}>Streak</div>
                    <div style={{ ...styles.cardStatValue, ...(isMobile ? { fontSize: '13px' } : {}) }}>
                      {client.streak > 0 ? `${client.streak}d` : '\u2014'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={styles.progressBar}>
                <motion.div
                  style={{
                    ...styles.progressFill,
                    background: client.progress > 80 ? 'var(--accent-success)' :
                                client.progress > 50 ? 'var(--accent-primary)' : 'var(--accent-warm)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${client.progress}%` }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                />
              </div>

              <div style={styles.cardFooter}>
                <span style={{ ...styles.footerText, ...(isMobile ? { fontSize: '11px' } : {}) }}>Next check-in: {client.nextCheckIn}</span>
                <span style={{ ...styles.footerText, ...(isMobile ? { fontSize: '11px' } : {}) }}>{client.lastActive}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      )}

      {/* Edit Plan Modal */}
      <AnimatePresence>
        {editModal && (
          <>
            <motion.div
              key="edit-overlay"
              style={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditModal(null)}
            />
            <motion.div
              key="edit-modal"
              style={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Edit Plan</h3>
                <button style={styles.closeBtn} onClick={() => setEditModal(null)}>
                  <X size={18} />
                </button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>Plan Tier</span>
                  <div style={styles.modalPlanPicker}>
                    {(['Basic', 'Premium', 'Elite'] as const).map(p => {
                      const isActive = editModal.plan === p;
                      const accentMap = { Basic: 'var(--accent-primary)', Premium: 'var(--accent-secondary)', Elite: 'var(--accent-warm)' };
                      const rateMap = { Basic: 99, Premium: 199, Elite: 299 };
                      return (
                        <button
                          key={p}
                          onClick={() => setEditModal({ ...editModal, plan: p })}
                          style={{
                            ...styles.modalPlanOption,
                            ...(isActive ? { borderColor: accentMap[p], color: accentMap[p], background: 'var(--bg-subtle)' } : {}),
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '18px' }}>{p}</div>
                          <div style={{ fontSize: '15px', opacity: 0.7 }}>${rateMap[p]}/mo</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>Status</span>
                  <div style={styles.modalPlanPicker}>
                    {(['active', 'paused', 'pending'] as const).map(s => {
                      const isActive = editModal.status === s;
                      const colorMap = { active: 'var(--accent-success)', paused: 'var(--accent-warm)', pending: 'var(--accent-secondary)' };
                      return (
                        <button
                          key={s}
                          onClick={() => setEditModal({ ...editModal, status: s })}
                          style={{
                            ...styles.modalPlanOption,
                            ...(isActive ? { borderColor: colorMap[s], color: colorMap[s], background: 'var(--bg-subtle)' } : {}),
                          }}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div style={styles.modalActions}>
                <button style={styles.modalCancelBtn} onClick={() => setEditModal(null)}>Cancel</button>
                <button style={styles.modalPrimaryBtn} onClick={handleSaveEdit}>
                  <Save size={14} />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              key="del-overlay"
              style={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              key="del-modal"
              style={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>Delete Client</h3>
                <button style={styles.closeBtn} onClick={() => setDeleteConfirm(null)}>
                  <X size={18} />
                </button>
              </div>
              <div style={styles.modalBody}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>
                    {allClients.find(c => c.id === deleteConfirm)?.name}
                  </strong>? This action cannot be undone.
                </p>
              </div>
              <div style={styles.modalActions}>
                <button style={styles.modalCancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button
                  style={{ ...styles.modalPrimaryBtn, background: 'var(--accent-danger)', boxShadow: 'none' }}
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    flex: 1,
    maxWidth: '360px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    flex: 1,
  },
  filters: {
    display: 'flex',
    gap: '8px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
  },
  select: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  atRiskBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    marginLeft: 'auto',
    boxShadow: '0 0 20px var(--accent-primary-dim)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  miniStats: {
    display: 'flex',
    gap: '24px',
    padding: '0 4px',
  },
  miniStat: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    display: 'flex',
    gap: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  clientInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
  },
  clientName: {
    fontSize: '21px',
    fontWeight: 600,
  },
  clientEmail: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  moreBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  planBadge: {
    fontSize: '15px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  programBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '14px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '20px',
    color: 'var(--accent-primary)',
    background: 'var(--accent-primary-dim)',
    whiteSpace: 'nowrap',
  },
  engagementRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 0',
    width: '100%',
  },
  cardStats: {
    display: 'flex',
    justifyContent: 'space-between',
    flex: 1,
  },
  cardStatItem: {
    textAlign: 'center',
  },
  cardStatLabel: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    marginBottom: '2px',
  },
  cardStatValue: {
    fontSize: '22px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: 'var(--bg-subtle-hover)',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px',
    minWidth: '160px',
    boxShadow: 'var(--shadow-elevated)',
    zIndex: 10,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.1s, color 0.1s',
  },
  menuDivider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '4px 8px',
  },
  avatarWrap: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    left: 'calc(100% + 12px)',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '17px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    width: '220px',
    boxShadow: 'var(--shadow-elevated)',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.15s',
    zIndex: 10,
  },
  tooltipLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay-bg)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    width: '420px',
    maxWidth: '90vw',
    zIndex: 101,
    boxShadow: 'var(--shadow-elevated)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--glass-border)',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  modalLabel: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.3px',
  },
  modalPlanPicker: {
    display: 'flex',
    gap: '8px',
  },
  modalPlanOption: {
    flex: 1,
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'var(--font-display)',
    transition: 'all 0.2s',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    padding: '0 24px 20px',
  },
  modalCancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  modalPrimaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    gap: '10px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
  },
  emptySub: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    maxWidth: '280px',
    lineHeight: 1.5,
  },
};
