import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Grid3X3, List, Star, Plus, Filter, X, ChevronDown } from 'lucide-react';
import GlassCard from './GlassCard';
import ExerciseDetailModal from './ExerciseDetailModal';
import CustomExerciseForm from './CustomExerciseForm';
import { useLang } from '../i18n';
import type { CatalogExercise, MuscleGroup, Equipment, Difficulty, MovementPattern } from '../types';

interface Props {
  exercises: CatalogExercise[];
  onToggleFavorite: (exercise: CatalogExercise) => void;
  onSaveCustom: (exercise: Omit<CatalogExercise, 'id' | 'slug' | 'isGlobal'>) => void;
  onDeleteCustom: (id: string) => void;
  onUpdateCustom: (id: string, exercise: Omit<CatalogExercise, 'id' | 'slug' | 'isGlobal'>) => void;
  isMobile: boolean;
}

type ViewMode = 'grid' | 'list';
type FilterTab = 'all' | 'favorites' | 'custom';

const EXERCISES_PER_PAGE = 36;

export default function ExerciseLibraryPage({ exercises, onToggleFavorite, onSaveCustom, onDeleteCustom, onUpdateCustom, isMobile }: Props) {
  const { t } = useLang();
  const tl = t.exerciseLibrary;

  // ── State ──
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('fitcore-ex-view') as ViewMode) || 'grid'
  );
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | ''>('');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>('');
  const [movementFilter, setMovementFilter] = useState<MovementPattern | ''>('');
  const [showFilters, setShowFilters] = useState(!isMobile);
  const [visibleCount, setVisibleCount] = useState(EXERCISES_PER_PAGE);
  const [selectedExercise, setSelectedExercise] = useState<CatalogExercise | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<CatalogExercise | null>(null);

  // ── Persist view mode ──
  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('fitcore-ex-view', mode);
  };

  // ── Filtering ──
  const filtered = useMemo(() => {
    let result = exercises;

    // Tab filter
    if (filterTab === 'favorites') result = result.filter(e => e.isFavorite);
    if (filterTab === 'custom') result = result.filter(e => e.isCoachCustom);

    // Dropdown filters
    if (muscleFilter) result = result.filter(e => e.muscleGroup === muscleFilter);
    if (equipmentFilter) result = result.filter(e => e.equipment === equipmentFilter);
    if (difficultyFilter) result = result.filter(e => e.difficulty === difficultyFilter);
    if (movementFilter) result = result.filter(e => e.movementPattern === movementFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.namePl && e.namePl.toLowerCase().includes(q)) ||
        e.primaryMuscle.toLowerCase().includes(q) ||
        e.muscleGroup.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q)
      );
    }

    return result;
  }, [exercises, search, filterTab, muscleFilter, equipmentFilter, difficultyFilter, movementFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const hasActiveFilters = muscleFilter || equipmentFilter || difficultyFilter || movementFilter;

  const clearFilters = () => {
    setMuscleFilter('');
    setEquipmentFilter('');
    setDifficultyFilter('');
    setMovementFilter('');
    setSearch('');
    setFilterTab('all');
  };

  // ── Alternatives for detail modal ──
  const alternatives = useMemo(() => {
    if (!selectedExercise) return [];
    return exercises.filter(e =>
      e.id !== selectedExercise.id &&
      e.muscleGroup === selectedExercise.muscleGroup &&
      e.movementPattern === selectedExercise.movementPattern
    );
  }, [selectedExercise, exercises]);

  const handleToggleFav = useCallback((ex: CatalogExercise) => {
    onToggleFavorite(ex);
    // Update selected exercise if open
    if (selectedExercise?.id === ex.id) {
      setSelectedExercise({ ...ex, isFavorite: !ex.isFavorite });
    }
  }, [onToggleFavorite, selectedExercise]);

  const handleEditCustom = (ex: CatalogExercise) => {
    setEditingExercise(ex);
    setShowCustomForm(true);
    setSelectedExercise(null);
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '32px 40px', maxWidth: 1400, height: 'calc(100vh - 73px)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: 24, flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
            {tl.title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{tl.subtitle}</p>
        </div>
        <button onClick={() => { setEditingExercise(null); setShowCustomForm(true); }} style={addBtn}>
          <Plus size={18} />
          {tl.addCustom}
        </button>
      </div>

      {/* Search + Filter Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(EXERCISES_PER_PAGE); }}
            placeholder={tl.search}
            style={{
              width: '100%', padding: '10px 12px 10px 38px', fontSize: 14,
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        {isMobile && (
          <button onClick={() => setShowFilters(!showFilters)} style={{
            ...filterBtn,
            background: hasActiveFilters ? 'var(--accent-primary-dim)' : 'var(--bg-card)',
            color: hasActiveFilters ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}>
            <Filter size={16} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['all', 'favorites', 'custom'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => { setFilterTab(tab); setVisibleCount(EXERCISES_PER_PAGE); }}
            style={{
              padding: '6px 14px', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-display)',
              border: '1px solid ' + (filterTab === tab ? 'var(--accent-primary)' : 'var(--glass-border)'),
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: filterTab === tab ? 'var(--accent-primary-dim)' : 'transparent',
              color: filterTab === tab ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'all' && tl.allExercises}
            {tab === 'favorites' && <><Star size={12} style={{ marginRight: 4 }} />{tl.favorites}</>}
            {tab === 'custom' && tl.myExercises}
          </button>
        ))}
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', marginBottom: 16 }}
          >
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
              padding: '12px 16px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
            }}>
              <FilterDropdown
                value={muscleFilter}
                onChange={v => { setMuscleFilter(v as MuscleGroup | ''); setVisibleCount(EXERCISES_PER_PAGE); }}
                options={[
                  { value: '', label: tl.muscleGroup },
                  ...(['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'full-body', 'cardio'] as MuscleGroup[]).map(mg => ({
                    value: mg,
                    label: tl.muscles[mg === 'full-body' ? 'fullBody' : mg as keyof typeof tl.muscles] || mg,
                  })),
                ]}
              />
              <FilterDropdown
                value={equipmentFilter}
                onChange={v => { setEquipmentFilter(v as Equipment | ''); setVisibleCount(EXERCISES_PER_PAGE); }}
                options={[
                  { value: '', label: tl.equipment },
                  ...(['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band', 'other'] as Equipment[]).map(eq => ({
                    value: eq,
                    label: tl.equipmentTypes[eq as keyof typeof tl.equipmentTypes] || eq,
                  })),
                ]}
              />
              <FilterDropdown
                value={difficultyFilter}
                onChange={v => { setDifficultyFilter(v as Difficulty | ''); setVisibleCount(EXERCISES_PER_PAGE); }}
                options={[
                  { value: '', label: tl.difficulty },
                  ...(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => ({
                    value: d, label: tl.difficulties[d as keyof typeof tl.difficulties],
                  })),
                ]}
              />
              <FilterDropdown
                value={movementFilter}
                onChange={v => { setMovementFilter(v as MovementPattern | ''); setVisibleCount(EXERCISES_PER_PAGE); }}
                options={[
                  { value: '', label: tl.movement },
                  ...(['push', 'pull', 'squat', 'hinge', 'carry', 'rotation', 'isolation'] as MovementPattern[]).map(m => ({
                    value: m, label: tl.movements[m as keyof typeof tl.movements] || m,
                  })),
                ]}
              />
              {hasActiveFilters && (
                <button onClick={clearFilters} style={{
                  background: 'none', border: 'none', color: 'var(--accent-primary)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-display)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <X size={12} /> {tl.clearFilters}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View toggle + count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{tl.showing(filtered.length)}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => handleViewMode('grid')} style={{
            ...viewBtn, background: viewMode === 'grid' ? 'var(--accent-primary-dim)' : 'transparent',
            color: viewMode === 'grid' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
          }}>
            <Grid3X3 size={16} />
          </button>
          <button onClick={() => handleViewMode('list')} style={{
            ...viewBtn, background: viewMode === 'list' ? 'var(--accent-primary-dim)' : 'transparent',
            color: viewMode === 'list' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
          }}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Exercise Grid / List */}
      {filtered.length === 0 ? (
        <EmptyState tab={filterTab} tl={tl} onCreateCustom={() => { setEditingExercise(null); setShowCustomForm(true); }} />
      ) : viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: isMobile ? 10 : 16,
        }}>
          {visible.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              delay={Math.min(i * 0.03, 0.3)}
              onClick={() => setSelectedExercise(ex)}
              onToggleFavorite={() => handleToggleFav(ex)}
              onEdit={ex.isCoachCustom ? () => handleEditCustom(ex) : undefined}
              tl={tl}
              isMobile={isMobile}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visible.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              delay={Math.min(i * 0.02, 0.3)}
              onClick={() => setSelectedExercise(ex)}
              onToggleFavorite={() => handleToggleFav(ex)}
              tl={tl}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={() => setVisibleCount(v => v + EXERCISES_PER_PAGE)}
            style={{
              padding: '10px 32px', fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-display)',
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}
          >
            <ChevronDown size={14} style={{ marginRight: 6 }} />
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
          onToggleFavorite={handleToggleFav}
          alternatives={alternatives}
          onSelectAlternative={ex => setSelectedExercise(ex)}
        />
      )}

      {/* Custom Exercise Form */}
      {showCustomForm && (
        <CustomExerciseForm
          exercise={editingExercise}
          onSave={data => {
            if (editingExercise) {
              onUpdateCustom(editingExercise.id, data);
            } else {
              onSaveCustom(data);
            }
            setShowCustomForm(false);
            setEditingExercise(null);
          }}
          onDelete={editingExercise ? id => {
            onDeleteCustom(id);
            setShowCustomForm(false);
            setEditingExercise(null);
          } : undefined}
          onClose={() => { setShowCustomForm(false); setEditingExercise(null); }}
        />
      )}
    </div>
  );
}

// ── Sub-components ──

function ExerciseCard({ exercise, delay, onClick, onToggleFavorite, onEdit, tl, isMobile }: {
  exercise: CatalogExercise; delay: number; onClick: () => void;
  onToggleFavorite: () => void; onEdit?: () => void;
  tl: ReturnType<typeof useLang>['t']['exerciseLibrary']; isMobile: boolean;
}) {
  const muscleGroupLabel = tl.muscles[exercise.muscleGroup === 'full-body' ? 'fullBody' : exercise.muscleGroup as keyof typeof tl.muscles] || exercise.muscleGroup;
  const equipmentLabel = tl.equipmentTypes[exercise.equipment as keyof typeof tl.equipmentTypes] || exercise.equipment;
  const difficultyColor = exercise.difficulty === 'beginner' ? '#4ade80' : exercise.difficulty === 'intermediate' ? '#f59e0b' : '#ef4444';

  return (
    <GlassCard hover delay={delay} onClick={onClick} style={{ padding: isMobile ? 12 : 16, cursor: 'pointer', position: 'relative' }}>
      {/* Favorite star */}
      <button
        onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
        style={{ position: 'absolute', top: isMobile ? 8 : 12, right: isMobile ? 8 : 12, background: 'none', border: 'none', cursor: 'pointer', padding: 2, zIndex: 2 }}
      >
        <Star size={16} fill={exercise.isFavorite ? '#f59e0b' : 'none'} color={exercise.isFavorite ? '#f59e0b' : 'var(--glass-border)'} />
      </button>

      {/* GIF / Placeholder */}
      {exercise.gifUrl ? (
        <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 10, background: 'var(--bg-secondary)' }}>
          <img src={exercise.gifUrl} alt={exercise.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{
          width: '100%', aspectRatio: '4/3', borderRadius: 'var(--radius-sm)',
          background: `linear-gradient(135deg, var(--bg-secondary), ${difficultyColor}08)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 10, border: '1px dashed var(--glass-border)',
          fontSize: 28, opacity: 0.4,
        }}>
          {muscleGroupEmoji(exercise.muscleGroup)}
        </div>
      )}

      {/* Name */}
      <div style={{
        fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)', marginBottom: 6,
        lineHeight: 1.3, minHeight: isMobile ? 32 : 36,
      }}>
        {exercise.name}
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <MiniTag color="var(--accent-primary)">{muscleGroupLabel}</MiniTag>
        <MiniTag color="#6366f1">{equipmentLabel}</MiniTag>
        {exercise.isCoachCustom && <MiniTag color="#f59e0b">Custom</MiniTag>}
      </div>

      {/* Edit button for custom */}
      {onEdit && (
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          style={{
            marginTop: 8, width: '100%', padding: '5px 0', fontSize: 11, fontWeight: 600,
            fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.5,
            background: 'transparent', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)', cursor: 'pointer',
          }}
        >
          {tl.editExercise}
        </button>
      )}
    </GlassCard>
  );
}

function ExerciseRow({ exercise, delay, onClick, onToggleFavorite, tl }: {
  exercise: CatalogExercise; delay: number; onClick: () => void;
  onToggleFavorite: () => void;
  tl: ReturnType<typeof useLang>['t']['exerciseLibrary'];
}) {
  const muscleGroupLabel = tl.muscles[exercise.muscleGroup === 'full-body' ? 'fullBody' : exercise.muscleGroup as keyof typeof tl.muscles] || exercise.muscleGroup;
  const equipmentLabel = tl.equipmentTypes[exercise.equipment as keyof typeof tl.equipmentTypes] || exercise.equipment;
  const difficultyLabel = tl.difficulties[exercise.difficulty as keyof typeof tl.difficulties];
  const difficultyColor = exercise.difficulty === 'beginner' ? '#4ade80' : exercise.difficulty === 'intermediate' ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
      >
        <Star size={15} fill={exercise.isFavorite ? '#f59e0b' : 'none'} color={exercise.isFavorite ? '#f59e0b' : 'var(--glass-border)'} />
      </button>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {exercise.name}
          {exercise.isCoachCustom && <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 6, fontWeight: 700 }}>CUSTOM</span>}
        </div>
      </div>

      <MiniTag color="var(--accent-primary)">{muscleGroupLabel}</MiniTag>
      <MiniTag color="#6366f1">{equipmentLabel}</MiniTag>
      <span style={{ fontSize: 11, color: difficultyColor, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
        {difficultyLabel}
      </span>
    </motion.div>
  );
}

function EmptyState({ tab, tl, onCreateCustom }: { tab: FilterTab; tl: ReturnType<typeof useLang>['t']['exerciseLibrary']; onCreateCustom: () => void }) {
  const config = tab === 'favorites'
    ? { icon: <Star size={40} style={{ opacity: 0.3, color: '#f59e0b' }} />, title: tl.noFavorites, sub: tl.starToSave }
    : tab === 'custom'
    ? { icon: <Plus size={40} style={{ opacity: 0.3, color: 'var(--accent-primary)' }} />, title: tl.noCustom, sub: tl.createFirst }
    : { icon: <Search size={40} style={{ opacity: 0.3 }} />, title: tl.noResults, sub: tl.tryDifferent };

  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      {config.icon}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12 }}>{config.title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>{config.sub}</div>
      {tab === 'custom' && (
        <button onClick={onCreateCustom} style={{ ...addBtn, marginTop: 16, display: 'inline-flex' }}>
          <Plus size={16} /> {tl.addCustom}
        </button>
      )}
    </div>
  );
}

function FilterDropdown({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '6px 10px', fontSize: 13, fontFamily: 'var(--font-display)',
        background: value ? 'var(--accent-primary-dim)' : 'var(--bg-secondary)',
        border: '1px solid ' + (value ? 'var(--accent-primary)' : 'var(--glass-border)'),
        borderRadius: 'var(--radius-sm)',
        color: value ? 'var(--accent-primary)' : 'var(--text-secondary)',
        cursor: 'pointer', outline: 'none',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function MiniTag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px',
      borderRadius: 100, textTransform: 'uppercase', letterSpacing: 0.3,
      background: `${color}15`, color, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function muscleGroupEmoji(mg: string): string {
  const map: Record<string, string> = {
    legs: '\u{1F9B5}', chest: '\u{1F4AA}', back: '\u{1F3CB}', shoulders: '\u{1F3AF}',
    arms: '\u{1F4AA}', core: '\u{1F9D8}', 'full-body': '\u{26A1}', cardio: '\u{1F525}',
  };
  return map[mg] || '\u{1F4AA}';
}

// ── Styles ──

const addBtn: React.CSSProperties = {
  padding: '8px 18px', fontSize: 14, fontWeight: 600,
  fontFamily: 'var(--font-display)',
  background: 'var(--accent-primary)', border: 'none',
  borderRadius: 'var(--radius-sm)', color: '#000',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
};

const filterBtn: React.CSSProperties = {
  padding: '10px', border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex',
};

const viewBtn: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex',
  background: 'transparent', transition: 'all 0.15s',
};
