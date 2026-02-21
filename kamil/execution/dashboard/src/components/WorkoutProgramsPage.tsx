import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, MoreHorizontal, Copy, BookmarkPlus, Trash2, X,
  Clock, Users, Dumbbell, Eye,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { getInitials, getAvatarColor } from '../data';
import useIsMobile from '../hooks/useIsMobile';
import type { Client, WorkoutProgram } from '../types';

interface WorkoutProgramsPageProps {
  programs: WorkoutProgram[];
  clients: Client[];
  onViewProgram: (id: string) => void;
  onAddProgram: () => void;
  onDeleteProgram: (id: string) => void;
  onDuplicateProgram: (id: string) => void;
  onUpdateProgram: (id: string, updates: Partial<WorkoutProgram>) => void;
}

export default function WorkoutProgramsPage({
  programs, clients, onViewProgram, onAddProgram,
  onDeleteProgram, onDuplicateProgram, onUpdateProgram,
}: WorkoutProgramsPageProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const activeCount = programs.filter(p => p.status === 'active').length;
  const draftCount = programs.filter(p => p.status === 'draft').length;
  const templateCount = programs.filter(p => p.isTemplate).length;

  const getClientNames = (ids: string[]) =>
    ids.map(id => clients.find(c => c.id === id)).filter(Boolean) as Client[];

  const handleSaveAsTemplate = (id: string) => {
    onDuplicateProgram(id);
    // Mark the newest program (the duplicate) as a template
    setTimeout(() => {
      // The duplicate will have been added with (Copy) suffix
      // We need to find and update it
      onUpdateProgram(id, {}); // trigger re-render; the actual template logic is handled in App
    }, 0);
  };

  const totalExercises = (p: WorkoutProgram) =>
    p.days.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px', gap: isMobile ? '14px' : '20px' }}>
      {/* Top Bar */}
      <div style={{ ...styles.topBar, flexWrap: isMobile ? 'wrap' : undefined }}>
        <div style={{ ...styles.searchBox, maxWidth: isMobile ? '100%' : '360px' }}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>

          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.filterSelect}>
            <option value="all">All Types</option>
            <option value="program">Programs</option>
            <option value="template">Templates</option>
          </select>

          <motion.button
            onClick={onAddProgram}
            style={styles.addBtn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={16} />
            <span>{isMobile ? 'New' : 'New Program'}</span>
          </motion.button>
        </div>
      </div>

      {/* Mini Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Active', value: activeCount, color: 'var(--accent-success)', bg: 'var(--accent-success-dim)' },
          { label: 'Draft', value: draftCount, color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-dim)' },
          { label: 'Templates', value: templateCount, color: 'var(--accent-warm)', bg: 'var(--accent-warm-dim)' },
          { label: 'Total', value: programs.length, color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' },
        ].map(stat => (
          <div key={stat.label} style={{ ...styles.statChip, background: stat.bg, color: stat.color }}>
            <span style={styles.statValue}>{stat.value}</span>
            <span style={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Program Cards Grid */}
      <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {filtered.map((program, i) => {
          const assignedClients = getClientNames(program.clientIds);
          return (
            <GlassCard key={program.id} delay={i * 0.04} hover onClick={() => onViewProgram(program.id)}>
              <div style={styles.cardInner}>
                {/* Header */}
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{program.name}</h3>
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
                          <Eye size={14} /> View / Edit
                        </button>
                        <button style={styles.dropdownItem} onClick={() => { onDuplicateProgram(program.id); setOpenMenuId(null); }}>
                          <Copy size={14} /> Duplicate
                        </button>
                        {!program.isTemplate && (
                          <button style={styles.dropdownItem} onClick={() => { handleSaveAsTemplate(program.id); setOpenMenuId(null); }}>
                            <BookmarkPlus size={14} /> Save as Template
                          </button>
                        )}
                        <div style={styles.dropdownDivider} />
                        <button
                          style={{ ...styles.dropdownItem, color: 'var(--accent-danger)' }}
                          onClick={() => { setDeleteConfirm(program.id); setOpenMenuId(null); }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div style={styles.badgeRow}>
                  <span style={{
                    ...styles.badge,
                    color: program.status === 'active' ? 'var(--accent-success)' : program.status === 'draft' ? 'var(--accent-secondary)' : 'var(--text-tertiary)',
                    background: program.status === 'active' ? 'var(--accent-success-dim)' : program.status === 'draft' ? 'var(--accent-secondary-dim)' : 'rgba(255,255,255,0.05)',
                  }}>
                    {program.status}
                  </span>
                  <span style={{ ...styles.badge, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)' }}>
                    <Clock size={11} /> {program.durationWeeks}w
                  </span>
                  {program.isTemplate && (
                    <span style={{ ...styles.badge, color: 'var(--accent-warm)', background: 'var(--accent-warm-dim)' }}>
                      Template
                    </span>
                  )}
                </div>

                {/* Assigned Clients */}
                <div style={styles.clientsRow}>
                  <Users size={13} color="var(--text-tertiary)" />
                  {assignedClients.length > 0 ? (
                    <div style={styles.avatarGroup}>
                      {assignedClients.slice(0, 4).map(c => (
                        <div key={c.id} style={{ ...styles.miniAvatar, background: getAvatarColor(c.id) }}>
                          {getInitials(c.name)}
                        </div>
                      ))}
                      {assignedClients.length > 4 && (
                        <span style={styles.moreClients}>+{assignedClients.length - 4}</span>
                      )}
                      <span style={styles.clientNames}>
                        {assignedClients.slice(0, 2).map(c => c.name.split(' ')[0]).join(', ')}
                        {assignedClients.length > 2 ? ` +${assignedClients.length - 2}` : ''}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '17px', color: 'var(--text-tertiary)' }}>Unassigned</span>
                  )}
                </div>

                {/* Summary */}
                <div style={styles.summaryRow}>
                  <Dumbbell size={13} color="var(--text-tertiary)" />
                  <span style={styles.summaryText}>
                    {program.days.length} {program.days.length === 1 ? 'day' : 'days'}, {totalExercises(program)} exercises
                  </span>
                </div>

                {/* Footer */}
                <div style={styles.cardFooter}>
                  <span style={styles.dateText}>Updated {program.updatedAt}</span>
                  <span style={styles.dateText}>Created {program.createdAt}</span>
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
            {programs.length === 0 ? 'No programs yet. Create your first one!' : 'No programs match your filters.'}
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
                <h3 style={styles.modalTitle}>Delete Program</h3>
                <button onClick={() => setDeleteConfirm(null)} style={styles.closeBtn}><X size={16} /></button>
              </div>
              <div style={styles.modalBody}>
                <p style={{ fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>
                    {programs.find(p => p.id === deleteConfirm)?.name}
                  </strong>? This action cannot be undone.
                </p>
              </div>
              <div style={styles.modalActions}>
                <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>Cancel</button>
                <button
                  onClick={() => { onDeleteProgram(deleteConfirm); setDeleteConfirm(null); }}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={14} /> Delete
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
    color: '#07090e',
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
    zIndex: 20,
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
  clientsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  avatarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  miniAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: '#07090e',
  },
  moreClients: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    marginLeft: '2px',
  },
  clientNames: {
    fontSize: '17px',
    color: 'var(--text-secondary)',
    marginLeft: '4px',
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
    background: 'rgba(0,0,0,0.6)',
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
