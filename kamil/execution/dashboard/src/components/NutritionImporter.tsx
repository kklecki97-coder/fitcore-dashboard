import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Upload, FileSpreadsheet, Check,
  AlertTriangle, X, Calendar, Sparkles, Loader2, FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { aiReviewNutritionPlan, parseRawTextToNutritionPlan } from '../utils/ai-nutrition-review';
import type { NutritionPlan, NutritionPlanDay, NutritionMeal, MealType } from '../types';

interface NutritionImporterProps {
  onImported: (plan: NutritionPlan) => void;
  onBack: () => void;
}

// ── Meal type detection from Polish/English keywords ──
const MEAL_TYPE_PATTERNS: { type: MealType; patterns: RegExp[] }[] = [
  { type: 'breakfast', patterns: [/śniadanie/i, /breakfast/i, /sniadanie/i] },
  { type: 'lunch', patterns: [/obiad/i, /lunch/i, /ii\s*posiłek/i, /2\s*posiłek/i, /drugie/i] },
  { type: 'dinner', patterns: [/kolacja/i, /dinner/i, /supper/i] },
  { type: 'snack', patterns: [/przekąska/i, /snack/i, /przekaska/i, /podwieczorek/i] },
  { type: 'pre-workout', patterns: [/przed\s*trening/i, /pre[\s-]?workout/i] },
  { type: 'post-workout', patterns: [/po\s*trening/i, /post[\s-]?workout/i] },
];

function detectMealType(text: string): MealType | null {
  for (const { type, patterns } of MEAL_TYPE_PATTERNS) {
    for (const p of patterns) {
      if (p.test(text)) return type;
    }
  }
  return null;
}

// ── Day label detection ──
const DAY_PATTERNS = [
  /poniedzia[łl]ek/i, /wtorek/i, /[sś]roda/i, /czwartek/i, /pi[aą]tek/i, /sobota/i, /niedziela/i,
  /monday/i, /tuesday/i, /wednesday/i, /thursday/i, /friday/i, /saturday/i, /sunday/i,
  /dzie[nń]\s*\d/i, /day\s*\d/i, /dzie[nń]\s*treningow/i, /dzie[nń]\s*odpoczynk/i,
  /training\s*day/i, /rest\s*day/i,
];

function isDayHeader(text: string): boolean {
  return DAY_PATTERNS.some(p => p.test(text.trim()));
}

// ── Number extraction for macros ──
function extractNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(num) ? null : Math.round(num);
}

// ── Main parser ──
function parseNutritionExcel(wb: XLSX.WorkBook): NutritionPlan {
  const plan: NutritionPlan = {
    id: crypto.randomUUID(),
    title: wb.SheetNames[0] || 'Imported Plan',
    description: '',
    type: 'flexible',
    isTemplate: false,
    clientIds: [],
    days: [],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };

  // Strategy 1: Multiple sheets = multiple days
  if (wb.SheetNames.length > 1) {
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const day = parseDayFromRows(rows, sheetName);
      if (day.meals.length > 0) plan.days.push(day);
    }
    if (plan.days.length > 0) return plan;
  }

  // Strategy 2: Single sheet — look for day headers as row separators
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find column layout first — look for a header row with macro labels
  const headerRowIdx = findHeaderRow(rows);
  const colMap = headerRowIdx >= 0 ? detectColumns(rows[headerRowIdx]) : null;

  let currentDay: NutritionPlanDay | null = null;
  const MEAL_TYPES_CYCLE: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
  let mealTypeIdx = 0;
  let nextForcedMealType: MealType | null = null;

  for (let i = (headerRowIdx >= 0 ? headerRowIdx + 1 : 0); i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] ?? '').trim();
    if (!firstCell) continue;

    // Check if this row is a day header
    if (isDayHeader(firstCell)) {
      if (currentDay && currentDay.meals.length > 0) {
        plan.days.push(currentDay);
      }
      currentDay = {
        id: crypto.randomUUID(),
        dayLabel: firstCell,
        sortOrder: plan.days.length,
        notes: '',
        meals: [],
      };
      mealTypeIdx = 0;
      continue;
    }

    // Check if this is a meal type header (row with just "Śniadanie" etc.)
    const mealTypeFromCell = detectMealType(firstCell);
    if (mealTypeFromCell && (!row[1] || String(row[1]).trim() === '')) {
      // This is a standalone meal type label row — skip it but remember the type
      // Store the actual detected type for next meal (don't rely on cycle index for pre/post-workout)
      nextForcedMealType = mealTypeFromCell;
      continue;
    }

    // If no day created yet, create a default one
    if (!currentDay) {
      currentDay = {
        id: crypto.randomUUID(),
        dayLabel: 'Day 1',
        sortOrder: 0,
        notes: '',
        meals: [],
      };
    }

    // Parse this row as a meal
    const resolvedType = mealTypeFromCell || nextForcedMealType || MEAL_TYPES_CYCLE[mealTypeIdx % MEAL_TYPES_CYCLE.length];
    const meal = parseMealRow(row, colMap, resolvedType);
    if (meal.title) {
      currentDay.meals.push(meal);
      nextForcedMealType = null; // consumed
      if (!mealTypeFromCell) mealTypeIdx++;
    }
  }

  // Push last day
  if (currentDay && currentDay.meals.length > 0) {
    plan.days.push(currentDay);
  }

  // If we only got 1 day with no real day label, try to split meals into day groups
  if (plan.days.length === 0) {
    // Fallback: treat entire file as one day
    const fallbackDay: NutritionPlanDay = {
      id: crypto.randomUUID(),
      dayLabel: 'Day 1',
      sortOrder: 0,
      notes: '',
      meals: [],
    };
    for (let i = (headerRowIdx >= 0 ? headerRowIdx + 1 : 0); i < rows.length; i++) {
      const row = rows[i];
      if (!row || !String(row[0] ?? '').trim()) continue;
      const meal = parseMealRow(row, colMap, MEAL_TYPES_CYCLE[fallbackDay.meals.length % MEAL_TYPES_CYCLE.length]);
      if (meal.title) fallbackDay.meals.push(meal);
    }
    if (fallbackDay.meals.length > 0) plan.days.push(fallbackDay);
  }

  return plan;
}

// ── Helpers ──

function findHeaderRow(rows: unknown[][]): number {
  const macroKeywords = [/kalori/i, /calori/i, /kcal/i, /bia[łl]ko/i, /protein/i, /w[eę]glowodan/i, /carbs?/i, /t[łl]uszcz/i, /fat/i];
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowText = rows[i].map(c => String(c ?? '')).join(' ');
    const matchCount = macroKeywords.filter(k => k.test(rowText)).length;
    if (matchCount >= 2) return i;
  }
  return -1;
}

interface ColMap {
  title: number;
  description: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: number;
}

function detectColumns(headerRow: unknown[]): ColMap {
  const map: ColMap = { title: 0, description: -1, calories: -1, protein: -1, carbs: -1, fat: -1, mealType: -1 };
  for (let c = 0; c < headerRow.length; c++) {
    const h = String(headerRow[c] ?? '').toLowerCase();
    if (/nazw|name|posi[łl]ek|meal|danie/i.test(h)) map.title = c;
    if (/opis|desc|sk[łl]adnik|ingredient|przepis|recipe/i.test(h)) map.description = c;
    if (/kalori|calori|kcal|energia|energy/i.test(h)) map.calories = c;
    if (/bia[łl]ko|protein/i.test(h)) map.protein = c;
    if (/w[eę]glowodan|carb/i.test(h)) map.carbs = c;
    if (/t[łl]uszcz|fat/i.test(h)) map.fat = c;
    if (/typ|type|posi[łl]ek.*typ|meal.*type|por[aą]/i.test(h)) map.mealType = c;
  }
  return map;
}

function parseMealRow(row: unknown[], colMap: ColMap | null, defaultType: MealType): NutritionMeal {
  const get = (idx: number) => idx >= 0 && idx < row.length ? row[idx] : null;

  let title = '';
  let description = '';
  let calories: number | null = null;
  let proteinG: number | null = null;
  let carbsG: number | null = null;
  let fatG: number | null = null;
  let mealType: MealType = defaultType;

  if (colMap) {
    title = String(get(colMap.title) ?? '').trim();
    if (colMap.description >= 0) description = String(get(colMap.description) ?? '').trim();
    if (colMap.calories >= 0) calories = extractNumber(get(colMap.calories));
    if (colMap.protein >= 0) proteinG = extractNumber(get(colMap.protein));
    if (colMap.carbs >= 0) carbsG = extractNumber(get(colMap.carbs));
    if (colMap.fat >= 0) fatG = extractNumber(get(colMap.fat));
    if (colMap.mealType >= 0) {
      const detected = detectMealType(String(get(colMap.mealType) ?? ''));
      if (detected) mealType = detected;
    }
  } else {
    // No header detected — use positional guess
    title = String(row[0] ?? '').trim();
    if (row.length > 1) description = String(row[1] ?? '').trim();
    if (row.length > 2) calories = extractNumber(row[2]);
    if (row.length > 3) proteinG = extractNumber(row[3]);
    if (row.length > 4) carbsG = extractNumber(row[4]);
    if (row.length > 5) fatG = extractNumber(row[5]);
  }

  // Try detecting meal type from title
  const titleMealType = detectMealType(title);
  if (titleMealType) mealType = titleMealType;

  return {
    id: crypto.randomUUID(),
    mealType,
    title,
    description,
    calories,
    proteinG,
    carbsG,
    fatG,
    sortOrder: 0,
  };
}

function parseDayFromRows(rows: unknown[][], sheetName: string): NutritionPlanDay {
  const headerRowIdx = findHeaderRow(rows);
  const colMap = headerRowIdx >= 0 ? detectColumns(rows[headerRowIdx]) : null;
  const day: NutritionPlanDay = {
    id: crypto.randomUUID(),
    dayLabel: sheetName,
    sortOrder: 0,
    notes: '',
    meals: [],
  };

  const MEAL_TYPES_CYCLE: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  for (let i = (headerRowIdx >= 0 ? headerRowIdx + 1 : 0); i < rows.length; i++) {
    const row = rows[i];
    if (!row || !String(row[0] ?? '').trim()) continue;

    const firstCell = String(row[0]).trim();
    // Skip if it's a standalone meal type label
    const mealTypeLabel = detectMealType(firstCell);
    if (mealTypeLabel && (!row[1] || String(row[1]).trim() === '')) continue;

    const meal = parseMealRow(row, colMap, mealTypeLabel || MEAL_TYPES_CYCLE[day.meals.length % MEAL_TYPES_CYCLE.length]);
    if (meal.title) day.meals.push(meal);
  }

  return day;
}

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════

export default function NutritionImporter({ onImported, onBack }: NutritionImporterProps) {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const nt = t.nutritionImporter;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<NutritionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'excel' | 'docx' | ''>('');
  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiImproved, setAiImproved] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    setAiImproved(false);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'doc') {
      setError('Legacy .doc format is not supported. Please save the file as .docx and try again.');
      return;
    }
    const isDocx = ext === 'docx';
    setFileType(isDocx ? 'docx' : 'excel');

    try {
      const buffer = await file.arrayBuffer();
      const name = file.name.replace(/\.(xlsx?|csv|docx?)$/i, '').replace(/[_-]/g, ' ').trim();
      let plan: NutritionPlan;
      let rawText = '';

      if (isDocx) {
        // Parse DOCX with mammoth
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        rawText = result.value;

        if (!rawText.trim()) {
          setError(nt.errorNoMeals);
          return;
        }

        // Basic text parse first
        plan = parseRawTextToNutritionPlan(rawText, name || 'Imported Plan');
      } else {
        // Excel/CSV
        const wb = XLSX.read(buffer, { type: 'array' });
        plan = parseNutritionExcel(wb);
      }

      if (name) plan.title = name;

      if (plan.days.length === 0 || plan.days.every(d => d.meals.length === 0)) {
        // For DOCX, if basic parse fails, still try AI
        if (isDocx && rawText.trim()) {
          plan = {
            id: crypto.randomUUID(),
            title: name || 'Imported Plan',
            description: '',
            type: 'flexible',
            isTemplate: false,
            clientIds: [],
            days: [{
              id: crypto.randomUUID(),
              dayLabel: 'Day 1',
              sortOrder: 0,
              notes: '',
              meals: [{
                id: crypto.randomUUID(),
                mealType: 'breakfast',
                title: 'Imported content',
                description: rawText.slice(0, 2000),
                calories: null, proteinG: null, carbsG: null, fatG: null,
                sortOrder: 0,
              }],
            }],
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
          };
        } else {
          setError(nt.errorNoMeals);
          return;
        }
      }

      // AI Review step
      setPreview(plan);
      setAiReviewing(true);
      try {
        const reviewed = await aiReviewNutritionPlan(plan, rawText || undefined);
        // Check if AI actually improved something
        const originalMeals = plan.days.reduce((s, d) => s + d.meals.length, 0);
        const reviewedMeals = reviewed.days.reduce((s, d) => s + d.meals.length, 0);
        if (reviewed.title !== plan.title || reviewed.days.length !== plan.days.length || reviewedMeals !== originalMeals) {
          setAiImproved(true);
        }
        setPreview(reviewed);
      } catch {
        // AI failed — use basic parse
      } finally {
        setAiReviewing(false);
      }
    } catch {
      setError(nt.errorParse);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const confirmImport = () => {
    if (preview) onImported(preview);
  };

  const totalMeals = preview?.days.reduce((s, d) => s + d.meals.length, 0) ?? 0;
  const hasMacros = preview?.days.some(d => d.meals.some(m => m.calories || m.proteinG || m.carbsG || m.fatG));

  return (
    <div style={{ ...s.page, padding: isMobile ? '16px' : '24px 32px' }}>
      <motion.button onClick={onBack} style={s.backBtn} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
        <ArrowLeft size={16} /> {nt.back}
      </motion.button>

      <div style={s.header}>
        <h2 style={s.title}>{nt.title}</h2>
        <p style={s.subtitle}>{nt.subtitle}</p>
      </div>

      {/* AI Reviewing State */}
      {aiReviewing && (
        <GlassCard delay={0.1}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px 24px' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles size={36} color="var(--accent-primary)" />
            </motion.div>
            <div style={{ textAlign: 'center' as const }}>
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                AI is reviewing your nutrition plan...
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Structuring meals, detecting macros, cleaning up labels
              </p>
            </div>
            <Loader2 size={20} color="var(--text-tertiary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        </GlassCard>
      )}

      {!preview && !aiReviewing ? (
        <GlassCard delay={0.1}>
          <div
            style={s.dropZone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.docx"
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />
            <div style={s.uploadIcon}>
              <Upload size={32} color="var(--accent-primary)" />
            </div>
            <p style={s.dropText}>{nt.dropText}</p>
            <p style={s.dropSubtext}>{nt.dropSubtext}</p>
            {fileName && !error && (
              <p style={{ ...s.dropSubtext, color: 'var(--accent-primary)' }}>
                {fileType === 'docx' ? <FileText size={14} style={{ verticalAlign: 'middle' }} /> : <FileSpreadsheet size={14} style={{ verticalAlign: 'middle' }} />} {fileName}
              </p>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={s.errorBanner}
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={s.tips}>
            <p style={s.tipTitle}>{nt.tipsTitle}</p>
            <ul style={s.tipList}>
              {(nt.tips as string[]).map((tip: string) => <li key={tip}>{tip}</li>)}
            </ul>
          </div>
        </GlassCard>
      ) : preview && !aiReviewing ? (
        <>
          {/* AI improvement badge */}
          {aiImproved && (
            <GlassCard delay={0.05} style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--accent-primary)" />
                <span style={{ color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 500 }}>
                  AI structured and improved this plan
                </span>
              </div>
            </GlassCard>
          )}

          {/* Preview */}
          <GlassCard delay={0.1}>
            <div style={s.previewHeader}>
              <div>
                <h3 style={s.previewTitle}>
                  {fileType === 'docx' ? <FileText size={18} color="var(--accent-primary)" /> : <FileSpreadsheet size={18} color="var(--accent-primary)" />} {preview.title}
                </h3>
                <p style={s.previewMeta}>
                  {preview.days.length} {t.nutrition.days} · {totalMeals} {t.nutrition.meals}
                  {hasMacros && ' · macros detected'} · from {fileName}
                </p>
              </div>
              <button onClick={() => { setPreview(null); setFileName(''); setAiImproved(false); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={s.resetBtn}>
                <X size={14} /> {nt.chooseDifferent}
              </button>
            </div>
          </GlassCard>

          {/* Day previews */}
          {preview.days.map((day, di) => (
            <GlassCard key={day.id} delay={0.1 + di * 0.05}>
              <div style={s.dayPreview}>
                <div style={s.dayHeader}>
                  <Calendar size={16} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{day.dayLabel}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    {day.meals.length} {t.nutrition.meals}
                  </span>
                </div>
                {day.meals.map((meal) => (
                  <div key={meal.id} style={s.mealPreviewRow}>
                    <span style={s.mealTypeBadge}>
                      {(t.nutrition.mealTypes as Record<string, string>)[meal.mealType] || meal.mealType}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {meal.title}
                    </span>
                    {meal.calories != null && (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', flexShrink: 0 }}>
                        {meal.calories} kcal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}

          {/* Confirm */}
          <div style={s.confirmBar}>
            <motion.button onClick={confirmImport} style={s.confirmBtn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Check size={16} /> {nt.importBtn}
            </motion.button>
          </div>
        </>
      ) : null}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%', overflowY: 'auto' as const, maxHeight: '100%' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0' },
  header: { marginBottom: '4px' },
  title: { color: 'var(--text-primary)', fontSize: '22px', fontWeight: 600, margin: '0 0 4px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px', margin: 0 },
  dropZone: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 24px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'border-color 0.2s' },
  uploadIcon: { width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropText: { color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, margin: 0 },
  dropSubtext: { color: 'var(--text-tertiary)', fontSize: '13px', margin: 0 },
  errorBanner: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '13px', margin: '12px 0 0' },
  tips: { padding: '16px 0 0', borderTop: '1px solid var(--border-subtle)', marginTop: '16px' },
  tipTitle: { color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, margin: '0 0 8px' },
  tipList: { color: 'var(--text-tertiary)', fontSize: '12px', margin: 0, paddingLeft: '18px', lineHeight: 1.8 },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' as const },
  previewTitle: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '15px', margin: 0 },
  previewMeta: { color: 'var(--text-tertiary)', fontSize: '12px', margin: '4px 0 0' },
  resetBtn: { display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  dayPreview: { display: 'flex', flexDirection: 'column', gap: '6px' },
  dayHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  mealPreviewRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' },
  mealTypeBadge: { padding: '2px 8px', borderRadius: '10px', background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, flexShrink: 0 },
  confirmBar: { display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' },
  confirmBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
