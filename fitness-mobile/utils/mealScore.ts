// src/utils/mealScore.ts
export type MealLike = {
  calories?: number | string;
  protein?: number | string; // g
  carbs?: number | string; // g
  fat?: number | string; // g
  fiber?: number | string; // g (optional)
  sugar?: number | string; // g (optional)
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const n = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/**
 * Deterministic 0–100 "healthy meal" score.
 * Weights:
 * - Protein energy % (ideal ~25–35%) .......... 0.30
 * - Fiber density (≥14g / 1000 kcal) .......... 0.20
 * - Sugar energy % (≤10%) ..................... 0.20
 * - Fat energy % (penalize >40%) .............. 0.15
 * - Calorie window per meal (350–800 kcal) .... 0.15
 */
export function computeMealScore(meal: Partial<MealLike>): number {
  const cal = Math.max(0, n(meal.calories));
  const p = Math.max(0, n(meal.protein));
  const c = Math.max(0, n(meal.carbs));
  const f = Math.max(0, n(meal.fat));
  const fiber = Math.max(0, n(meal.fiber));
  const sugar = Math.max(0, n(meal.sugar));

  if (cal <= 0) return 50; // neutral when unknown

  const kcalP = p * 4;
  const kcalC = c * 4;
  const kcalF = f * 9;

  // Protein % of calories – best in ~25–35% band
  const pctP = clamp01(kcalP / Math.max(cal, 1));
  const proteinScore =
    // triangle peak at 0.30, drops to 0 at 0.10 and 0.50
    clamp01(1 - Math.abs(pctP - 0.3) / 0.2);

  // Fiber density – 14 g per 1000 kcal standard
  const fiberPer1k = (fiber / Math.max(cal, 1)) * 1000;
  const fiberScore = clamp01(fiberPer1k / 14);

  // Sugar % of calories – penalize above 10%
  const pctSugar = clamp01((sugar * 4) / Math.max(cal, 1));
  const sugarScore = clamp01(1 - pctSugar / 0.1);

  // Fat % of calories – soft penalty above ~40%
  const pctF = clamp01(kcalF / Math.max(cal, 1));
  const fatScore = pctF <= 0.4 ? 1 : clamp01(1 - (pctF - 0.4) / 0.3); // 40–70% falls to 0

  // Calorie window – sweet spot 350–800 kcal
  const calorieScore = (() => {
    if (cal >= 350 && cal <= 800) return 1;
    if (cal < 350) return clamp01(1 - (350 - cal) / 250); // 100–350 ramps 0→1
    return clamp01(1 - (cal - 800) / 400); // 800–1200 ramps 1→0
  })();

  const score01 =
    0.3 * proteinScore +
    0.2 * fiberScore +
    0.2 * sugarScore +
    0.15 * fatScore +
    0.15 * calorieScore;

  return Math.round(score01 * 100);
}
