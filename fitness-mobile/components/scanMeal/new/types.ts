// components/scanMeal/types.ts
export const DEFAULT_UNITS = ["g", "oz", "cups", "tbsp", "piece"] as const;
export type PortionUnit = (typeof DEFAULT_UNITS)[number];

export type Confidence = "high" | "medium" | "low" | "manual";

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;

  // optional advanced fields (supported for logging)
  fiber?: number;
  sugar?: number;
  sodiumMg?: number;
  satFat?: number;
};

export type FoodPortion = {
  amount: number; // shown to user
  unit: PortionUnit;
  multiplier: number; // scales macros: total = macros * multiplier
};

export type DetectedFood = {
  id: string;
  name: string;
  confidence: Confidence;
  portion: FoodPortion;

  // Macros for the base item; totals are computed by scaling with portion.multiplier
  macros: MacroTotals;

  rationale?: string;
  suggestions?: string[];
};

export type ScanMealResult = {
  foods: DetectedFood[];
  modelVersion?: string; // ✅ optional metadata from backend
  warnings?: string[]; // ✅ optional metadata from backend
};

export type ScanState =
  | "idle"
  | "photo_ready"
  | "analyzing"
  | "review"
  | "saving"
  | "success";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function roundTo(n: number, step: number) {
  const inv = 1 / step;
  return Math.round(n * inv) / inv;
}
