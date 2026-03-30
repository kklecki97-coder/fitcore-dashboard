/**
 * Pure parsing utilities for nutrition plan imports.
 * Extracted from NutritionImporter for testability.
 */
import type { NutritionPlan, NutritionPlanDay, NutritionMeal, MealType } from '../types';

// ── Meal type detection from Polish/English keywords ──
const MEAL_TYPE_PATTERNS: { type: MealType; patterns: RegExp[] }[] = [
  { type: 'breakfast', patterns: [/śniadanie/i, /breakfast/i, /sniadanie/i] },
  { type: 'lunch', patterns: [/obiad/i, /lunch/i, /ii\s*posiłek/i, /2\s*posiłek/i, /drugie/i] },
  { type: 'dinner', patterns: [/kolacja/i, /dinner/i, /supper/i] },
  { type: 'snack', patterns: [/przekąska/i, /snack/i, /przekaska/i, /podwieczorek/i] },
  { type: 'pre-workout', patterns: [/przed\s*trening/i, /pre[\s-]?workout/i] },
  { type: 'post-workout', patterns: [/po\s*trening/i, /post[\s-]?workout/i] },
];

export function detectMealType(text: string): MealType | null {
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

export function isDayHeader(text: string): boolean {
  return DAY_PATTERNS.some(p => p.test(text.trim()));
}

// ── Number extraction for macros ──
export function extractNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(num) ? null : Math.round(num);
}

// ── Column detection ──
export interface ColMap {
  title: number;
  description: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: number;
}

export function findHeaderRow(rows: unknown[][]): number {
  const macroKeywords = [/kalori/i, /calori/i, /kcal/i, /bia[łl]ko/i, /protein/i, /w[eę]glowodan/i, /carbs?/i, /t[łl]uszcz/i, /fat/i];
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const rowText = rows[i].map(c => String(c ?? '')).join(' ');
    const matchCount = macroKeywords.filter(k => k.test(rowText)).length;
    if (matchCount >= 2) return i;
  }
  return -1;
}

export function detectColumns(headerRow: unknown[]): ColMap {
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

// ── Meal row parser ──
export function parseMealRow(row: unknown[], colMap: ColMap | null, defaultType: MealType): NutritionMeal {
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
    title = String(row[0] ?? '').trim();
    if (row.length > 1) description = String(row[1] ?? '').trim();
    if (row.length > 2) calories = extractNumber(row[2]);
    if (row.length > 3) proteinG = extractNumber(row[3]);
    if (row.length > 4) carbsG = extractNumber(row[4]);
    if (row.length > 5) fatG = extractNumber(row[5]);
  }

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

// ── Parse rows into a single day ──
export function parseDayFromRows(rows: unknown[][], sheetName: string): NutritionPlanDay {
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
    const mealTypeLabel = detectMealType(firstCell);
    if (mealTypeLabel && (!row[1] || String(row[1]).trim() === '')) continue;

    const meal = parseMealRow(row, colMap, mealTypeLabel || MEAL_TYPES_CYCLE[day.meals.length % MEAL_TYPES_CYCLE.length]);
    if (meal.title) day.meals.push(meal);
  }

  return day;
}

// ── Macro computation ──
export function computeDayMacros(day: NutritionPlanDay) {
  return day.meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories ?? 0),
    protein: acc.protein + (m.proteinG ?? 0),
    carbs: acc.carbs + (m.carbsG ?? 0),
    fat: acc.fat + (m.fatG ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
