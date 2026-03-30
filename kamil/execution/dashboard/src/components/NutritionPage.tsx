import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, MoreHorizontal, Copy, Trash2, X, Users,
  UtensilsCrossed, Calendar, UserPlus, FileSpreadsheet,
} from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { useData } from '../contexts/DataProvider';
import type { NutritionPlan, NutritionPlanAssignment, Client } from '../types';

interface NutritionPageProps {
  onViewPlan: (id: string) => void;
  onAddPlan: () => void;
  onImportPlan: () => void;
}

export default function NutritionPage({ onViewPlan, onAddPlan, onImportPlan }: NutritionPageProps) {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const data = useData();
  const { nutritionPlans: plans, nutritionAssignments: assignments, clients } = data;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [assignModalPlanId, setAssignModalPlanId] = useState<string | null>(null);

  // Assign modal state
  const [assignClientId, setAssignClientId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const closeMenu = useCallback(() => setOpenMenuId(null), []);
  useEffect(() => {
    if (openMenuId) {
      document.addEventListener('click', closeMenu);
      return () => document.removeEventListener('click', closeMenu);
    }
  }, [openMenuId, closeMenu]);

  const filtered = plans.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' ||
      (filterType === 'template' && p.isTemplate) ||
      (filterType === 'assigned' && p.clientIds.length > 0);
    return matchesSearch && matchesType;
  });

  const totalMeals = (p: NutritionPlan) =>
    p.days.reduce((sum, d) => sum + d.meals.length, 0);

  const cardAccents = [
    { from: '0, 229, 200', to: '0, 196, 170' },
    { from: '99, 102, 241', to: '79, 70, 229' },
    { from: '249, 115, 22', to: '234, 88, 12' },
    { from: '168, 85, 247', to: '139, 92, 246' },
    { from: '236, 72, 153', to: '219, 39, 119' },
    { from: '59, 130, 246', to: '37, 99, 235' },
  ];

  const typeBadgeColor: Record<string, string> = {
    strict: 'rgba(236, 72, 153, 0.2)',
    flexible: 'rgba(0, 229, 200, 0.2)',
    guidelines: 'rgba(99, 102, 241, 0.2)',
  };

  const handleAssign = async () => {
    if (!assignModalPlanId || !assignClientId) return;
    const assignment: NutritionPlanAssignment = {
      id: crypto.randomUUID(),
      planId: assignModalPlanId,
      clientId: assignClientId,
      assignedAt: new Date().toISOString(),
      startDate: assignStartDate || null,
      endDate: assignEndDate || null,
      status: 'active',
      coachNotes: assignNotes,
    };
    try {
      await data.assignNutritionPlan(assignment);
    } finally {
      setAssignModalPlanId(null);
      setAssignClientId('');
      setAssignStartDate('');
      setAssignEndDate('');
      setAssignNotes('');
    }
  };

  const getAssignedClients = (planId: string): Client[] => {
    const clientIds = assignments.filter(a => a.planId === planId && a.status === 'active').map(a => a.clientId);
    return clients.filter(c => clientIds.includes(c.id));
  };

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px', gap: isMobile ? '14px' : '20px' }}>
      {/* Top Bar */}
      <div style={{ ...styles.topBar, flexWrap: isMobile ? 'wrap' : undefined }}>
        <div style={{ ...styles.searchBox, maxWidth: isMobile ? '100%' : '360px' }}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder={t.nutrition.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filter pills */}
          {(['all', 'template', 'assigned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              style={{
                ...styles.filterPill,
                background: filterType === f ? 'var(--accent-primary-dim)' : 'transparent',
                color: filterType === f ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderColor: filterType === f ? 'var(--accent-primary)' : 'var(--border-subtle)',
              }}
            >
              {f === 'all' ? 'All' : f === 'template' ? t.nutrition.template : t.nutrition.assigned}
            </button>
          ))}

          <motion.button
            onClick={onImportPlan}
            style={{ ...styles.addBtn, background: 'var(--surface-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileSpreadsheet size={16} />
            <span>{isMobile ? 'Import' : 'Import File'}</span>
          </motion.button>
          <motion.button
            onClick={onAddPlan}
            style={styles.addBtn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={16} />
            <span>{t.nutrition.newPlan}</span>
          </motion.button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={styles.emptyState}>
          <UtensilsCrossed size={48} color="var(--text-tertiary)" style={{ opacity: 0.4 }} />
          <h3 style={{ color: 'var(--text-primary)', margin: '16px 0 8px', fontSize: '18px' }}>
            {searchQuery ? 'No plans match your search' : t.nutrition.noPlanYet}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {searchQuery ? 'Try a different search term.' : t.nutrition.createFirst}
          </p>
          {!searchQuery && (
            <motion.button onClick={onAddPlan} style={{ ...styles.addBtn, marginTop: '16px' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus size={16} /> {t.nutrition.newPlan}
            </motion.button>
          )}
        </div>
      )}

      {/* Plan Cards Grid */}
      <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {filtered.map((plan, i) => {
          const accent = cardAccents[i % cardAccents.length];
          const assignedClients = getAssignedClients(plan.id);
          return (
            <GlassCard key={plan.id} delay={i * 0.04} hover style={{ padding: 0, overflow: 'visible', zIndex: openMenuId === plan.id ? 50 : 'auto', position: 'relative' }}>
              {/* Accent gradient bar */}
              <div style={{
                height: '3px',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                background: `linear-gradient(90deg, rgba(${accent.from}, 0.8), rgba(${accent.to}, 0.4), transparent)`,
              }} />

              <div style={{ padding: '16px 18px 18px', cursor: 'pointer' }} onClick={() => onViewPlan(plan.id)}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {plan.title || 'Untitled Plan'}
                    </h3>
                    {plan.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Action menu */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === plan.id ? null : plan.id); }}
                      style={styles.menuBtn}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    <AnimatePresence>
                      {openMenuId === plan.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          style={styles.dropdown}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button style={styles.dropItem} onClick={() => { onViewPlan(plan.id); setOpenMenuId(null); }}>
                            <UtensilsCrossed size={14} /> {t.nutrition.editPlan}
                          </button>
                          <button style={styles.dropItem} onClick={() => { data.duplicateNutritionPlan(plan.id); setOpenMenuId(null); }}>
                            <Copy size={14} /> {t.nutrition.duplicatePlan}
                          </button>
                          <button style={styles.dropItem} onClick={() => { setAssignModalPlanId(plan.id); setOpenMenuId(null); }}>
                            <UserPlus size={14} /> {t.nutrition.assignToClient}
                          </button>
                          <button style={{ ...styles.dropItem, color: '#ef4444' }} onClick={() => { setDeleteConfirm(plan.id); setOpenMenuId(null); }}>
                            <Trash2 size={14} /> {t.nutrition.deletePlan}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ ...styles.badge, background: typeBadgeColor[plan.type] || 'var(--surface-secondary)' }}>
                    {(t.nutrition as Record<string, unknown>)[plan.type] as string || plan.type}
                  </span>
                  {plan.isTemplate && (
                    <span style={{ ...styles.badge, background: 'rgba(59, 130, 246, 0.2)' }}>
                      {t.nutrition.template}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} /> {plan.days.length} {t.nutrition.days}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <UtensilsCrossed size={13} /> {totalMeals(plan)} {t.nutrition.meals}
                  </span>
                  {assignedClients.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={13} /> {assignedClients.length}
                    </span>
                  )}
                </div>

                {/* Assigned clients avatars */}
                {assignedClients.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {assignedClients.slice(0, 5).map(c => (
                      <span key={c.id} style={styles.clientChip} title={c.name}>
                        {c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    ))}
                    {assignedClients.length > 5 && (
                      <span style={{ ...styles.clientChip, background: 'var(--surface-tertiary)' }}>
                        +{assignedClients.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.overlay}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              style={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', margin: '0 0 8px' }}>{t.nutrition.deletePlan}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 20px' }}>{t.nutrition.deleteConfirm}</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>Cancel</button>
                <button
                  onClick={() => { data.deleteNutritionPlan(deleteConfirm); setDeleteConfirm(null); }}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign modal */}
      <AnimatePresence>
        {assignModalPlanId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.overlay}
            onClick={() => setAssignModalPlanId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              style={{ ...styles.modal, maxWidth: '440px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>{t.nutrition.assignModal}</h3>
                <button onClick={() => setAssignModalPlanId(null)} style={styles.menuBtn}><X size={16} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={styles.label}>
                  {t.nutrition.assignToClient}
                  <select
                    value={assignClientId}
                    onChange={e => setAssignClientId(e.target.value)}
                    style={styles.input}
                  >
                    <option value="">{t.nutrition.selectClient}</option>
                    {clients.filter(c => c.status === 'active').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <label style={{ ...styles.label, flex: 1 }}>
                    {t.nutrition.startDate}
                    <input type="date" value={assignStartDate} onChange={e => setAssignStartDate(e.target.value)} style={styles.input} />
                  </label>
                  <label style={{ ...styles.label, flex: 1 }}>
                    {t.nutrition.endDate}
                    <input type="date" value={assignEndDate} onChange={e => setAssignEndDate(e.target.value)} style={styles.input} />
                  </label>
                </div>

                <label style={styles.label}>
                  {t.nutrition.coachNotes}
                  <textarea
                    value={assignNotes}
                    onChange={e => setAssignNotes(e.target.value)}
                    style={{ ...styles.input, minHeight: '60px', resize: 'vertical' as const }}
                    rows={2}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button onClick={() => setAssignModalPlanId(null)} style={styles.cancelBtn}>Cancel</button>
                <motion.button
                  onClick={handleAssign}
                  disabled={!assignClientId}
                  style={{ ...styles.addBtn, opacity: assignClientId ? 1 : 0.5 }}
                  whileHover={assignClientId ? { scale: 1.02 } : {}}
                  whileTap={assignClientId ? { scale: 0.98 } : {}}
                >
                  <UserPlus size={14} /> {t.nutrition.assign}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    overflowY: 'auto' as const,
    maxHeight: '100%',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--surface-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    border: '1px solid var(--border-subtle)',
    flex: 1,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  },
  filterPill: {
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--accent-primary)',
    color: '#000',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  grid: {
    display: 'grid',
    gap: '16px',
  },
  menuBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    background: 'var(--surface-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '4px',
    zIndex: 100,
    minWidth: '180px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  dropItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '13px',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
  },
  badge: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  clientChip: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--accent-primary-dim)',
    color: 'var(--accent-primary)',
    fontSize: '10px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center' as const,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--surface-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    maxWidth: '380px',
    width: '90%',
    boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  input: {
    background: 'var(--surface-secondary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
};
