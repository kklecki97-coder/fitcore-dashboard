import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, MoreHorizontal, Copy, Trash2, X,
  Clock, Dumbbell, Eye, ChevronDown,
} from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { WorkoutProgram } from '../types';

interface WorkoutProgramsPageProps {
  programs: WorkoutProgram[];
  onViewProgram: (id: string) => void;
  onAddProgram: () => void;
  onDeleteProgram: (id: string) => void;
  onDuplicateProgram: (id: string) => void;
  onUpdateProgram: (id: string, updates: Partial<WorkoutProgram>) => void;
}

export default function WorkoutProgramsPage({
  programs, onViewProgram, onAddProgram,
  onDeleteProgram, onDuplicateProgram, onUpdateProgram,
}: WorkoutProgramsPageProps) {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, _setFilterStatus] = useState<string>('all');
  const [filterType, _setFilterType] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const closeMenu = useCallback(() => setOpenMenuId(null), []);
  useEffect(() => {
    if (openMenuId) {
      document.addEventListener('click', closeMenu);
      return () => document.removeEventListener('click', closeMenu);
    }
  }, [openMenuId, closeMenu]);

  const filtered = programs.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesType = filterType === 'all' ||
      (filterType === 'template' && p.isTemplate) ||
      (filterType === 'program' && !p.isTemplate);
    return matchesSearch && matchesStatus && matchesType;
  });

  // Prepared for status filter badges in the UI
  void (programs.filter(p => p.status === 'active').length);
  void (programs.filter(p => p.status === 'draft').length);
  void (programs.filter(p => p.isTemplate).length);

  // Prepared for template save feature — void to suppress unused lint until UI is wired
  void function handleSaveAsTemplate(id: string) {
    onDuplicateProgram(id);
    setTimeout(() => {
      const source = programs.find(p => p.id === id);
      if (!source) return;
      const copy = [...programs].reverse().find(p => p.name === `${source.name} (Copy)`);
      if (copy) {
        onUpdateProgram(copy.id, { isTemplate: true, name: `${source.name} (Template)` });
      }
    }, 0);
  };

  const totalExercises = (p: WorkoutProgram) =>
    p.days.reduce((sum, d) => sum + d.exercises.length, 0);

  const cardAccents = [
    { from: '0, 229, 200', to: '0, 196, 170' },   // teal (brand)
    { from: '99, 102, 241', to: '79, 70, 229' },   // indigo
    { from: '249, 115, 22', to: '234, 88, 12' },   // orange
    { from: '168, 85, 247', to: '139, 92, 246' },   // purple
    { from: '236, 72, 153', to: '219, 39, 119' },   // pink
    { from: '59, 130, 246', to: '37, 99, 235' },    // blue
  ];

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px', gap: isMobile ? '14px' : '20px' }}>
      {/* Top Bar */}
      <div style={{ ...styles.topBar, flexWrap: isMobile ? 'wrap' : undefined }}>
        <div style={{ ...styles.searchBox, maxWidth: isMobile ? '100%' : '360px' }}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder={t.programs.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <motion.button
            onClick={onAddProgram}
            style={styles.addBtn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={16} />
            <span>{isMobile ? t.programs.new : t.programs.newProgram}</span>
          </motion.button>
        </div>
      </div>

      {/* Program Cards Grid */}
      <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {filtered.map((program, i) => {
          const isExpanded = expandedId === program.id;
          const accent = cardAccents[i % cardAccents.length];
          return (
            <GlassCard key={program.id} delay={i * 0.04} hover style={{ padding: 0, overflow: 'visible', zIndex: openMenuId === program.id ? 50 : 'auto', position: 'relative' }}>
              {/* Accent gradient bar */}
              <div style={{
                height: '3px',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                background: `linear-gradient(90deg, rgba(${accent.from}, 0.8), rgba(${accent.to}, 0.4), transparent)`,
              }} />
              <div style={{ ...styles.cardInner, padding: '20px 24px' }}>
                {/* Header */}
                <div style={styles.cardHeader}>
                  <h3 style={{ ...styles.cardTitle, cursor: 'pointer' }} onClick={() => onViewProgram(program.id)}>{program.name}</h3>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : program.id); }}
                      style={{ ...styles.menuBtn, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                      title={t.programBuilder.showExercises}
                    >
                      <ChevronDown size={16} />
                    </button>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === program.id ? null : program.id); }}
                        style={styles.menuBtn}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuId === program.id && (
                        <div className="dropdown-menu" style={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                          <button style={styles.dropdownItem} onClick={() => { onViewProgram(program.id); setOpenMenuId(null); }}>
                            <Eye size={14} /> {t.programs.viewEdit}
                          </button>
                          <button style={styles.dropdownItem} onClick={() => { onDuplicateProgram(program.id); setOpenMenuId(null); }}>
                            <Copy size={14} /> {t.programs.duplicate}
                          </button>
                          <div style={styles.dropdownDivider} />
                          <button
                            style={{ ...styles.dropdownItem, color: 'var(--accent-danger)' }}
                            onClick={() => { setDeleteConfirm(program.id); setOpenMenuId(null); }}
                          >
                            <Trash2 size={14} /> {t.programs.delete}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div style={styles.badgeRow}>
                  <span style={{ ...styles.badge, color: `rgb(${accent.from})`, background: `rgba(${accent.from}, 0.1)`, border: `1px solid rgba(${accent.from}, 0.15)` }}>
                    <Clock size={11} /> {t.programs.weeks(program.durationWeeks)}
                  </span>
                  <span style={{ ...styles.badge, color: `rgb(${accent.from})`, background: `rgba(${accent.from}, 0.1)`, border: `1px solid rgba(${accent.from}, 0.15)` }}>
                    <Dumbbell size={11} /> {t.programs.days(program.days.length)}, {t.programs.exercises(totalExercises(program))}
                  </span>
                </div>

                {/* Expandable Exercise Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ borderTop: '1px solid var(--glass-border)', padding: '12px 0 4px' }}>
                        {program.days.map(day => (
                          <div key={day.id} style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
                              {day.name}
                            </div>
                            {day.exercises.length > 0 ? day.exercises.map((ex, ei) => (
                              <div key={ex.id} style={{ display: 'flex', gap: '6px', alignItems: 'baseline', padding: '2px 0', fontSize: '13px' }}>
                                <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', minWidth: '18px' }}>{ei + 1}.</span>
                                <span style={{ color: 'var(--text-primary)' }}>{ex.name}</span>
                                <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{ex.sets}×{ex.reps}</span>
                              </div>
                            )) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{t.programBuilder.noExercises}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer */}
                <div style={styles.cardFooter}>
                  <span style={styles.dateText}>{t.programs.created} {program.createdAt}</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={styles.empty}>
          <Dumbbell size={40} color="var(--text-tertiary)" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>
            {programs.length === 0 ? t.programs.noProgramsYet : t.programs.noProgramsMatch}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              style={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              style={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{t.programs.deleteProgram}</h3>
                <button onClick={() => setDeleteConfirm(null)} style={styles.closeBtn}><X size={16} /></button>
              </div>
              <div style={styles.modalBody}>
                <p style={{ fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t.programs.deleteConfirm(programs.find(p => p.id === deleteConfirm)?.name ?? '')}
                  {' '}{t.programs.cannotBeUndone}
                </p>
              </div>
              <div style={styles.modalActions}>
                <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>{t.programs.cancel}</button>
                <button
                  onClick={() => { onDeleteProgram(deleteConfirm); setDeleteConfirm(null); }}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={14} /> {t.programs.delete}
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
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    flex: 1,
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
  filterSelect: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    outline: 'none',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 12px var(--accent-primary-dim)',
  },
  statsRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  statChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '17px',
    fontWeight: 600,
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
  },
  statLabel: {
    fontWeight: 500,
  },
  grid: {
    display: 'grid',
    gap: '16px',
    alignItems: 'start',
  },
  cardInner: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '21px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  menuBtn: {
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
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    minWidth: '180px',
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--shadow-elevated)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  dropdownDivider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '4px 8px',
  },
  badgeRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '15px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    textTransform: 'capitalize',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  summaryText: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: '8px',
    borderTop: '1px solid var(--glass-border)',
  },
  dateText: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  // Modal styles
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
    width: '90vw',
    maxWidth: '440px',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    zIndex: 101,
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
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '16px 24px',
    borderTop: '1px solid var(--glass-border)',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent-danger)',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
};
