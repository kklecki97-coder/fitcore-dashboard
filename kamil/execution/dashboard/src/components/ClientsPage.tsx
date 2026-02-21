import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, ArrowUpDown,
  Flame, Pause, Sparkles, MoreHorizontal,
  User, MessageSquare, Edit3, Play, Trash2, X, Save, Dumbbell,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, WorkoutProgram } from '../types';

interface ClientsPageProps {
  clients: Client[];
  programs: WorkoutProgram[];
  onViewClient: (id: string) => void;
  onAddClient: () => void;
  onNavigate?: (page: 'messages') => void;
  onUpdateClient: (id: string, updates: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientsPage({ clients: allClients, programs, onViewClient, onAddClient, onNavigate, onUpdateClient, onDeleteClient }: ClientsPageProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Edit Plan modal state
  const [editModal, setEditModal] = useState<{ clientId: string; plan: Client['plan']; status: Client['status'] } | null>(null);
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
      Basic: { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' },
    };
    return colors[plan];
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
            placeholder="Search clients..."
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
              <option value="all">All Plans</option>
              <option value="Elite">Elite</option>
              <option value="Premium">Premium</option>
              <option value="Basic">Basic</option>
            </select>
          </div>
          <div style={{ ...styles.filterGroup, flex: isMobile ? 1 : undefined }}>
            <ArrowUpDown size={14} color="var(--text-tertiary)" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <button onClick={onAddClient} style={{ ...styles.addBtn, ...(isMobile ? { width: '100%', justifyContent: 'center' } : {}) }}>
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div style={{ ...styles.miniStats, gap: isMobile ? '12px' : '24px', flexWrap: isMobile ? 'wrap' : undefined }}>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--accent-success)' }}>
            {allClients.filter(c => c.status === 'active').length}
          </span> Active
        </div>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--accent-warm)' }}>
            {allClients.filter(c => c.status === 'paused').length}
          </span> Paused
        </div>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--accent-secondary)' }}>
            {allClients.filter(c => c.status === 'pending').length}
          </span> Pending
        </div>
        <div style={styles.miniStat}>
          <span style={{ color: 'var(--text-primary)' }}>
            {allClients.length}
          </span> Total
        </div>
      </div>

      {/* Client Cards Grid */}
      <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {filtered.map((client, i) => {
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
                    {client.notes && (
                      <div className="avatar-tooltip" style={styles.tooltip}>
                        <div style={styles.tooltipLabel}>Coach Notes</div>
                        {client.notes}
                      </div>
                    )}
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

              <div style={styles.cardMeta}>
                <span style={{ ...styles.planBadge, color: badge.color, background: badge.bg }}>
                  {client.plan}
                </span>
                <span style={styles.statusBadge}>
                  {statusIcon(client.status)}
                  <span style={{ textTransform: 'capitalize' }}>{client.status}</span>
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
                  <div style={styles.cardStatLabel}>Progress</div>
                  <div style={styles.cardStatValue}>{client.progress}%</div>
                </div>
                <div style={styles.cardStatItem}>
                  <div style={styles.cardStatLabel}>Rate</div>
                  <div style={styles.cardStatValue}>${client.monthlyRate}</div>
                </div>
                <div style={styles.cardStatItem}>
                  <div style={styles.cardStatLabel}>Streak</div>
                  <div style={styles.cardStatValue}>
                    {client.streak > 0 ? `${client.streak}d` : '—'}
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
                            ...(isActive ? { borderColor: accentMap[p], color: accentMap[p], background: 'rgba(255,255,255,0.04)' } : {}),
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
                            ...(isActive ? { borderColor: colorMap[s], color: colorMap[s], background: 'rgba(255,255,255,0.04)' } : {}),
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
                <p style={{ fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
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
    color: '#07090e',
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
    color: '#07090e',
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
    background: 'rgba(255,255,255,0.06)',
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
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
    background: 'rgba(0,0,0,0.6)',
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
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
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
    color: '#07090e',
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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '120px',
  },
};
