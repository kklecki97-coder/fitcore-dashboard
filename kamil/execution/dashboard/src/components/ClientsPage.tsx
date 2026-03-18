import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, ArrowUpDown,
  Flame, Pause, Sparkles, MoreHorizontal,
  User, MessageSquare, Edit3, Play, Trash2, X, Save, Dumbbell, Star,
  Mail, Copy, Check, Link, Loader2, CheckCircle, UserPlus,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import type { Client, WorkoutProgram, CoachingPlan } from '../types';

interface ClientsPageProps {
  clients: Client[];
  programs: WorkoutProgram[];
  plans: CoachingPlan[];
  onViewClient: (id: string) => void;
  onNavigate?: (page: 'messages') => void;
  onUpdateClient: (id: string, updates: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientsPage({ clients: allClients, programs, plans, onViewClient, onNavigate, onUpdateClient, onDeleteClient }: ClientsPageProps) {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'status' | 'name' | 'newest' | 'plan'>('status');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Edit Plan modal state
  const [editModal, setEditModal] = useState<{ clientId: string; plan: Client['plan']; status: Client['status'] } | null>(null);
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePlan, setInvitePlan] = useState<'Basic' | 'Premium' | 'Elite'>('Basic');
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
    return matchesSearch && matchesPlan && matchesStatus;
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
    return colors[plan];
  };

  const statusLabel = (status: Client['status']) => {
    const map: Record<Client['status'], string> = {
      active: t.clients.active,
      paused: t.clients.paused,
      pending: t.clients.pending,
    };
    return map[status];
  };

  const planLabel = (plan: Client['plan']) => {
    const map: Record<Client['plan'], string> = {
      Basic: t.clients.basic,
      Premium: t.clients.premium,
      Elite: t.clients.elite,
    };
    return map[plan];
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

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px', gap: isMobile ? '14px' : '20px' }}>
      {/* Top Bar */}
      <div style={{ ...styles.topBar, flexWrap: isMobile ? 'wrap' : undefined }}>
        <div style={{ ...styles.searchBox, maxWidth: isMobile ? '100%' : '360px', order: isMobile ? -1 : undefined }}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder={t.clients.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={{ ...styles.filters, flex: isMobile ? '1 1 100%' : undefined }}>
          <div style={{ ...styles.filterGroup, flex: isMobile ? 1 : undefined }}>
            <Filter size={14} color="var(--text-tertiary)" />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              style={styles.select}
            >
              <option value="all">{t.clients.allPlans}</option>
              <option value="Elite">{t.clients.elite}</option>
              <option value="Premium">{t.clients.premium}</option>
              <option value="Basic">{t.clients.basic}</option>
            </select>
          </div>
          <div style={{ ...styles.filterGroup, flex: isMobile ? 1 : undefined }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.select}
            >
              <option value="all">{t.clients.allStatuses}</option>
              <option value="active">{t.clients.active}</option>
              <option value="paused">{t.clients.paused}</option>
              <option value="pending">{t.clients.pending}</option>
            </select>
          </div>
          <div style={{ ...styles.filterGroup, flex: isMobile ? 1 : undefined }}>
            <ArrowUpDown size={14} color="var(--text-tertiary)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={styles.select}
            >
              <option value="status">{t.clients.sortStatus}</option>
              <option value="name">{t.clients.sortName}</option>
              <option value="newest">{t.clients.sortNewest}</option>
              <option value="plan">{t.clients.sortPlan}</option>
            </select>
          </div>
        </div>

        <button onClick={() => setShowInviteModal(true)} style={{ ...styles.addBtn, ...(isMobile ? { flex: 1, justifyContent: 'center' } : {}) }}>
          <Plus size={16} />
          {t.clients.addClient}
        </button>
      </div>

      {/* Stats */}
      <div style={{ ...styles.miniStats, gap: isMobile ? '12px' : '24px', flexWrap: isMobile ? 'wrap' : undefined }}>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--accent-success)' }}>
            {allClients.filter(c => c.status === 'active').length}
          </span> {t.clients.active}
        </div>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--accent-warm)' }}>
            {allClients.filter(c => c.status === 'paused').length}
          </span> {t.clients.paused}
        </div>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--accent-secondary)' }}>
            {allClients.filter(c => c.status === 'pending').length}
          </span> {t.clients.pending}
        </div>
        <div style={styles.miniStat}>
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
            >
              <div style={styles.cardTop}>
                <div style={styles.clientInfo}>
                  <div className="avatar-tooltip-wrap" style={styles.avatarWrap}>
                    <div style={{ ...styles.avatar, background: getAvatarColor(client.id) }}>
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
                    <div style={styles.clientName}>{client.name}</div>
                    <div style={styles.clientEmail}>{client.email}</div>
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
                    <MoreHorizontal size={16} color="var(--text-tertiary)" />
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

              <div style={styles.cardMeta}>
                <span style={{ ...styles.planBadge, color: badge.color, background: badge.bg }}>
                  {planLabel(client.plan)}
                </span>
                <span style={styles.statusBadge}>
                  {statusIcon(client.status)}
                  <span style={{ textTransform: 'capitalize' }}>{statusLabel(client.status)}</span>
                </span>
                {programs.filter(p => p.clientIds.includes(client.id)).map(p => (
                  <span key={p.id} style={styles.programBadge}>
                    <Dumbbell size={10} />
                    {p.name}
                  </span>
                ))}
              </div>

              <div style={styles.cardStats}>
                <div style={styles.cardStatItem}>
                  <div style={styles.cardStatLabel}>{t.clients.progress}</div>
                  <div style={styles.cardStatValue}>{client.progress}%</div>
                </div>
                <div style={styles.cardStatItem}>
                  <div style={styles.cardStatLabel}>{t.clients.rate}</div>
                  <div style={styles.cardStatValue}>${client.monthlyRate}</div>
                </div>
                <div style={styles.cardStatItem}>
                  <div style={styles.cardStatLabel}>{t.clients.streak}</div>
                  <div style={styles.cardStatValue}>
                    {client.streak > 0 ? `${client.streak}d` : '\u2014'}
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
                <span style={styles.footerText}>Next check-in: {client.nextCheckIn}</span>
                <span style={styles.footerText}>{client.lastActive}</span>
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
                <button style={styles.closeBtn} onClick={() => setEditModal(null)}>
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
                              <div style={{ fontSize: '14px', opacity: 0.7 }}>${p.price}{cycleSuffix}</div>
                            </button>
                          );
                        })
                      : (['Basic', 'Premium', 'Elite'] as const).map(p => {
                          const isActive = editModal.plan === p;
                          const rateMap = { Basic: 99, Premium: 199, Elite: 299 };
                          return (
                            <button
                              key={p}
                              onClick={() => setEditModal({ ...editModal, plan: p })}
                              style={{
                                ...styles.modalPlanOption,
                                ...(isActive ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', background: 'var(--bg-subtle)' } : {}),
                              }}
                            >
                              <div style={{ fontWeight: 600, fontSize: '16px' }}>{p}</div>
                              <div style={{ fontSize: '14px', opacity: 0.7 }}>${rateMap[p]}/mo</div>
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>

                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>{t.clients.status}</span>
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
                          {statusLabel(s)}
                        </button>
                      );
                    })}
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
                <p style={{ fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
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
                      {(plans.filter(p => p.isActive).length > 0
                        ? plans.filter(p => p.isActive).map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setInvitePlan(p.name as typeof invitePlan)}
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
                              {p.name}
                            </button>
                          ))
                        : (['Basic', 'Premium', 'Elite'] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => setInvitePlan(p)}
                              style={{
                                flex: 1,
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: `1.5px solid ${invitePlan === p ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                                background: invitePlan === p ? 'rgba(0,229,200,0.08)' : 'transparent',
                                color: invitePlan === p ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontSize: '13px',
                                fontWeight: 600,
                                fontFamily: 'var(--font-display)',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              {p}
                            </button>
                          ))
                      )}
                    </div>
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
  cardStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
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
};
