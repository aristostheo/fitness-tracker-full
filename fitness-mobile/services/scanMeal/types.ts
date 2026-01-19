// services/scanMeal/types.ts
export type Confidence = "high" | "med" | "low" | "manual";

export type Macro = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodiumMg?: number;
  satFat?: number;
};

export type Portion = {
  amount: number; // displayed amount
  unit: "g" | "oz" | "cups" | "tbsp" | "piece";
  multiplier: number; // used to scale macros; update strategy later if you normalize per 100g
};

export type DetectedFood = {
  id: string;
  name: string;
  confidence: Confidence;
  portion: Portion;
  macros: Macro; // per base serving (demo)
  suggestions?: string[];
};

export type ScanMealResult = {
  foods: DetectedFood[];
  modelVersion?: string;
  warnings?: string[];
};

export type MacroTotals = Required<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodiumMg: number;
  satFat: number;
}>;
