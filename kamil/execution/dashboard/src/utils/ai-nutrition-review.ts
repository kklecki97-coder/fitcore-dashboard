import { supabase } from '../lib/supabase';
import type { NutritionPlan } from '../types';

/**
 * Use AI to review and structure an imported nutrition plan.
 * Handles messy DOCX/Excel imports where meals, macros, and day structure
 * may not be cleanly parsed.
 */
export async function aiReviewNutritionPlan(plan: NutritionPlan, rawText?: string): Promise<NutritionPlan> {
  // Build compact representation for AI
  const planData = {
    title: plan.title,
    days: plan.days.map(day => ({
      dayLabel: day.dayLabel,
      notes: day.notes,
      meals: day.meals.map(m => ({
        mealType: m.mealType,
        title: m.title,
        description: m.description,
        calories: m.calories,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
      })),
    })),
  };

  const systemPrompt = `You are a nutrition plan parser and structurer for a fitness coaching app. You will receive a nutrition plan that was imported from a file (Excel, DOCX, or raw text). The data may be messy, incomplete, or poorly structured.

Your job: Clean up and structure the plan properly.

Tasks:
1. **Fix meal types**: Assign correct meal types (breakfast, lunch, dinner, snack, pre-workout, post-workout) based on context, time of day, or position in the day
2. **Clean titles**: If a meal title contains the meal type label (e.g. "Śniadanie: Owsianka z owocami"), extract just the meal name ("Owsianka z owocami") and set the correct mealType
3. **Extract macros**: If macros are mentioned in the title or description but not in the numeric fields, extract them (calories, protein_g, carbs_g, fat_g)
4. **Split merged meals**: If one "meal" actually contains multiple meals (e.g. "Śniadanie: X / Obiad: Y"), split them into separate meals
5. **Fix day labels**: Clean up day labels to be consistent (e.g. "Poniedziałek", "Monday", "Day 1")
6. **Suggest a plan title**: Based on the content, suggest a clean professional plan title
7. **Detect plan type**: Suggest if this is 'strict' (exact meals/portions), 'flexible' (options/alternatives mentioned), or 'guidelines' (general advice)
8. **Preserve ALL content**: Never remove meal descriptions, notes, or instructions. These are valuable coaching content.

${rawText ? `\nRAW TEXT FROM FILE (use this for additional context if the structured data is incomplete):\n${rawText.slice(0, 4000)}` : ''}

Return JSON in this exact format:
{
  "planTitle": "Clean Plan Title",
  "planType": "strict" | "flexible" | "guidelines",
  "days": [
    {
      "dayLabel": "Monday",
      "notes": "any day-level notes",
      "meals": [
        {
          "mealType": "breakfast",
          "title": "Clean meal name",
          "description": "Ingredients, instructions, notes — preserve everything",
          "calories": 350 or null,
          "proteinG": 25 or null,
          "carbsG": 40 or null,
          "fatG": 12 or null
        }
      ]
    }
  ]
}

Important:
- Keep the same language as the original (Polish or English)
- If macros are not mentioned anywhere, leave them as null — DO NOT invent numbers
- If the plan only has 1 day but mentions it's a "daily plan" or "plan na każdy dzień", that's fine — keep it as 1 day
- Meal descriptions should include all original detail (ingredients, portions, cooking instructions, alternatives)`;

  const userMessage = JSON.stringify(planData, null, 2);

  try {
    const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
      body: {
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        temperature: 0,
        max_tokens: 8000,
      },
    });

    if (error || data?.error) {
      console.error('AI nutrition review failed:', error || data?.error);
      return plan;
    }

    const text = (data?.content?.[0]?.text || '').trim();
    if (!text) return plan;

    const jsonStr = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const result = JSON.parse(jsonStr);

    // Validate AI response structure
    if (!result.days || !Array.isArray(result.days)) return plan;

    const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout'];
    const VALID_PLAN_TYPES = ['strict', 'flexible', 'guidelines'];

    const validatedPlanType = VALID_PLAN_TYPES.includes(result.planType) ? result.planType : plan.type;

    // Build reviewed plan
    const reviewed: NutritionPlan = {
      ...plan,
      title: result.planTitle || plan.title,
      type: validatedPlanType,
      days: result.days.map((aiDay: { dayLabel: string; notes?: string; meals?: { mealType?: string; title?: string; description?: string; calories?: number | null; proteinG?: number | null; carbsG?: number | null; fatG?: number | null }[] }, di: number) => ({
        id: plan.days[di]?.id || crypto.randomUUID(),
        dayLabel: aiDay.dayLabel || `Day ${di + 1}`,
        sortOrder: di,
        notes: aiDay.notes || '',
        meals: (aiDay.meals || []).map((aiMeal, mi: number) => ({
          id: plan.days[di]?.meals[mi]?.id || crypto.randomUUID(),
          mealType: VALID_MEAL_TYPES.includes(aiMeal.mealType || '') ? aiMeal.mealType : 'snack',
          title: aiMeal.title || '',
          description: aiMeal.description || '',
          calories: aiMeal.calories ?? null,
          proteinG: aiMeal.proteinG ?? null,
          carbsG: aiMeal.carbsG ?? null,
          fatG: aiMeal.fatG ?? null,
          sortOrder: mi,
        })),
      })),
    };

    return reviewed;
  } catch (err) {
    console.error('AI nutrition review parse error, returning original:', err);
    return plan;
  }
}

/**
 * Parse raw text (from DOCX or pasted text) into a rough NutritionPlan structure.
 * This does a best-effort parse — AI review should clean it up afterward.
 */
export function parseRawTextToNutritionPlan(text: string, title: string): NutritionPlan {
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

  const plan: NutritionPlan = {
    id: crypto.randomUUID(),
    title,
    description: '',
    type: 'flexible',
    isTemplate: false,
    clientIds: [],
    days: [],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };

  const DAY_PATTERNS = [
    /^poniedzia[łl]ek/i, /^wtorek/i, /^[sś]roda/i, /^czwartek/i, /^pi[aą]tek/i, /^sobota/i, /^niedziela/i,
    /^monday/i, /^tuesday/i, /^wednesday/i, /^thursday/i, /^friday/i, /^saturday/i, /^sunday/i,
    /^dzie[nń]\s*\d/i, /^day\s*\d/i, /^dzie[nń]\s*treningow/i, /^dzie[nń]\s*odpoczynk/i,
  ];

  const MEAL_PATTERNS = [
    { type: 'breakfast' as const, patterns: [/^śniadanie/i, /^sniadanie/i, /^breakfast/i, /^i\s*posi[łl]ek/i, /^1[\.\)]\s*posi[łl]ek/i] },
    { type: 'lunch' as const, patterns: [/^obiad/i, /^lunch/i, /^ii\s*posi[łl]ek/i, /^2[\.\)]\s*posi[łl]ek/i, /^drugie?\s*posi[łl]ek/i] },
    { type: 'dinner' as const, patterns: [/^kolacja/i, /^dinner/i, /^supper/i, /^iii\s*posi[łl]ek/i, /^3[\.\)]\s*posi[łl]ek/i] },
    { type: 'snack' as const, patterns: [/^przek[aą]ska/i, /^snack/i, /^podwieczorek/i, /^iv\s*posi[łl]ek/i, /^4[\.\)]\s*posi[łl]ek/i] },
    { type: 'pre-workout' as const, patterns: [/^przed\s*trening/i, /^pre[\s-]?workout/i] },
    { type: 'post-workout' as const, patterns: [/^po\s*trening/i, /^post[\s-]?workout/i] },
  ];

  type MealType = typeof MEAL_PATTERNS[number]['type'];

  let currentDay: typeof plan.days[0] | null = null;
  let currentMealType: MealType = 'breakfast';
  let currentMealLines: string[] = [];

  const flushMeal = () => {
    if (currentMealLines.length === 0 || !currentDay) return;
    const mealTitle = currentMealLines[0];
    const mealDesc = currentMealLines.slice(1).join('\n');
    currentDay.meals.push({
      id: crypto.randomUUID(),
      mealType: currentMealType,
      title: mealTitle,
      description: mealDesc,
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      sortOrder: currentDay.meals.length,
    });
    currentMealLines = [];
  };

  const flushDay = () => {
    flushMeal();
    if (currentDay && currentDay.meals.length > 0) {
      plan.days.push(currentDay);
    }
  };

  for (const line of lines) {
    // Check for day header
    const isDay = DAY_PATTERNS.some(p => p.test(line));
    if (isDay) {
      flushDay();
      currentDay = {
        id: crypto.randomUUID(),
        dayLabel: line.replace(/[:\-–—].*$/, '').trim(),
        sortOrder: plan.days.length,
        notes: '',
        meals: [],
      };
      currentMealType = 'breakfast';
      continue;
    }

    // Check for meal type header
    let foundMealType = false;
    for (const { type, patterns } of MEAL_PATTERNS) {
      if (patterns.some(p => p.test(line))) {
        flushMeal();
        currentMealType = type;
        // If there's content after the label (e.g. "Śniadanie: Owsianka"), keep it
        const afterLabel = line.replace(/^[^:\-–—]+[:\-–—]\s*/, '').trim();
        if (afterLabel && afterLabel !== line) {
          currentMealLines.push(afterLabel);
        }
        foundMealType = true;
        break;
      }
    }
    if (foundMealType) continue;

    // If no day started, create a default
    if (!currentDay) {
      currentDay = {
        id: crypto.randomUUID(),
        dayLabel: 'Day 1',
        sortOrder: 0,
        notes: '',
        meals: [],
      };
    }

    // Check if this looks like a new meal item (starts with bullet, number, dash, or is a short line)
    const isBullet = /^[\-\*•●◦▪]\s/.test(line) || /^\d+[\.\)]\s/.test(line);
    if (isBullet && currentMealLines.length > 0) {
      // This might be a sub-item — add to description
      currentMealLines.push(line.replace(/^[\-\*•●◦▪]\s*/, '').replace(/^\d+[\.\)]\s*/, ''));
    } else if (line.length > 0) {
      // If we have accumulated lines and this looks like a new item, flush first
      if (currentMealLines.length > 0 && !isBullet && line.length > 3) {
        // Heuristic: if the line is short and looks like a new meal name, start new meal
        const MEAL_CYCLE: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
        const nextType = MEAL_CYCLE[currentDay.meals.length % MEAL_CYCLE.length];
        flushMeal();
        currentMealType = nextType;
      }
      currentMealLines.push(line);
    }
  }

  flushDay();

  // If no days were created, put everything in one day
  if (plan.days.length === 0 && currentMealLines.length > 0) {
    currentDay = {
      id: crypto.randomUUID(),
      dayLabel: 'Day 1',
      sortOrder: 0,
      notes: '',
      meals: [{
        id: crypto.randomUUID(),
        mealType: 'breakfast',
        title: currentMealLines[0],
        description: currentMealLines.slice(1).join('\n'),
        calories: null, proteinG: null, carbsG: null, fatG: null,
        sortOrder: 0,
      }],
    };
    plan.days.push(currentDay);
  }

  return plan;
}
