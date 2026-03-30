import { describe, it, expect } from 'vitest';
import { parseRawTextToNutritionPlan } from '../ai-nutrition-review';

// Only testing the pure parseRawTextToNutritionPlan function
// (aiReviewNutritionPlan requires Supabase, so it's an integration test)

describe('parseRawTextToNutritionPlan', () => {
  it('parses simple text with day headers and meals', () => {
    const text = `
Poniedziałek
Śniadanie: Owsianka z bananem
Obiad: Kurczak z ryżem i brokułami
Kolacja: Sałatka z tuńczykiem

Wtorek
Śniadanie: Jajecznica z tostami
Obiad: Makaron z sosem bolognese
Kolacja: Zupa pomidorowa
    `.trim();

    const plan = parseRawTextToNutritionPlan(text, 'Test Plan');
    expect(plan.title).toBe('Test Plan');
    expect(plan.days).toHaveLength(2);
    expect(plan.days[0].dayLabel).toBe('Poniedziałek');
    expect(plan.days[0].meals).toHaveLength(3);
    expect(plan.days[0].meals[0].mealType).toBe('breakfast');
    expect(plan.days[0].meals[1].mealType).toBe('lunch');
    expect(plan.days[0].meals[2].mealType).toBe('dinner');
    expect(plan.days[1].dayLabel).toBe('Wtorek');
    expect(plan.days[1].meals).toHaveLength(3);
  });

  it('extracts meal name after colon in meal type label', () => {
    const text = `
Poniedziałek
Śniadanie: Owsianka z miodem
    `.trim();

    const plan = parseRawTextToNutritionPlan(text, 'Test');
    expect(plan.days[0].meals[0].title).toBe('Owsianka z miodem');
    expect(plan.days[0].meals[0].mealType).toBe('breakfast');
  });

  it('creates default day when no day header found', () => {
    const text = `
Śniadanie: Jajka na miękko
Obiad: Ryba z warzywami
    `.trim();

    const plan = parseRawTextToNutritionPlan(text, 'Test');
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].dayLabel).toBe('Day 1');
    expect(plan.days[0].meals.length).toBeGreaterThanOrEqual(1);
  });

  it('handles English day names and meal types', () => {
    const text = `
Monday
Breakfast: Oatmeal with fruits
Lunch: Grilled chicken salad
Dinner: Salmon with vegetables
    `.trim();

    const plan = parseRawTextToNutritionPlan(text, 'English Plan');
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].dayLabel).toBe('Monday');
    expect(plan.days[0].meals).toHaveLength(3);
    expect(plan.days[0].meals[0].mealType).toBe('breakfast');
  });

  it('handles pre-workout and post-workout meals', () => {
    const text = `
Poniedziałek
Przed treningiem: Banan z masłem orzechowym
Po treningu: Shake proteinowy
    `.trim();

    const plan = parseRawTextToNutritionPlan(text, 'Test');
    expect(plan.days[0].meals).toHaveLength(2);
    expect(plan.days[0].meals[0].mealType).toBe('pre-workout');
    expect(plan.days[0].meals[1].mealType).toBe('post-workout');
  });

  it('returns plan with at least 1 day for non-empty text', () => {
    const text = 'Owsianka z bananem i miodem';
    const plan = parseRawTextToNutritionPlan(text, 'Simple');
    expect(plan.days.length).toBeGreaterThanOrEqual(1);
  });

  it('generates unique IDs', () => {
    const text = `
Monday
Breakfast: Oats
Lunch: Chicken
    `.trim();

    const plan = parseRawTextToNutritionPlan(text, 'Test');
    const allIds = [
      plan.id,
      ...plan.days.map(d => d.id),
      ...plan.days.flatMap(d => d.meals.map(m => m.id)),
    ];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('sets all macros to null (raw text has no structured data)', () => {
    const text = `
Monday
Breakfast: Oats
    `.trim();

    const plan = parseRawTextToNutritionPlan(text, 'Test');
    const meal = plan.days[0].meals[0];
    expect(meal.calories).toBeNull();
    expect(meal.proteinG).toBeNull();
    expect(meal.carbsG).toBeNull();
    expect(meal.fatG).toBeNull();
  });

  it('handles empty text gracefully', () => {
    const plan = parseRawTextToNutritionPlan('', 'Empty');
    expect(plan.title).toBe('Empty');
    // May have 0 or 1 days depending on implementation
    expect(plan.days.length).toBeLessThanOrEqual(1);
  });
});
