import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, ArrowUpDown,
  Flame, Pause, Sparkles, MoreHorizontal,
  User, MessageSquare, Edit3, Play, Trash2, X, Save, Dumbbell, Star,
  Mail, Copy, Check, Link, Loader2, CheckCircle, UserPlus, ShieldAlert,
} from 'lucide-react';
import GlassCard from './GlassCard';
import ScoreRing from './ScoreRing';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/locale';
import { calculateEngagementScore, getScoreColor } from '../utils/engagement-score';
import { useData } from '../contexts/DataProvider';
import type { Client } from '../types';

interface ClientsPageProps {
  onViewClient: (id: string) => void;
  onNavigate?: (page: 'messages') => void;
}

export default function ClientsPage({ onViewClient, onNavigate }: ClientsPageProps) {
  const isMobile = useIsMobile();
  const { t, lang } = useLang();
  const { clients: allClients, programs, plans, workoutLogs, checkIns, messages, invoices, updateClient: onUpdateClient, deleteClient: onDeleteClient, addInvoice: onAddInvoice } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEngagement, setFilterEngagement] = useState<'all' | 'at-risk'>('all');
  const [sortBy, setSortBy] = useState<'status' | 'name' | 'newest' | 'plan' | 'engagement'>('status');

  // Pre-compute engagement scores for all clients
  const engagementMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateEngagementScore>> = {};
    for (const c of allClients) {
      map[c.id] = calculateEngagementScore(c, workoutLogs, checkIns, messages);
    }
    return map;
  }, [allClients, workoutLogs, checkIns, messages]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Edit Plan modal state
  const [editModal, setEditModal] = useState<{ clientId: string; plan: Client['plan']; status: Client['status'] } | null>(null);
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePlan, setInvitePlan] = useState<string>('');
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: boolean; link?: string; error?: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const generateInviteCode = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => charset[b % charset.length]).join('');
  };

  const handleSendInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviteGenerating(true);
    setInviteResult(null);

    try {
      const code = generateInviteCode();
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const user = session.user;
      const { data: coachRow } = await supabase
        .from('coaches')
        .select('name')
        .eq('id', user.id)
        .single();

      const { error: insertError } = await supabase.from('invite_codes').insert({
        code,
        coach_id: user.id,
        client_name: inviteName.trim(),
        client_email: inviteEmail.trim().toLowerCase(),
        plan: invitePlan,
        expires_at: expires.toISOString(),
      });

      if (insertError) throw insertError;

      const inviteLink = `https://client.fitcore.tech/join/${code}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            clientName: inviteName.trim(),
            clientEmail: inviteEmail.trim().toLowerCase(),
            plan: invitePlan,
            coachName: coachRow?.name || 'Your Coach',
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.warn('Email send failed:', errBody.error || res.statusText);
      }

      setInviteResult({ success: true, link: inviteLink });
    } catch (err) {
      setInviteResult({ success: false, error: err instanceof Error ? err.message : t.settings.inviteError });
    } finally {
      setInviteGenerating(false);
    }
  };

  const handleCopyInvite = () => {
    if (inviteResult?.link) {
      navigator.clipboard.writeText(inviteResult.link);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  const handleCloseInvite = () => {
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setInvitePlan('Basic');
    setInviteResult(null);
    setInviteCopied(false);
  };

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
        return eA - eB; // lowest first (needs attention first)
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

  const planBadge = (plan: string) => {
    const colors: Record<string, { color: string; bg: string }> = {
      Elite: { color: 'var(--accent-warm)', bg: 'var(--accent-warm-dim)' },
      Premium: { color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-dim)' },
      Basic: { color: 'var(--text-secondary)', bg: 'var(--bg-subtle-hover)' },
    };
    return colors[plan] || { color: 'var(--accent-primary)', bg: 'var(--accent-primary-dim)' };
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t.clients.active,
      paused: t.clients.paused,
      pending: t.clients.pending,
    };
    return map[status] || status;
  };

  const planLabel = (plan: string) => {
    const map: Record<string, string> = {
      Basic: t.clients.basic,
      Premium: t.clients.premium,
      Elite: t.clients.elite,
    };
    return map[plan] || plan;
  };

  const handleTogglePause = (clientId: string) => {
    const client = allClients.find(c => c.id === clientId);
    if (!client) return;

    if (client.status === 'paused') {
      // Reactivating: reset start_date to today and auto-generate invoice
      const today = new Date().toISOString().split('T')[0];
      onUpdateClient(clientId, { status: 'active', startDate: today });

      // Auto-generate invoice if client has a plan
      const matchedPlan = plans.find(p => p.name === client.plan && p.isActive);
      if (matchedPlan && matchedPlan.billingCycle !== 'one-time') {
        const period = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        // Check if invoice for this period already exists
        const alreadyExists = invoices.some(
          inv => inv.clientId === clientId && inv.period === period && inv.plan === client.plan
        );
        if (!alreadyExists) {
          onAddInvoice({
            id: crypto.randomUUID(),
            clientId,
            clientName: client.name,
            amount: matchedPlan.price,
            status: 'pending',
            dueDate: today,
            paidDate: null,
            period,
            plan: client.plan,
          });
        }
      }
    } else {
      onUpdateClient(clientId, { status: 'paused' });
    }
  };

  const handleDelete = (clientId: string) => {
    onDeleteClient(clientId);
    setDeleteConfirm(null);
  };

  const handleSaveEdit = () => {
    if (!editModal) return;
    const matchedPlan = plans.find(p => p.name === editModal.plan);
    const rate = matchedPlan ? matchedPlan.price : 0;
    onUpdateClient(editModal.clientId, {
      plan: editModal.plan,
      status: editModal.status,
      monthlyRate: rate,
    });
    setEditModal(null);
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '14px 16px' : '32px 40px', gap: isMobile ? '14px' : '24px' }}>
      {/* Top Bar */}
      <div style={{ ...styles.topBar, flexWrap: isMobile ? 'wrap' : undefined, gap: isMobile ? '8px' : '12px' }}>
        <div style={{ ...styles.searchBox, maxWidth: isMobile ? '100%' : '360px', order: isMobile ? -1 : undefined, ...(isMobile ? { padding: '8px 12px', gap: '8px' } : {}) }}>
          <Search size={isMobile ? 14 : 16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder={t.clients.searchPlaceholder}
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
              <option value="all">{t.clients.allPlans}</option>
              <option value="Elite">{t.clients.elite}</option>
              <option value="Premium">{t.clients.premium}</option>
              <option value="Basic">{t.clients.basic}</option>
            </select>
          </div>
          <div style={{ ...styles.filterGroup, flexShrink: 0, ...(isMobile ? { padding: '6px 8px', gap: '4px' } : {}) }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...styles.select, ...(isMobile ? { fontSize: '12px' } : {}) }}
            >
              <option value="all">{t.clients.allStatuses}</option>
              <option value="active">{t.clients.active}</option>
              <option value="paused">{t.clients.paused}</option>
            </select>
          </div>
          <div style={{ ...styles.filterGroup, flexShrink: 0, ...(isMobile ? { padding: '6px 8px', gap: '4px' } : {}) }}>
            <ArrowUpDown size={isMobile ? 12 : 14} color="var(--text-tertiary)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{ ...styles.select, ...(isMobile ? { fontSize: '12px' } : {}) }}
            >
              <option value="status">{t.clients.sortStatus}</option>
              <option value="name">{t.clients.sortName}</option>
              <option value="newest">{t.clients.sortNewest}</option>
              <option value="plan">{t.clients.sortPlan}</option>
              <option value="engagement">{t.engagement.sortEngagement}</option>
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
            {filterEngagement === 'at-risk' ? t.engagement.showAtRiskOnly : t.engagement.allClients}
          </button>
        </div>

        <button onClick={() => setShowInviteModal(true)} style={{ ...styles.addBtn, ...(isMobile ? { flex: 1, justifyContent: 'center', fontSize: '13px', padding: '8px 14px', gap: '4px' } : {}) }}>
          <Plus size={isMobile ? 14 : 16} />
          {t.clients.addClient}
        </button>
      </div>

      {/* Stats */}
      <div style={{ ...styles.miniStats, gap: isMobile ? '10px' : '24px', flexWrap: isMobile ? 'wrap' : undefined }}>
        <div style={{ ...styles.miniStat, ...(isMobile ? { fontSize: '12px' } : {}) }}>
          <span style={{ color: 'var(--accent-success)' }}>
            {allClients.filter(c => c.status === 'active').length}
          </span> {t.clients.active}
        </div>
        <div style={{ ...styles.miniStat, ...(isMobile ? { fontSize: '12px' } : {}) }}>
          <span style={{ color: 'var(--accent-warm)' }}>
            {allClients.filter(c => c.status === 'paused').length}
          </span> {t.clients.paused}
        </div>
        <div style={{ ...styles.miniStat, ...(isMobile ? { fontSize: '12px' } : {}) }}>
          <span style={{ color: 'var(--text-primary)' }}>
            {allClients.length}
          </span> {t.clients.total}
        </div>
      </div>

      {/* Client Cards Grid */}
      {sorted.length === 0 ? (
        <div style={styles.emptyState}>
          <User size={48} color="var(--text-tertiary)" />
          <div style={styles.emptyTitle}>
            {allClients.length === 0 ? t.clients.noClientsYet : t.clients.noClientsMatch}
          </div>
          <div style={styles.emptySub}>
            {allClients.length === 0
              ? t.clients.addFirstClient
              : t.clients.adjustFilters}
          </div>
        </div>
      ) : (
      <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {sorted.map((client, i) => {
          const badge = planBadge(client.plan);
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
                              <><Star size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{t.clients.keyNotes}</>
                            ) : t.clients.latestNote}
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
                          <User size={14} /> {t.clients.viewProfile}
                        </button>
                        <button
                          style={styles.menuItem}
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onNavigate?.('messages'); }}
                        >
                          <MessageSquare size={14} /> {t.clients.message}
                        </button>
                        <button
                          style={styles.menuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setEditModal({ clientId: client.id, plan: client.plan, status: client.status });
                          }}
                        >
                          <Edit3 size={14} /> {t.clients.editPlan}
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
                          {client.status === 'paused' ? t.clients.resume : t.clients.pause}
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
                          <Trash2 size={14} /> {t.clients.delete}
                        </button>
                      </div>
                  )}
                </div>
              </div>

              <div style={{ ...styles.cardMeta, ...(isMobile ? { marginBottom: '10px', gap: '6px' } : {}) }}>
                <span style={{ ...styles.planBadge, color: badge.color, background: badge.bg, ...(isMobile ? { fontSize: '11px', padding: '2px 8px' } : {}) }}>
                  {planLabel(client.plan)}
                </span>
                <span style={{ ...styles.statusBadge, ...(isMobile ? { fontSize: '11px' } : {}) }}>
                  {statusIcon(client.status)}
                  <span style={{ textTransform: 'capitalize' }}>{statusLabel(client.status)}</span>
                </span>
                {programs.filter(p => p.clientIds.includes(client.id)).map(p => (
                  <span key={p.id} style={{ ...styles.programBadge, ...(isMobile ? { fontSize: '10px' } : {}) }}>
                    <Dumbbell size={isMobile ? 8 : 10} />
                    {p.name}
                  </span>
                ))}
              </div>

              <div style={styles.engagementRow}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <ScoreRing
                    score={engagementMap[client.id]?.total ?? 0}
                    trend={engagementMap[client.id]?.trend}
                    size={isMobile ? 36 : 44}
                    strokeWidth={isMobile ? 3 : 3.5}
                    showTrend={false}
                  />
                  <span style={{
                    fontSize: isMobile ? '8px' : '9px',
                    fontWeight: 600,
                    color: getScoreColor(engagementMap[client.id]?.total ?? 0),
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>
                    {(() => {
                      const lbl = engagementMap[client.id]?.label ?? 'good';
                      const labels: Record<string, string> = {
                        excellent: t.engagement.excellent,
                        good: t.engagement.good,
                        needsAttention: t.engagement.atRisk,
                        atRisk: t.engagement.critical,
                      };
                      return labels[lbl] || lbl;
                    })()}
                  </span>
                </div>
                <div style={styles.cardStats}>
                  <div style={styles.cardStatItem}>
                    <div style={{ ...styles.cardStatLabel, ...(isMobile ? { fontSize: '10px' } : {}) }}>{t.clients.progress}</div>
                    <div style={{ ...styles.cardStatValue, ...(isMobile ? { fontSize: '13px' } : {}) }}>{client.progress}%</div>
                  </div>
                  <div style={styles.cardStatItem}>
                    <div style={{ ...styles.cardStatLabel, ...(isMobile ? { fontSize: '10px' } : {}) }}>{t.clients.rate}</div>
                    <div style={{ ...styles.cardStatValue, ...(isMobile ? { fontSize: '13px' } : {}) }}>{formatCurrency(client.monthlyRate, lang)}</div>
                  </div>
                  <div style={styles.cardStatItem}>
                    <div style={{ ...styles.cardStatLabel, ...(isMobile ? { fontSize: '10px' } : {}) }}>{t.clients.streak}</div>
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
                <span style={{ ...styles.footerText, ...(isMobile ? { fontSize: '11px' } : {}) }}>{lang === 'pl' ? 'Następny raport' : 'Next check-in'}: {client.nextCheckIn}</span>
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
          <motion.div
            key="edit-overlay"
            style={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditModal(null)}
          >
            <motion.div
              key="edit-modal"
              style={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{t.clients.editPlanStatus}</h3>
                <button style={styles.closeBtn} onClick={() => setEditModal(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>{t.clients.planTier}</span>
                  <div style={styles.modalPlanPicker}>
                    {(plans.filter(p => p.isActive).length > 0
                      ? plans.filter(p => p.isActive).map(p => {
                          const isActive = editModal.plan === p.name;
                          const cycleSuffix = p.billingCycle === 'monthly' ? '/mo' : p.billingCycle === 'weekly' ? '/wk' : '';
                          return (
                            <button
                              key={p.id}
                              onClick={() => setEditModal({ ...editModal, plan: p.name as Client['plan'] })}
                              style={{
                                ...styles.modalPlanOption,
                                ...(isActive ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', background: 'var(--bg-subtle)' } : {}),
                              }}
                            >
                              <div style={{ fontWeight: 600, fontSize: '16px' }}>{p.name}</div>
                              <div style={{ fontSize: '14px', opacity: 0.7 }}>{formatCurrency(p.price, lang)}{cycleSuffix}</div>
                            </button>
                          );
                        })
                      : <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '10px 12px', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', width: '100%' }}>
                            {lang === 'pl' ? 'Utwórz plany w Ustawieniach → Plany i Cennik' : 'Create plans in Settings → Plans & Pricing'}
                          </div>
                    )}
                  </div>
                </div>

                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>{t.clients.status}</span>
                  <div style={styles.modalPlanPicker}>
                    {(['active', 'paused'] as const).map(s => {
                      const isActive = editModal.status === s;
                      const colorMap: Record<string, string> = { active: 'var(--accent-success)', paused: 'var(--accent-warm)' };
                      return (
                        <button
                          key={s}
                          onClick={() => setEditModal({ ...editModal, status: s })}
                          style={{
                            ...styles.modalPlanOption,
                            ...(isActive ? { borderColor: colorMap[s], color: colorMap[s], background: 'var(--bg-subtle)' } : {}),
                          }}
                        >
                          {statusLabel(s)}
                        </button>
                      );
                    })}
                    {editModal.status === 'paused' && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                        {lang === 'pl' ? 'Wstrzymany klient nie będzie otrzymywać faktur' : 'Paused clients will not receive invoices'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={styles.modalActions}>
                <button style={styles.modalCancelBtn} onClick={() => setEditModal(null)}>{t.clients.cancel}</button>
                <button style={styles.modalPrimaryBtn} onClick={handleSaveEdit}>
                  <Save size={14} />
                  {t.clients.saveChanges}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            key="del-overlay"
            style={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              key="del-modal"
              style={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{t.clients.deleteClient}</h3>
                <button style={styles.closeBtn} onClick={() => setDeleteConfirm(null)}>
                  <X size={18} />
                </button>
              </div>
              <div style={styles.modalBody}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {t.clients.deleteConfirmMsg(allClients.find(c => c.id === deleteConfirm)?.name || '')}{' '}
                  {t.clients.cannotBeUndone}
                </p>
              </div>
              <div style={styles.modalActions}>
                <button style={styles.modalCancelBtn} onClick={() => setDeleteConfirm(null)}>{t.clients.cancel}</button>
                <button
                  style={{ ...styles.modalPrimaryBtn, background: 'var(--accent-danger)', boxShadow: 'none' }}
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  <Trash2 size={14} />
                  {t.clients.delete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Client Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            key="invite-overlay"
            style={styles.inviteOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseInvite}
          >
            <motion.div
              key="invite-modal"
              style={{ ...styles.inviteModal, width: isMobile ? '90vw' : '440px' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.inviteModalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={styles.inviteIconWrap}>
                    <UserPlus size={18} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <h3 style={styles.inviteModalTitle}>{t.settings.clientInvites}</h3>
                    <p style={styles.inviteModalSub}>{t.settings.clientInvitesSub}</p>
                  </div>
                </div>
                <button style={styles.inviteCloseBtn} onClick={handleCloseInvite}>
                  <X size={18} />
                </button>
              </div>

              <div style={styles.inviteDivider} />

              {inviteResult?.success ? (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle size={40} color="var(--accent-success)" style={{ marginBottom: 12 }} />
                  </motion.div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {t.settings.inviteSentTitle}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                    {t.settings.inviteSentTo(inviteEmail)}
                  </div>

                  {inviteResult.link && (
                    <div style={styles.inviteLinkBox}>
                      <Link size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' as const }}>
                        {inviteResult.link}
                      </span>
                      <button onClick={handleCopyInvite} style={styles.inviteCopyBtn}>
                        {inviteCopied ? <Check size={14} /> : <Copy size={14} />}
                        {inviteCopied ? t.settings.inviteLinkCopied : t.settings.inviteLinkCopy}
                      </button>
                    </div>
                  )}

                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 10 }}>
                    {t.settings.inviteExpiry}
                  </div>

                  <button onClick={handleCloseInvite} style={styles.inviteDoneBtn}>
                    {t.clients.done || 'Done'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={styles.inviteField}>
                    <label style={styles.inviteFieldLabel}>{t.settings.inviteClientName}</label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder={t.settings.inviteNamePlaceholder}
                      style={styles.inviteFieldInput}
                    />
                  </div>
                  <div style={styles.inviteField}>
                    <label style={styles.inviteFieldLabel}>{t.settings.inviteClientEmail}</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder={t.settings.inviteEmailPlaceholder}
                      style={styles.inviteFieldInput}
                    />
                  </div>
                  <div style={styles.inviteField}>
                    <label style={styles.inviteFieldLabel}>{t.settings.invitePlan}</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {plans.filter(p => p.isActive).length > 0
                        ? plans.filter(p => p.isActive).map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setInvitePlan(prev => prev === p.name ? '' : p.name)}
                              style={{
                                flex: 1,
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: `1.5px solid ${invitePlan === p.name ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                                background: invitePlan === p.name ? 'rgba(0,229,200,0.08)' : 'transparent',
                                color: invitePlan === p.name ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontSize: '13px',
                                fontWeight: 600,
                                fontFamily: 'var(--font-display)',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{formatCurrency(p.price, lang)}{p.billingCycle === 'monthly' ? '/mo' : p.billingCycle === 'weekly' ? '/wk' : ''}</div>
                            </button>
                          ))
                        : <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '10px 12px', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                            {lang === 'pl' ? 'Utwórz plany w Ustawieniach → Plany i Cennik' : 'Create plans in Settings → Plans & Pricing'}
                          </div>
                      }
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '6px 12px', background: 'rgba(0,229,200,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,229,200,0.1)' }}>
                    {lang === 'pl' ? 'Fakturę dla klienta możesz utworzyć po rejestracji w zakładce Płatności' : 'You can create an invoice for this client after they register in the Payments tab'}
                  </div>

                  {inviteResult?.error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: '13px', color: 'var(--accent-danger)', textAlign: 'center' }}
                    >
                      {inviteResult.error}
                    </motion.div>
                  )}

                  <button
                    onClick={handleSendInvite}
                    disabled={inviteGenerating || !inviteName.trim() || !inviteEmail.trim()}
                    style={{
                      ...styles.inviteSendBtn,
                      opacity: inviteGenerating || !inviteName.trim() || !inviteEmail.trim() ? 0.5 : 1,
                      cursor: inviteGenerating || !inviteName.trim() || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {inviteGenerating ? (
                      <>
                        <Loader2 size={15} className="spin" />
                        {t.settings.sendingInvite}
                      </>
                    ) : (
                      <>
                        <Mail size={15} />
                        {t.settings.sendInvite}
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    flex: 1,
  },
  filters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'nowrap',
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
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
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
    fontSize: '14px',
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
    fontSize: '14px',
    color: 'var(--text-secondary)',
    display: 'flex',
    gap: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '18px',
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
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
  },
  clientName: {
    fontSize: '15px',
    fontWeight: 600,
  },
  clientEmail: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
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
    fontSize: '12px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  cardStats: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '12px',
    flex: 1,
    minWidth: 0,
  },
  cardStatItem: {
    textAlign: 'center' as const,
    flex: 1,
    minWidth: 0,
  },
  cardStatLabel: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    marginBottom: '2px',
    whiteSpace: 'nowrap' as const,
  },
  cardStatValue: {
    fontSize: '15px',
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
    fontSize: '12px',
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
    fontSize: '13px',
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
    fontSize: '13px',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    width: '420px',
    maxWidth: '90vw',
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
    fontSize: '18px',
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
    fontSize: '13px',
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
    fontSize: '14px',
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
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
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
  inviteOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  inviteModal: {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg, 16px)',
    padding: '24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
  },
  inviteModalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  inviteIconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(0, 229, 200, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inviteModalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  inviteModalSub: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: '2px 0 0',
  },
  inviteCloseBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  inviteDivider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '16px 0',
  },
  inviteField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inviteFieldLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  inviteFieldInput: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontFamily: 'var(--font-display)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inviteSendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
    transition: 'opacity 0.15s',
  },
  inviteLinkBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.02)',
    marginBottom: '4px',
  },
  inviteCopyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--accent-primary)',
    background: 'rgba(0,229,200,0.08)',
    color: 'var(--accent-primary)',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  inviteDoneBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 24px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#07090e',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    marginTop: '16px',
    boxShadow: '0 0 16px var(--accent-primary-dim)',
  },
  engagementRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 0',
    width: '100%',
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
};
