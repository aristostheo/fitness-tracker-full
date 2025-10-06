// utils/nutritionMath.ts
export type Nutrients = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
};

export function scaleNutrients(base: Nutrients, qty: number, unit: string) {
  const isWeight = unit?.toLowerCase() === "g" || unit?.toLowerCase() === "ml";
  const factor = isWeight ? (Number(qty) || 0) / 100 : Number(qty) || 1;
  const n = (v?: number) => Math.round((Number(v) || 0) * factor);
  return {
    calories: n(base.calories),
    protein: n(base.protein),
    carbs: n(base.carbs),
    fat: n(base.fat),
    sugar: n(base.sugar),
    fiber: n(base.fiber),
  };
}

export function unscaleFromTotals(
  totals: Nutrients,
  qty: number,
  unit: string
) {
  const isWeight = unit?.toLowerCase() === "g" || unit?.toLowerCase() === "ml";
  const q = Number(qty) || 1;
  const factor = isWeight ? q / 100 : q; // totals = base * factor
  const d = (v?: number) =>
    factor ? Math.round((Number(v) || 0) / factor) : 0;
  return {
    calories: d(totals.calories),
    protein: d(totals.protein),
    carbs: d(totals.carbs),
    fat: d(totals.fat),
    sugar: d(totals.sugar),
    fiber: d(totals.fiber),
  };
}
