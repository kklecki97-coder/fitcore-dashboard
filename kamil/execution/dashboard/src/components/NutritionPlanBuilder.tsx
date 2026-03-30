import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, Plus, Trash2, X, ChevronUp, ChevronDown,
} from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { useToast } from './Toast';
import type { NutritionPlan, NutritionPlanDay, NutritionMeal, MealType, Client } from '../types';

interface NutritionPlanBuilderProps {
  plan: NutritionPlan | null;
  clients: Client[];
  onSave: (plan: NutritionPlan) => void;
  onBack: () => void;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout'];

const emptyMeal = (type: MealType = 'breakfast'): NutritionMeal => ({
  id: crypto.randomUUID(),
  mealType: type,
  title: '',
  description: '',
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  sortOrder: 0,
});

const emptyDay = (label: string): NutritionPlanDay => ({
  id: crypto.randomUUID(),
  dayLabel: label,
  sortOrder: 0,
  notes: '',
  meals: [emptyMeal('breakfast')],
});

function computeDayMacros(day: NutritionPlanDay) {
  return day.meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories ?? 0),
    protein: acc.protein + (m.proteinG ?? 0),
    carbs: acc.carbs + (m.carbsG ?? 0),
    fat: acc.fat + (m.fatG ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export default function NutritionPlanBuilder({ plan, onSave, onBack }: NutritionPlanBuilderProps) {
  const { t } = useLang();
  const { showToast } = useToast();
  const isMobile = useIsMobile();

  const [draft, setDraft] = useState<NutritionPlan>(() => {
    if (plan) return JSON.parse(JSON.stringify(plan));
    return {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      type: 'flexible' as const,
      isTemplate: false,
      clientIds: [],
      days: [emptyDay(t.nutrition.dayLabels[0])],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
  });

  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [renamingDayIdx, setRenamingDayIdx] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const activeDay = draft.days[activeDayIdx] || null;

  // ── Plan metadata handlers ──
  const markDirty = () => { if (!isDirty) setIsDirty(true); };
  const updateMeta = (key: keyof NutritionPlan, value: unknown) => {
    setDraft(prev => ({ ...prev, [key]: value, updatedAt: new Date().toISOString().split('T')[0] }));
    markDirty();
  };

  // ── Day handlers ──
  const addDay = () => {
    const nextLabel = t.nutrition.dayLabels[draft.days.length] || `Day ${draft.days.length + 1}`;
    const newDay = emptyDay(nextLabel);
    setDraft(prev => {
      setActiveDayIdx(prev.days.length); // index of newly added day
      return { ...prev, days: [...prev.days, newDay] };
    });
  };

  const removeDay = (idx: number) => {
    setDraft(prev => {
      if (prev.days.length <= 1) return prev;
      const next = prev.days.filter((_, i) => i !== idx);
      setActiveDayIdx(ai => Math.min(ai, next.length - 1));
      return { ...prev, days: next };
    });
  };

  const updateDay = (idx: number, updates: Partial<NutritionPlanDay>) => {
    setDraft(prev => ({
      ...prev,
      days: prev.days.map((d, i) => i === idx ? { ...d, ...updates } : d),
    }));
    markDirty();
  };

  const startRename = (idx: number) => {
    setRenamingDayIdx(idx);
    setRenameValue(draft.days[idx].dayLabel);
  };

  const finishRename = () => {
    if (renamingDayIdx !== null && renameValue.trim()) {
      updateDay(renamingDayIdx, { dayLabel: renameValue.trim() });
    }
    setRenamingDayIdx(null);
  };

  // ── Meal handlers ──
  const addMeal = () => {
    if (!activeDay) return;
    const lastType = activeDay.meals.length > 0 ? activeDay.meals[activeDay.meals.length - 1].mealType : 'breakfast';
    const nextTypeIdx = Math.min(MEAL_TYPES.indexOf(lastType) + 1, MEAL_TYPES.length - 1);
    const newMeal = emptyMeal(MEAL_TYPES[nextTypeIdx]);
    updateDay(activeDayIdx, { meals: [...activeDay.meals, newMeal] });
  };

  const removeMeal = (mealIdx: number) => {
    if (!activeDay) return;
    updateDay(activeDayIdx, { meals: activeDay.meals.filter((_, i) => i !== mealIdx) });
  };

  const updateMeal = (mealIdx: number, updates: Partial<NutritionMeal>) => {
    if (!activeDay) return;
    updateDay(activeDayIdx, {
      meals: activeDay.meals.map((m, i) => i === mealIdx ? { ...m, ...updates } : m),
    });
  };

  const moveMeal = (mealIdx: number, dir: -1 | 1) => {
    if (!activeDay) return;
    const target = mealIdx + dir;
    if (target < 0 || target >= activeDay.meals.length) return;
    const meals = [...activeDay.meals];
    [meals[mealIdx], meals[target]] = [meals[target], meals[mealIdx]];
    updateDay(activeDayIdx, { meals });
  };

  // ── Save ──
  const handleSave = () => {
    if (!draft.title.trim()) {
      showToast('Please enter a plan title.', 'error');
      return;
    }
    // Normalize sortOrder from array indices before saving
    const normalized: NutritionPlan = {
      ...draft,
      days: draft.days.map((day, di) => ({
        ...day,
        sortOrder: di,
        meals: day.meals.map((meal, mi) => ({ ...meal, sortOrder: mi })),
      })),
    };
    onSave(normalized);
  };

  const macros = activeDay ? computeDayMacros(activeDay) : null;
  const hasMacros = macros && (macros.calories > 0 || macros.protein > 0 || macros.carbs > 0 || macros.fat > 0);

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <motion.button onClick={() => isDirty ? setShowLeaveConfirm(true) : onBack()} style={styles.backBtn} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
          <ArrowLeft size={18} /> {t.nutrition.back}
        </motion.button>
        <motion.button onClick={handleSave} style={styles.saveBtn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Save size={16} /> {t.nutrition.save}
        </motion.button>
      </div>

      {/* Plan metadata */}
      <GlassCard delay={0.05} style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={draft.title}
            onChange={e => updateMeta('title', e.target.value)}
            placeholder={t.nutrition.planTitle}
            style={{ ...styles.input, fontSize: '18px', fontWeight: 600, padding: '10px 14px' }}
          />
          <textarea
            value={draft.description}
            onChange={e => updateMeta('description', e.target.value)}
            placeholder={t.nutrition.planDescription}
            style={{ ...styles.input, minHeight: '50px', resize: 'vertical' as const }}
            rows={2}
          />
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={styles.inlineLabel}>
              {t.nutrition.planType}
              <select
                value={draft.type}
                onChange={e => updateMeta('type', e.target.value)}
                style={{ ...styles.input, width: 'auto', minWidth: '120px' }}
              >
                <option value="strict">{t.nutrition.strict}</option>
                <option value="flexible">{t.nutrition.flexible}</option>
                <option value="guidelines">{t.nutrition.guidelines}</option>
              </select>
            </label>

            <label style={{ ...styles.inlineLabel, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={draft.isTemplate}
                onChange={e => updateMeta('isTemplate', e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              {t.nutrition.templateToggle}
            </label>
          </div>
        </div>
      </GlassCard>

      {/* Day tabs */}
      <div style={styles.dayTabsWrap}>
        <div style={styles.dayTabs}>
          {draft.days.map((day, idx) => (
            <div key={day.id} style={{ position: 'relative', display: 'flex' }}>
              {renamingDayIdx === idx ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenamingDayIdx(null); }}
                  style={{ ...styles.dayTab, width: '100px', textAlign: 'center' as const }}
                />
              ) : (
                <button
                  onClick={() => setActiveDayIdx(idx)}
                  onDoubleClick={() => startRename(idx)}
                  style={{
                    ...styles.dayTab,
                    background: activeDayIdx === idx ? 'var(--accent-primary)' : 'var(--surface-secondary)',
                    color: activeDayIdx === idx ? '#000' : 'var(--text-secondary)',
                    fontWeight: activeDayIdx === idx ? 600 : 400,
                  }}
                >
                  {day.dayLabel}
                  {draft.days.length > 1 && activeDayIdx === idx && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeDay(idx); }}
                      style={styles.dayRemoveBtn}
                      title={t.nutrition.removeDay}
                    >
                      <X size={12} />
                    </button>
                  )}
                </button>
              )}
            </div>
          ))}
          <button onClick={addDay} style={{ ...styles.dayTab, background: 'transparent', border: '1px dashed var(--border-subtle)', color: 'var(--text-tertiary)' }}>
            <Plus size={14} /> {t.nutrition.addDay}
          </button>
        </div>
      </div>

      {/* Active day content */}
      {activeDay && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Day notes */}
          <textarea
            value={activeDay.notes}
            onChange={e => updateDay(activeDayIdx, { notes: e.target.value })}
            placeholder={t.nutrition.dayNotes}
            style={{ ...styles.input, minHeight: '40px', resize: 'vertical' as const, fontSize: '13px' }}
            rows={1}
          />

          {/* Daily macro summary */}
          {hasMacros && (
            <div style={styles.macroSummary}>
              <span style={styles.macroLabel}>{t.nutrition.dailyTotal}:</span>
              <span style={{ ...styles.macroPill, background: 'rgba(0, 229, 200, 0.15)', color: '#00e5c8' }}>{macros.calories} {t.nutrition.calories}</span>
              <span style={{ ...styles.macroPill, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>{macros.protein}g P</span>
              <span style={{ ...styles.macroPill, background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>{macros.carbs}g C</span>
              <span style={{ ...styles.macroPill, background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>{macros.fat}g F</span>
            </div>
          )}

          {/* Meals */}
          <AnimatePresence mode="popLayout">
            {activeDay.meals.map((meal, mi) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <GlassCard style={{ padding: '14px 16px' }}>
                  {/* Meal header row */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                    <select
                      value={meal.mealType}
                      onChange={e => updateMeal(mi, { mealType: e.target.value as MealType })}
                      style={{ ...styles.input, width: 'auto', minWidth: isMobile ? '100px' : '140px', fontSize: '12px', padding: '5px 8px' }}
                    >
                      {MEAL_TYPES.map(mt => (
                        <option key={mt} value={mt}>{(t.nutrition.mealTypes as Record<string, string>)[mt]}</option>
                      ))}
                    </select>

                    <div style={{ flex: 1 }} />

                    {/* Move up/down */}
                    <button onClick={() => moveMeal(mi, -1)} disabled={mi === 0} style={{ ...styles.iconBtn, opacity: mi === 0 ? 0.3 : 1 }}>
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => moveMeal(mi, 1)} disabled={mi === activeDay.meals.length - 1} style={{ ...styles.iconBtn, opacity: mi === activeDay.meals.length - 1 ? 0.3 : 1 }}>
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={() => removeMeal(mi)} style={{ ...styles.iconBtn, color: '#ef4444' }} title={t.nutrition.removeMeal}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Title */}
                  <input
                    type="text"
                    value={meal.title}
                    onChange={e => updateMeal(mi, { title: e.target.value })}
                    placeholder={t.nutrition.mealTitle}
                    style={{ ...styles.input, fontWeight: 500, marginBottom: '8px' }}
                  />

                  {/* Description */}
                  <textarea
                    value={meal.description}
                    onChange={e => updateMeal(mi, { description: e.target.value })}
                    placeholder={t.nutrition.mealDescription}
                    style={{ ...styles.input, minHeight: '40px', resize: 'vertical' as const, fontSize: '12px', lineHeight: 1.5 }}
                    rows={2}
                  />

                  {/* Macros row */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <MacroInput
                      label={t.nutrition.calories}
                      value={meal.calories}
                      onChange={v => updateMeal(mi, { calories: v })}
                      color="#00e5c8"
                    />
                    <MacroInput
                      label={t.nutrition.protein}
                      value={meal.proteinG}
                      onChange={v => updateMeal(mi, { proteinG: v })}
                      color="#3b82f6"
                    />
                    <MacroInput
                      label={t.nutrition.carbs}
                      value={meal.carbsG}
                      onChange={v => updateMeal(mi, { carbsG: v })}
                      color="#f97316"
                    />
                    <MacroInput
                      label={t.nutrition.fat}
                      value={meal.fatG}
                      onChange={v => updateMeal(mi, { fatG: v })}
                      color="#ec4899"
                    />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add meal button */}
          <motion.button
            onClick={addMeal}
            style={styles.addMealBtn}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus size={16} /> {t.nutrition.addMeal}
          </motion.button>
        </div>
      )}

      {/* Unsaved changes confirmation modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.overlay}
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              style={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', margin: '0 0 8px' }}>
                Unsaved changes
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 20px' }}>
                You have unsaved changes. Are you sure you want to leave?
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowLeaveConfirm(false)} style={styles.modalCancelBtn}>
                  Stay
                </button>
                <button onClick={onBack} style={styles.modalLeaveBtn}>
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Macro input sub-component ──
function MacroInput({ label, value, onChange, color }: {
  label: string; value: number | null; onChange: (v: number | null) => void; color: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 70px', minWidth: '70px' }}>
      <div style={{ width: '3px', height: '20px', borderRadius: '2px', background: color, opacity: 0.6 }} />
      <input
        type="number"
        value={value ?? ''}
        onChange={e => { const n = Number(e.target.value); onChange(e.target.value === '' ? null : isNaN(n) ? null : Math.max(0, Math.round(n))); }}
        placeholder={label}
        style={{
          background: 'var(--surface-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 8px',
          color: 'var(--text-primary)',
          fontSize: '12px',
          fontFamily: 'inherit',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box' as const,
        }}
        min={0}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
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
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '8px 0',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--accent-primary)',
    color: '#000',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  input: {
    background: 'var(--surface-secondary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  inlineLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  dayTabsWrap: {
    overflowX: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const,
    scrollbarWidth: 'none' as const,
  },
  dayTabs: {
    display: 'flex',
    gap: '6px',
    paddingBottom: '4px',
  },
  dayTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s ease',
  },
  dayRemoveBtn: {
    background: 'rgba(0,0,0,0.2)',
    border: 'none',
    borderRadius: '50%',
    padding: '2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'inherit',
    marginLeft: '2px',
  },
  macroSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
    padding: '10px 14px',
    background: 'var(--surface-secondary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
  },
  macroLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  macroPill: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  iconBtn: {
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
  addMealBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px dashed var(--border-subtle)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
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
  modalCancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  modalLeaveBtn: {
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
};
