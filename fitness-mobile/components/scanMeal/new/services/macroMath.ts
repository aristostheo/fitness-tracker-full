// components/scanMeal/new/services/macroMath.ts
import type {
  DetectedFood,
  MacroTotals,
} from "@/components/scanMeal/new/types";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function computeTotals(foods: DetectedFood[]): MacroTotals {
  let calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0;
  let fiber = 0,
    sugar = 0,
    sodiumMg = 0,
    satFat = 0;

  for (const f of foods) {
    const m: any = f.macros ?? {};
    calories += m.calories ?? 0;
    protein += m.protein ?? 0;
    carbs += m.carbs ?? 0;
    fat += m.fat ?? 0;

    fiber += m.fiber ?? 0;
    sugar += m.sugar ?? 0;
    sodiumMg += m.sodiumMg ?? 0;
    satFat += m.satFat ?? 0;
  }

  return {
    calories: Math.round(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    fiber: fiber ? round1(fiber) : undefined,
    sugar: sugar ? round1(sugar) : undefined,
    sodiumMg: sodiumMg ? Math.round(sodiumMg) : undefined,
    satFat: satFat ? round1(satFat) : undefined,
  };
}
