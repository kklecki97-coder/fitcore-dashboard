import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Search, Plus, Droplets, Moon, Pill, Footprints, Brain,
  StretchHorizontal, Beef, ChevronRight, Trash2, CheckCircle2, X, ChevronDown,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { useLang } from '../i18n';
import { useToast } from './Toast';
import useIsMobile from '../hooks/useIsMobile';
import { getInitials, getAvatarColor } from '../utils/formatting';
import type { Client, Habit, HabitAssignment, HabitLog } from '../types';

const iconMap: Record<string, typeof Heart> = {
  Droplets, Moon, Pill, Footprints, Brain, StretchHorizontal, Beef, Heart,
};

// Map preset habit IDs to i18n keys for translated names and hints
type PresetKey = 'waterIntake' | 'sleep' | 'supplements' | 'steps' | 'meditation' | 'stretching' | 'proteinIntake' | 'creatine' | 'omega3' | 'vitaminD' | 'magnesium' | 'wheyProtein';
const presetNameKeys: Record<string, PresetKey> = {
  'h-water': 'waterIntake', 'h-sleep': 'sleep', 'h-supplements': 'supplements',
  'h-steps': 'steps', 'h-meditation': 'meditation', 'h-stretching': 'stretching',
  'h-protein': 'proteinIntake', 'h-creatine': 'creatine', 'h-omega3': 'omega3',
  'h-vitamind': 'vitaminD', 'h-magnesium': 'magnesium', 'h-whey': 'wheyProtein',
};
// Individual supplement habit IDs + the generic "Supplements" parent
const SUPPLEMENT_IDS = new Set(['h-supplements', 'h-creatine', 'h-omega3', 'h-vitamind', 'h-magnesium', 'h-whey']);
const SUPPLEMENT_CHILDREN = new Set(['h-creatine', 'h-omega3', 'h-vitamind', 'h-magnesium', 'h-whey']);
const presetHintKeys: Record<string, string> = {
  'h-water': 'waterIntakeHint', 'h-sleep': 'sleepHint', 'h-supplements': 'supplementsHint',
  'h-steps': 'stepsHint', 'h-meditation': 'meditationHint', 'h-stretching': 'stretchingHint',
  'h-protein': 'proteinIntakeHint', 'h-creatine': 'creatineHint', 'h-omega3': 'omega3Hint',
  'h-vitamind': 'vitaminDHint', 'h-magnesium': 'magnesiumHint', 'h-whey': 'wheyProteinHint',
};

interface HabitsPageProps {
  clients: Client[];
  habits: Habit[];
  habitAssignments: HabitAssignment[];
  habitLogs: HabitLog[];
  onAddHabitAssignment: (assignment: HabitAssignment) => void;
  onRemoveHabitAssignment: (id: string) => void;
  onAddHabit: (habit: Habit) => void;
  onViewClient: (id: string) => void;
}

function getAdherence(clientId: string, assignments: HabitAssignment[], logs: HabitLog[], days: number): number {
  const clientAssignments = assignments.filter(a => a.clientId === clientId && a.isActive);
  if (clientAssignments.length === 0) return -1; // no habits assigned
  const today = new Date();
  let total = 0;
  let completed = 0;
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    for (const a of clientAssignments) {
      total++;
      const log = logs.find(l => l.habitAssignmentId === a.id && l.logDate === dateStr);
      if (log?.completed) completed++;
    }
  }
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function getStreak(assignmentId: string, logs: HabitLog[]): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const log = logs.find(l => l.habitAssignmentId === assignmentId && l.logDate === dateStr);
    if (log?.completed) streak++;
    else break;
  }
  return streak;
}

export default function HabitsPage({
  clients, habits, habitAssignments, habitLogs,
  onAddHabitAssignment, onRemoveHabitAssignment, onAddHabit, onViewClient,
}: HabitsPageProps) {
  const { t } = useLang();
  const { showToast } = useToast();
  const getHabitName = (habit: Habit) => {
    const key = presetNameKeys[habit.id];
    return key ? t.habits[key] : habit.name;
  };
  const getHabitHint = (habit: Habit) => {
    const key = presetHintKeys[habit.id];
    // @ts-ignore - dynamic key access for hint strings
    return key ? (t.habits[key] ?? '') : '';
  };
  const getHabitDesc = (habit: Habit, targetValue?: number | null) => {
    const hint = getHabitHint(habit);
    if (habit.type === 'checkbox') return hint || t.habits.checkbox;
    const target = targetValue ?? habit.defaultTarget;
    if (target != null && habit.unit) {
      return `${t.habits.goal(target, habit.unit)}${hint ? ` · ${hint}` : ''}`;
    }
    return hint || '';
  };
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignClientId, setAssignClientId] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<'checkbox' | 'number' | 'scale'>('checkbox');
  const [customTarget, setCustomTarget] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [assignTargetOverrides, setAssignTargetOverrides] = useState<Record<string, string>>({});
  const [suppsExpanded, setSuppsExpanded] = useState<Record<string, boolean>>({});

  // Filtered view
  const filteredClients = useMemo(() => {
    let list = selectedClient === 'all' ? clients.filter(c => c.status === 'active') : clients.filter(c => c.id === selectedClient);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const adhA = getAdherence(a.id, habitAssignments, habitLogs, 7);
      const adhB = getAdherence(b.id, habitAssignments, habitLogs, 7);
      return adhA - adhB; // worst adherence first
    });
  }, [clients, selectedClient, search, habitAssignments, habitLogs]);

  const handleAssignHabit = (clientId: string, habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const existing = habitAssignments.find(a => a.clientId === clientId && a.habitId === habitId && a.isActive);
    if (existing) return;
    const overrideStr = assignTargetOverrides[habitId];
    const overrideVal = overrideStr !== undefined && overrideStr !== '' ? parseFloat(overrideStr) : null;
    const targetValue = habit.type !== 'checkbox'
      ? (overrideVal !== null && !isNaN(overrideVal) ? overrideVal : habit.defaultTarget)
      : null;
    const assignment: HabitAssignment = {
      id: crypto.randomUUID(),
      coachId: 'coach1',
      clientId,
      habitId,
      targetValue,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    onAddHabitAssignment(assignment);
    setAssignTargetOverrides(prev => { const next = { ...prev }; delete next[habitId]; return next; });
    showToast(t.habits.habitAdded, 'success');
  };

  const handleCreateCustom = () => {
    if (!customName.trim()) return;
    const habit: Habit = {
      id: crypto.randomUUID(),
      coachId: 'coach1',
      name: customName.trim(),
      type: customType,
      defaultTarget: customType === 'checkbox' ? null : Number(customTarget) || null,
      unit: customType === 'checkbox' ? null : customUnit || null,
      icon: 'Heart',
      isPreset: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    onAddHabit(habit);
    showToast(t.habits.customHabitCreated, 'success');
    setShowCustomModal(false);
    setCustomName('');
    setCustomTarget('');
    setCustomUnit('');
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', maxWidth: 1200, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Heart size={28} style={{ color: 'var(--accent-primary)' }} />
            {t.habits.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 14 }}>{t.habits.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCustomModal(true)} style={btnSecondary}>
            <Plus size={16} /> {t.habits.addCustom}
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.habits.selectClient}
            style={inputStyle}
          />
        </div>
        <select
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
          style={selectStyle}
        >
          <option value="all">{t.habits.allClients}</option>
          {clients.filter(c => c.status === 'active').map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Client list with habits */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredClients.map((client, i) => {
          const clientAssignments = habitAssignments.filter(a => a.clientId === client.id && a.isActive);
          const adherence = getAdherence(client.id, habitAssignments, habitLogs, 7);

          return (
            <GlassCard key={client.id} delay={i * 0.04}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: clientAssignments.length > 0 ? 16 : 0, flexWrap: 'wrap', gap: 8 }}>
                {/* Client info */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => onViewClient(client.id)}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: getAvatarColor(client.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                  }}>
                    {getInitials(client.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{client.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {clientAssignments.length} {clientAssignments.length === 1 ? 'habit' : 'habits'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Adherence badge */}
                  {adherence >= 0 && (
                    <div style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      background: adherence >= 80 ? 'rgba(34,197,94,0.15)' : adherence >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: adherence >= 80 ? 'var(--accent-success)' : adherence >= 50 ? 'var(--accent-warm)' : 'var(--accent-danger)',
                    }}>
                      {adherence}%
                    </div>
                  )}

                  {/* Assign button */}
                  <button
                    onClick={() => { setAssignClientId(client.id); setAssignTargetOverrides({}); setShowAssignModal(true); }}
                    style={{ ...btnSecondary, padding: '6px 12px', fontSize: 13 }}
                  >
                    <Plus size={14} /> {t.habits.assignHabits}
                  </button>

                  <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }} onClick={() => onViewClient(client.id)} />
                </div>
              </div>

              {/* Habit rows */}
              {clientAssignments.length > 0 && (() => {
                const regularAssigns = clientAssignments.filter(a => !SUPPLEMENT_CHILDREN.has(a.habitId));
                const suppAssigns = clientAssignments.filter(a => SUPPLEMENT_CHILDREN.has(a.habitId));
                const isSuppsOpen = suppsExpanded[client.id] ?? false;

                const renderHabitRow = (assignment: typeof clientAssignments[0]) => {
                  const habit = habits.find(h => h.id === assignment.habitId);
                  if (!habit) return null;
                  const Icon = iconMap[habit.icon] || Heart;
                  const streak = getStreak(assignment.id, habitLogs);
                  const today = new Date();
                  const dots = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(today);
                    d.setDate(d.getDate() - (6 - i));
                    const dateStr = d.toISOString().split('T')[0];
                    const log = habitLogs.find(l => l.habitAssignmentId === assignment.id && l.logDate === dateStr);
                    return log?.completed ? 'completed' : log ? 'missed' : 'none';
                  });

                  return (
                    <div key={assignment.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--glass-border)',
                    }}>
                      <Icon size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{getHabitName(habit)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {getHabitDesc(habit, assignment.targetValue)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {dots.map((status, di) => (
                          <div key={di} style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: status === 'completed' ? 'var(--accent-success)' : status === 'missed' ? 'var(--accent-danger)' : 'rgba(255,255,255,0.08)',
                          }} />
                        ))}
                      </div>
                      {streak > 0 && (
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-warm)', whiteSpace: 'nowrap' }}>
                          🔥 {t.habits.streakDays(streak)}
                        </div>
                      )}
                      {confirmRemove === assignment.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { onRemoveHabitAssignment(assignment.id); setConfirmRemove(null); showToast(t.habits.habitRemoved, 'info'); }} style={{ ...btnDanger, padding: '4px 8px', fontSize: 12 }}>
                            <CheckCircle2 size={14} />
                          </button>
                          <button onClick={() => setConfirmRemove(null)} style={{ ...btnSecondary, padding: '4px 8px', fontSize: 12 }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemove(assignment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {regularAssigns.map(renderHabitRow)}

                    {/* Supplements expandable group */}
                    {suppAssigns.length > 0 && (
                      <div style={{
                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => setSuppsExpanded(prev => ({ ...prev, [client.id]: !isSuppsOpen }))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                            width: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
                            fontFamily: 'var(--font-display)',
                          }}
                        >
                          <Pill size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{t.habits.supplements}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{suppAssigns.length} {suppAssigns.length === 1 ? 'supplement' : 'supplements'}</div>
                          </div>
                          <motion.div animate={{ rotate: isSuppsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {isSuppsOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {suppAssigns.map(renderHabitRow)}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                );
              })()}

              {clientAssignments.length === 0 && (
                <div style={{ color: 'var(--text-tertiary)', fontSize: 13, fontStyle: 'italic' }}>
                  {t.habits.noHabitsAssigned}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* ── Assign Habit Modal ── */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAssignModal(false)}
            style={overlayStyle}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={modalStyle}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                {t.habits.assignHabits} — {clients.find(c => c.id === assignClientId)?.name}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 1, marginBottom: 4 }}>{t.habits.presetHabits}</div>
                {(() => {
                  const nonSuppPresets = habits.filter(h => h.isPreset && !SUPPLEMENT_IDS.has(h.id));
                  const suppHabits = habits.filter(h => h.isPreset && SUPPLEMENT_CHILDREN.has(h.id));
                  const assignedSuppCount = suppHabits.filter(h => habitAssignments.some(a => a.clientId === assignClientId && a.habitId === h.id && a.isActive)).length;

                  // Render order: Water, Sleep, then Supplements expandable, then Steps, Meditation, etc.
                  const renderPresetRow = (habit: typeof nonSuppPresets[0]) => {
                    const Icon = iconMap[habit.icon] || Heart;
                    const alreadyAssigned = habitAssignments.some(a => a.clientId === assignClientId && a.habitId === habit.id && a.isActive);
                    return (
                      <div key={habit.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)',
                        background: alreadyAssigned ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                        opacity: alreadyAssigned ? 0.5 : 1,
                      }}>
                        <Icon size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, color: alreadyAssigned ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: 14 }}>{getHabitName(habit)}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getHabitHint(habit)}</div>
                        </div>
                        {habit.type !== 'checkbox' && !alreadyAssigned && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <input type="number" value={assignTargetOverrides[habit.id] ?? ''}
                              onChange={e => setAssignTargetOverrides(prev => ({ ...prev, [habit.id]: e.target.value }))}
                              placeholder={String(habit.defaultTarget ?? '')}
                              style={{ width: 60, padding: '4px 6px', borderRadius: 6, textAlign: 'center', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none' }}
                            />
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 20 }}>{habit.unit}</span>
                          </div>
                        )}
                        {alreadyAssigned ? (
                          <CheckCircle2 size={16} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
                        ) : (
                          <button onClick={() => handleAssignHabit(assignClientId, habit.id)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: '#07090e', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer', flexShrink: 0 }}>
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    );
                  };

                  // Insert supplements expandable after index 1 (after Sleep)
                  const renderSuppGroup = () => suppHabits.length > 0 ? (
                    <div key="supp-group" style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      <button
                        onClick={() => setSuppsExpanded(prev => ({ ...prev, modal: !prev.modal }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-display)' }}
                      >
                        <Pill size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 14 }}>{t.habits.supplements}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.habits.supplementsHint} · {assignedSuppCount}/{suppHabits.length}</div>
                        </div>
                        <motion.div animate={{ rotate: suppsExpanded.modal ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {suppsExpanded.modal && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {suppHabits.map(habit => {
                                const alreadyAssigned = habitAssignments.some(a => a.clientId === assignClientId && a.habitId === habit.id && a.isActive);
                                return (
                                  <div key={habit.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                                    borderRadius: 6, background: alreadyAssigned ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--glass-border)', opacity: alreadyAssigned ? 0.5 : 1,
                                  }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 500, color: alreadyAssigned ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: 13 }}>{getHabitName(habit)}</div>
                                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{getHabitHint(habit)}</div>
                                    </div>
                                    {alreadyAssigned ? (
                                      <CheckCircle2 size={14} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
                                    ) : (
                                      <button onClick={() => handleAssignHabit(assignClientId, habit.id)}
                                        style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: '#07090e', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-display)', cursor: 'pointer', flexShrink: 0 }}>
                                        <Plus size={12} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : null;

                  // Build final list: first 2 presets, then supplements, then rest
                  const items: React.ReactNode[] = [];
                  nonSuppPresets.forEach((habit, idx) => {
                    items.push(renderPresetRow(habit));
                    if (idx === 1) items.push(renderSuppGroup()); // after Sleep (index 1)
                  });
                  // If fewer than 2 presets, append supp group at end
                  if (nonSuppPresets.length <= 1) items.push(renderSuppGroup());
                  return items;
                })()}

                {/* Custom habits */}
                {habits.filter(h => !h.isPreset).length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 1, marginTop: 12 }}>{t.habits.customHabits}</div>
                    {habits.filter(h => !h.isPreset).map(habit => {
                      const alreadyAssigned = habitAssignments.some(a => a.clientId === assignClientId && a.habitId === habit.id && a.isActive);
                      return (
                        <button
                          key={habit.id}
                          disabled={alreadyAssigned}
                          onClick={() => handleAssignHabit(assignClientId, habit.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)',
                            background: alreadyAssigned ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                            color: alreadyAssigned ? 'var(--text-tertiary)' : 'var(--text-primary)',
                            cursor: alreadyAssigned ? 'not-allowed' : 'pointer',
                            fontFamily: 'var(--font-display)', fontSize: 14, textAlign: 'left',
                            opacity: alreadyAssigned ? 0.5 : 1,
                          }}
                        >
                          <Heart size={18} style={{ color: 'var(--accent-primary)' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{getHabitName(habit)}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {getHabitDesc(habit)}
                            </div>
                          </div>
                          {alreadyAssigned && <CheckCircle2 size={16} style={{ color: 'var(--accent-success)' }} />}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => setShowAssignModal(false)} style={btnSecondary}>{t.habits.cancel}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Custom Habit Modal ── */}
      <AnimatePresence>
        {showCustomModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCustomModal(false)}
            style={overlayStyle}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={modalStyle}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                {t.habits.addCustom}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t.habits.habitName}</label>
                  <input value={customName} onChange={e => setCustomName(e.target.value)} style={formInputStyle} placeholder="e.g. Cold shower" />
                </div>
                <div>
                  <label style={labelStyle}>{t.habits.habitType}</label>
                  <select value={customType} onChange={e => setCustomType(e.target.value as 'checkbox' | 'number' | 'scale')} style={formInputStyle}>
                    <option value="checkbox">{t.habits.checkbox}</option>
                    <option value="number">{t.habits.number}</option>
                    <option value="scale">{t.habits.scale}</option>
                  </select>
                </div>
                {customType !== 'checkbox' && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>{t.habits.target}</label>
                      <input type="number" value={customTarget} onChange={e => setCustomTarget(e.target.value)} style={formInputStyle} placeholder="e.g. 10" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>{t.habits.unit}</label>
                      <input value={customUnit} onChange={e => setCustomUnit(e.target.value)} style={formInputStyle} placeholder="e.g. min, g, L" />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button onClick={() => setShowCustomModal(false)} style={btnSecondary}>{t.habits.cancel}</button>
                <button onClick={handleCreateCustom} style={btnPrimary} disabled={!customName.trim()}>{t.habits.save}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Styles ──

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-lg)', padding: 24, width: '100%', maxWidth: 480,
  boxShadow: 'var(--shadow-elevated)', maxHeight: '80vh', overflowY: 'auto',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px 10px 36px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)',
  color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-display)',
  outline: 'none', boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--glass-border)', background: 'var(--bg-card)',
  color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-display)',
  cursor: 'pointer', outline: 'none', minWidth: 160,
};

const formInputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)',
  color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-display)',
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
  marginBottom: 4, letterSpacing: 0.5,
};

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
  borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-primary)',
  color: '#07090e', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
  borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)',
  background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)',
  fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-display)', cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
  borderRadius: 'var(--radius-sm)', border: 'none', background: 'rgba(239,68,68,0.2)',
  color: 'var(--accent-danger)', fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-display)', cursor: 'pointer',
};
