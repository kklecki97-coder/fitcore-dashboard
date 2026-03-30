import { describe, it, expect } from 'vitest';
import {
  detectMealType,
  isDayHeader,
  extractNumber,
  findHeaderRow,
  detectColumns,
  parseMealRow,
  parseDayFromRows,
  computeDayMacros,
} from '../nutrition-parser';
import type { NutritionPlanDay } from '../../types';

// ═══════════════════════════════════════════════════════════
// detectMealType
// ═══════════════════════════════════════════════════════════

describe('detectMealType', () => {
  it('detects Polish breakfast', () => {
    expect(detectMealType('Śniadanie')).toBe('breakfast');
    expect(detectMealType('sniadanie')).toBe('breakfast');
  });

  it('detects English breakfast', () => {
    expect(detectMealType('Breakfast')).toBe('breakfast');
  });

  it('detects Polish lunch', () => {
    expect(detectMealType('Obiad')).toBe('lunch');
    expect(detectMealType('II posiłek')).toBe('lunch');
    expect(detectMealType('2 posiłek')).toBe('lunch');
  });

  it('detects English lunch', () => {
    expect(detectMealType('Lunch')).toBe('lunch');
  });

  it('detects dinner', () => {
    expect(detectMealType('Kolacja')).toBe('dinner');
    expect(detectMealType('Dinner')).toBe('dinner');
    expect(detectMealType('Supper')).toBe('dinner');
  });

  it('detects snack', () => {
    expect(detectMealType('Przekąska')).toBe('snack');
    expect(detectMealType('Snack')).toBe('snack');
    expect(detectMealType('Podwieczorek')).toBe('snack');
  });

  it('detects pre-workout', () => {
    expect(detectMealType('Przed treningiem')).toBe('pre-workout');
    expect(detectMealType('Pre-workout')).toBe('pre-workout');
    expect(detectMealType('Pre workout')).toBe('pre-workout');
  });

  it('detects post-workout', () => {
    expect(detectMealType('Po treningu')).toBe('post-workout');
    expect(detectMealType('Post-workout')).toBe('post-workout');
    expect(detectMealType('Post workout')).toBe('post-workout');
  });

  it('returns null for non-meal text', () => {
    expect(detectMealType('Chicken breast')).toBeNull();
    expect(detectMealType('Owsianka z bananem')).toBeNull();
    expect(detectMealType('')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(detectMealType('ŚNIADANIE')).toBe('breakfast');
    expect(detectMealType('DINNER')).toBe('dinner');
  });
});

// ═══════════════════════════════════════════════════════════
// isDayHeader
// ═══════════════════════════════════════════════════════════

describe('isDayHeader', () => {
  it('detects Polish day names', () => {
    expect(isDayHeader('Poniedziałek')).toBe(true);
    expect(isDayHeader('Wtorek')).toBe(true);
    expect(isDayHeader('Środa')).toBe(true);
    expect(isDayHeader('Czwartek')).toBe(true);
    expect(isDayHeader('Piątek')).toBe(true);
    expect(isDayHeader('Sobota')).toBe(true);
    expect(isDayHeader('Niedziela')).toBe(true);
  });

  it('detects English day names', () => {
    expect(isDayHeader('Monday')).toBe(true);
    expect(isDayHeader('Tuesday')).toBe(true);
    expect(isDayHeader('Sunday')).toBe(true);
  });

  it('detects "Day 1" / "Dzień 1" format', () => {
    expect(isDayHeader('Day 1')).toBe(true);
    expect(isDayHeader('Day 3')).toBe(true);
    expect(isDayHeader('Dzień 1')).toBe(true);
    expect(isDayHeader('Dzień 2')).toBe(true);
  });

  it('detects training/rest day labels', () => {
    expect(isDayHeader('Dzień treningowy')).toBe(true);
    expect(isDayHeader('Dzień odpoczynku')).toBe(true);
    expect(isDayHeader('Training Day')).toBe(true);
    expect(isDayHeader('Rest Day')).toBe(true);
  });

  it('does NOT flag meal names or food items', () => {
    expect(isDayHeader('Chicken breast')).toBe(false);
    expect(isDayHeader('Owsianka z bananem')).toBe(false);
    expect(isDayHeader('350 kcal')).toBe(false);
    expect(isDayHeader('')).toBe(false);
  });

  it('handles whitespace', () => {
    expect(isDayHeader('  Monday  ')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// extractNumber
// ═══════════════════════════════════════════════════════════

describe('extractNumber', () => {
  it('extracts plain numbers', () => {
    expect(extractNumber(350)).toBe(350);
    expect(extractNumber('350')).toBe(350);
  });

  it('extracts numbers with units', () => {
    expect(extractNumber('350 kcal')).toBe(350);
    expect(extractNumber('25g')).toBe(25);
    expect(extractNumber('12.5g')).toBe(13); // rounded
  });

  it('handles comma as decimal separator', () => {
    expect(extractNumber('12,5')).toBe(13); // rounded
  });

  it('returns null for empty/null/undefined', () => {
    expect(extractNumber(null)).toBeNull();
    expect(extractNumber(undefined)).toBeNull();
    expect(extractNumber('')).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(extractNumber('abc')).toBeNull();
  });

  it('handles zero', () => {
    expect(extractNumber(0)).toBe(0);
    expect(extractNumber('0')).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// findHeaderRow
// ═══════════════════════════════════════════════════════════

describe('findHeaderRow', () => {
  it('finds header with Polish macro keywords', () => {
    const rows = [
      ['Posiłek', 'Kalorie', 'Białko', 'Węglowodany', 'Tłuszcz'],
      ['Owsianka', 350, 25, 40, 12],
    ];
    expect(findHeaderRow(rows)).toBe(0);
  });

  it('finds header with English macro keywords', () => {
    const rows = [
      ['Meal', 'Calories', 'Protein', 'Carbs', 'Fat'],
      ['Oats', 350, 25, 40, 12],
    ];
    expect(findHeaderRow(rows)).toBe(0);
  });

  it('finds header row when not first row', () => {
    const rows = [
      ['Diet Plan - Week 1'],
      [],
      ['Meal', 'kcal', 'Protein', 'Carbs', 'Fat'],
      ['Oats', 350, 25, 40, 12],
    ];
    expect(findHeaderRow(rows)).toBe(2);
  });

  it('returns -1 when no header found', () => {
    const rows = [
      ['Owsianka', 'z bananem'],
      ['Kurczak', 'z ryżem'],
    ];
    expect(findHeaderRow(rows)).toBe(-1);
  });

  it('requires at least 2 macro keywords', () => {
    const rows = [
      ['Meal', 'Kalorie'], // only 1 macro keyword
    ];
    expect(findHeaderRow(rows)).toBe(-1);
  });
});

// ═══════════════════════════════════════════════════════════
// detectColumns
// ═══════════════════════════════════════════════════════════

describe('detectColumns', () => {
  it('detects Polish column headers', () => {
    const header = ['Nazwa posiłku', 'Opis', 'Kalorie', 'Białko', 'Węglowodany', 'Tłuszcz'];
    const map = detectColumns(header);
    expect(map.title).toBe(0);
    expect(map.description).toBe(1);
    expect(map.calories).toBe(2);
    expect(map.protein).toBe(3);
    expect(map.carbs).toBe(4);
    expect(map.fat).toBe(5);
  });

  it('detects English column headers', () => {
    const header = ['Meal Name', 'Description', 'Calories', 'Protein', 'Carbs', 'Fat'];
    const map = detectColumns(header);
    expect(map.title).toBe(0);
    expect(map.description).toBe(1);
    expect(map.calories).toBe(2);
    expect(map.protein).toBe(3);
    expect(map.carbs).toBe(4);
    expect(map.fat).toBe(5);
  });

  it('handles kcal as calorie label', () => {
    const header = ['Danie', 'kcal', 'Białko'];
    const map = detectColumns(header);
    expect(map.calories).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════
// parseMealRow
// ═══════════════════════════════════════════════════════════

describe('parseMealRow', () => {
  it('parses row with column map', () => {
    const colMap = { title: 0, description: 1, calories: 2, protein: 3, carbs: 4, fat: 5, mealType: -1 };
    const row = ['Owsianka z bananem', 'Płatki owsiane, banan, mleko', 350, 25, 40, 12];
    const meal = parseMealRow(row, colMap, 'breakfast');
    expect(meal.title).toBe('Owsianka z bananem');
    expect(meal.description).toBe('Płatki owsiane, banan, mleko');
    expect(meal.calories).toBe(350);
    expect(meal.proteinG).toBe(25);
    expect(meal.carbsG).toBe(40);
    expect(meal.fatG).toBe(12);
    expect(meal.mealType).toBe('breakfast');
  });

  it('parses row without column map (positional)', () => {
    const row = ['Chicken and rice', 'Grilled chicken, brown rice', 450, 35, 50, 10];
    const meal = parseMealRow(row, null, 'lunch');
    expect(meal.title).toBe('Chicken and rice');
    expect(meal.calories).toBe(450);
    expect(meal.proteinG).toBe(35);
    expect(meal.mealType).toBe('lunch');
  });

  it('detects meal type from title', () => {
    const row = ['Śniadanie: Owsianka', '', 350, 25, 40, 12];
    const meal = parseMealRow(row, null, 'dinner');
    expect(meal.mealType).toBe('breakfast'); // detected from title, overrides default
  });

  it('handles missing macro values', () => {
    const row = ['Sałatka', 'Pomidory, ogórki'];
    const meal = parseMealRow(row, null, 'lunch');
    expect(meal.title).toBe('Sałatka');
    expect(meal.calories).toBeNull();
    expect(meal.proteinG).toBeNull();
  });

  it('generates unique IDs', () => {
    const row = ['Meal A'];
    const meal1 = parseMealRow(row, null, 'breakfast');
    const meal2 = parseMealRow(row, null, 'breakfast');
    expect(meal1.id).not.toBe(meal2.id);
  });
});

// ═══════════════════════════════════════════════════════════
// parseDayFromRows
// ═══════════════════════════════════════════════════════════

describe('parseDayFromRows', () => {
  it('parses rows with header into meals', () => {
    const rows = [
      ['Posiłek', 'Kalorie', 'Białko'],
      ['Owsianka', 350, 25],
      ['Kurczak z ryżem', 450, 35],
    ];
    const day = parseDayFromRows(rows, 'Monday');
    expect(day.dayLabel).toBe('Monday');
    expect(day.meals).toHaveLength(2);
    expect(day.meals[0].title).toBe('Owsianka');
    expect(day.meals[0].calories).toBe(350);
  });

  it('skips standalone meal type labels', () => {
    const rows = [
      ['Śniadanie'],          // standalone label — should be skipped
      ['Owsianka', '', 350],   // actual meal
      ['Obiad'],               // standalone label
      ['Kurczak', '', 450],    // actual meal
    ];
    const day = parseDayFromRows(rows, 'Day 1');
    expect(day.meals).toHaveLength(2);
    expect(day.meals[0].title).toBe('Owsianka');
    expect(day.meals[1].title).toBe('Kurczak');
  });

  it('returns empty meals for empty rows', () => {
    const rows: unknown[][] = [[], [], []];
    const day = parseDayFromRows(rows, 'Day 1');
    expect(day.meals).toHaveLength(0);
  });

  it('assigns meal types from cycle when not detected', () => {
    const rows = [
      ['Meal A'],
      ['Meal B'],
      ['Meal C'],
      ['Meal D'],
    ];
    const day = parseDayFromRows(rows, 'Day 1');
    expect(day.meals[0].mealType).toBe('breakfast');
    expect(day.meals[1].mealType).toBe('lunch');
    expect(day.meals[2].mealType).toBe('snack');
    expect(day.meals[3].mealType).toBe('dinner');
  });
});

// ═══════════════════════════════════════════════════════════
// computeDayMacros
// ═══════════════════════════════════════════════════════════

describe('computeDayMacros', () => {
  it('sums all macros across meals', () => {
    const day: NutritionPlanDay = {
      id: '1', dayLabel: 'Mon', sortOrder: 0, notes: '',
      meals: [
        { id: '1', mealType: 'breakfast', title: 'A', description: '', calories: 300, proteinG: 20, carbsG: 30, fatG: 10, sortOrder: 0 },
        { id: '2', mealType: 'lunch', title: 'B', description: '', calories: 500, proteinG: 35, carbsG: 50, fatG: 15, sortOrder: 1 },
      ],
    };
    const macros = computeDayMacros(day);
    expect(macros.calories).toBe(800);
    expect(macros.protein).toBe(55);
    expect(macros.carbs).toBe(80);
    expect(macros.fat).toBe(25);
  });

  it('treats null macros as zero', () => {
    const day: NutritionPlanDay = {
      id: '1', dayLabel: 'Mon', sortOrder: 0, notes: '',
      meals: [
        { id: '1', mealType: 'breakfast', title: 'A', description: '', calories: 300, proteinG: null, carbsG: null, fatG: null, sortOrder: 0 },
        { id: '2', mealType: 'lunch', title: 'B', description: '', calories: null, proteinG: 25, carbsG: null, fatG: 10, sortOrder: 1 },
      ],
    };
    const macros = computeDayMacros(day);
    expect(macros.calories).toBe(300);
    expect(macros.protein).toBe(25);
    expect(macros.carbs).toBe(0);
    expect(macros.fat).toBe(10);
  });

  it('returns zeros for empty day', () => {
    const day: NutritionPlanDay = {
      id: '1', dayLabel: 'Mon', sortOrder: 0, notes: '',
      meals: [],
    };
    const macros = computeDayMacros(day);
    expect(macros.calories).toBe(0);
    expect(macros.protein).toBe(0);
    expect(macros.carbs).toBe(0);
    expect(macros.fat).toBe(0);
  });
});
