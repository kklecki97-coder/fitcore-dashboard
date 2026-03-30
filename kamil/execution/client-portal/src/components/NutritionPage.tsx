import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, ChevronDown } from 'lucide-react';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { NutritionPlan, NutritionPlanAssignment, NutritionPlanDay } from '../types';

interface NutritionPageProps {
  plan: NutritionPlan | null;
  assignment: NutritionPlanAssignment | null;
  pastPlans: { plan: NutritionPlan; assignment: NutritionPlanAssignment }[];
  coachName: string;
}

function computeDayMacros(day: NutritionPlanDay) {
  return day.meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories ?? 0),
    protein: acc.protein + (m.proteinG ?? 0),
    carbs: acc.carbs + (m.carbsG ?? 0),
    fat: acc.fat + (m.fatG ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

const mealTypeIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
  'pre-workout': '💪',
  'post-workout': '🥤',
};

export default function NutritionPage({ plan, assignment, pastPlans, coachName }: NutritionPageProps) {
  const { t } = useLang();
  const isMobile = useIsMobile();
  const [showHistory, setShowHistory] = useState(false);

  // Auto-select today's day tab
  const todayDayIndex = useMemo(() => {
    if (!plan) return 0;
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const polishDayNames = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
    const todayIdx = new Date().getDay(); // 0=Sun
    const adjustedIdx = todayIdx === 0 ? 6 : todayIdx - 1; // 0=Mon
    const todayName = dayNames[adjustedIdx];
    const todayNamePl = polishDayNames[adjustedIdx];
    const matchIdx = plan.days.findIndex(d => {
      const label = d.dayLabel.toLowerCase();
      return label.includes(todayName) || label.includes(todayNamePl);
    });
    return matchIdx >= 0 ? matchIdx : 0;
  }, [plan]);

  const [activeDayIdx, setActiveDayIdx] = useState(todayDayIndex);

  // Clamp activeDayIdx when plan changes
  useEffect(() => {
    if (plan && activeDayIdx >= plan.days.length) {
      setActiveDayIdx(Math.max(0, plan.days.length - 1));
    }
  }, [plan, activeDayIdx]);

  const activeDay = plan?.days[activeDayIdx] || null;
  const macros = activeDay ? computeDayMacros(activeDay) : null;
  const hasMacros = macros && (macros.calories > 0 || macros.protein > 0 || macros.carbs > 0 || macros.fat > 0);

  // Empty state
  if (!plan) {
    return (
      <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
        <div style={styles.emptyState}>
          <UtensilsCrossed size={56} color="var(--text-tertiary)" style={{ opacity: 0.3 }} />
          <h2 style={{ color: 'var(--text-primary)', margin: '20px 0 8px', fontSize: '20px', fontWeight: 600 }}>
            {t.nutrition.noPlan}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '300px', lineHeight: 1.5 }}>
            {t.nutrition.noPlanSub}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, padding: isMobile ? '16px' : '24px 32px' }}>
      {/* Plan header */}
      <div style={{ marginBottom: '4px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, margin: '0 0 4px' }}>
          {plan.title}
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...styles.typeBadge, background: plan.type === 'strict' ? 'rgba(236, 72, 153, 0.2)' : plan.type === 'guidelines' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0, 229, 200, 0.2)' }}>
            {(t.nutrition.planType as Record<string, string>)[plan.type] || plan.type}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            by {coachName}
          </span>
        </div>
        {plan.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
            {plan.description}
          </p>
        )}
      </div>

      {/* Coach notes */}
      {assignment?.coachNotes && (
        <GlassCard delay={0.05} style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
            {t.nutrition.coachNotes}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' as const }}>
            {assignment.coachNotes}
          </p>
        </GlassCard>
      )}

      {/* Day tabs */}
      <div style={styles.dayTabsWrap}>
        <div style={styles.dayTabs}>
          {plan.days.map((day, idx) => (
            <button
              key={day.id}
              onClick={() => setActiveDayIdx(idx)}
              style={{
                ...styles.dayTab,
                background: activeDayIdx === idx ? 'var(--accent-primary)' : 'var(--surface-secondary)',
                color: activeDayIdx === idx ? '#000' : 'var(--text-secondary)',
                fontWeight: activeDayIdx === idx ? 600 : 400,
              }}
            >
              {day.dayLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Daily macro summary */}
      {hasMacros && (
        <div style={styles.macroBar}>
          <span style={styles.macroLabel}>{t.nutrition.dailyTotal}</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ ...styles.macroPill, background: 'rgba(0, 229, 200, 0.15)', color: '#00e5c8' }}>
              {macros.calories} {t.nutrition.calories}
            </span>
            <span style={{ ...styles.macroPill, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              {macros.protein}g {t.nutrition.protein}
            </span>
            <span style={{ ...styles.macroPill, background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
              {macros.carbs}g {t.nutrition.carbs}
            </span>
            <span style={{ ...styles.macroPill, background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              {macros.fat}g {t.nutrition.fat}
            </span>
          </div>
        </div>
      )}

      {/* Day notes */}
      {activeDay?.notes && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
          {activeDay.notes}
        </p>
      )}

      {/* Meal cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDayIdx}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {activeDay?.meals.map((meal, mi) => {
            const hasMealMacros = meal.calories != null || meal.proteinG != null || meal.carbsG != null || meal.fatG != null;
            return (
              <GlassCard key={meal.id} delay={mi * 0.04} style={{ padding: '14px 16px' }}>
                {/* Meal type + title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: meal.description || hasMealMacros ? '8px' : 0 }}>
                  <span style={styles.mealTypeIcon}>
                    {mealTypeIcons[meal.mealType] || '🍽️'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '2px' }}>
                      {(t.nutrition.mealTypes as Record<string, string>)[meal.mealType] || meal.mealType}
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
                      {meal.title || 'Untitled meal'}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {meal.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 8px', lineHeight: 1.5, whiteSpace: 'pre-wrap' as const }}>
                    {meal.description}
                  </p>
                )}

                {/* Macro chips */}
                {hasMealMacros && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {meal.calories != null && (
                      <span style={{ ...styles.macroChip, borderColor: 'rgba(0, 229, 200, 0.3)' }}>
                        {meal.calories} {t.nutrition.calories}
                      </span>
                    )}
                    {meal.proteinG != null && (
                      <span style={{ ...styles.macroChip, borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                        {meal.proteinG}g P
                      </span>
                    )}
                    {meal.carbsG != null && (
                      <span style={{ ...styles.macroChip, borderColor: 'rgba(249, 115, 22, 0.3)' }}>
                        {meal.carbsG}g C
                      </span>
                    )}
                    {meal.fatG != null && (
                      <span style={{ ...styles.macroChip, borderColor: 'rgba(236, 72, 153, 0.3)' }}>
                        {meal.fatG}g F
                      </span>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })}

          {activeDay && activeDay.meals.length === 0 && (
            <div style={{ textAlign: 'center' as const, padding: '40px 20px', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              No meals for this day
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Past plans history */}
      {pastPlans.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={styles.historyToggle}
          >
            <ChevronDown size={16} style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            {t.nutrition.history} ({pastPlans.length})
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}
              >
                {pastPlans.map(({ plan: pp, assignment: pa }) => (
                  <GlassCard key={pa.id} style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>{pp.title}</div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '2px' }}>
                          {pa.startDate && `${pa.startDate}`}{pa.endDate && ` — ${pa.endDate}`}
                        </div>
                      </div>
                      <span style={{
                        ...styles.statusBadge,
                        background: pa.status === 'completed' ? 'rgba(0, 229, 200, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                        color: pa.status === 'completed' ? '#00e5c8' : '#f97316',
                      }}>
                        {(t.nutrition as Record<string, unknown>)[pa.status] as string || pa.status}
                      </span>
                    </div>
                  </GlassCard>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom padding for mobile nav */}
      {isMobile && <div style={{ height: '80px' }} />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    minHeight: '100%',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 20px',
    textAlign: 'center' as const,
  },
  typeBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  dayTabsWrap: {
    overflowX: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const,
    scrollbarWidth: 'none' as const,
    margin: '0 -4px',
    padding: '0 4px',
  },
  dayTabs: {
    display: 'flex',
    gap: '6px',
    paddingBottom: '4px',
  },
  dayTab: {
    padding: '7px 16px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s ease',
  },
  macroBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
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
  mealTypeIcon: {
    fontSize: '22px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface-secondary)',
    borderRadius: '10px',
    flexShrink: 0,
  },
  macroChip: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    border: '1px solid',
  },
  historyToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '4px 0',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
  },
};
