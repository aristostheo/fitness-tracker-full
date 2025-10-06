// src/utils/nutritionMath.js

// Scale base nutrients by qty & unit (per 1 serving OR per 100 g/ml)
export function scaleNutrients(base, qty, unit) {
  const isWeight = unit?.toLowerCase() === "g" || unit?.toLowerCase() === "ml";
  const factor = isWeight ? (Number(qty) || 0) / 100 : Number(qty) || 1;
  const n = (v) => Math.round((Number(v) || 0) * factor);
  return {
    calories: n(base.calories),
    protein: n(base.protein),
    carbs: n(base.carbs),
    fat: n(base.fat),
    sugar: n(base.sugar),
    fiber: n(base.fiber),
  };
}

// Inverse: from totals + portion to "base per 1 serving" or "per 100 g/ml"
export function unscaleFromTotals(totals, qty, unit) {
  const isWeight = unit?.toLowerCase() === "g" || unit?.toLowerCase() === "ml";
  const q = Number(qty) || 1;
  const factor = isWeight ? q / 100 : q;
  const d = (v) => (factor ? Math.round((Number(v) || 0) / factor) : 0);
  return {
    calories: d(totals.calories),
    protein: d(totals.protein),
    carbs: d(totals.carbs),
    fat: d(totals.fat),
    sugar: d(totals.sugar),
    fiber: d(totals.fiber),
  };
}
