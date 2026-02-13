export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export type Macros = {
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
};

export type MealItem = {
  id: string;
  name: string;
  brand?: string;
  amount?: string; // "1 bowl", "250g", etc.
  mealType: MealType;
  timeISO: string; // date-time ISO string
  macros: Macros;
  notes?: string;
};

export type DayLog = {
  dateKey: string; // "YYYY-MM-DD" local
  meals: MealItem[];
  waterMl: number;
  waterGoalMl: number;
  macroGoals: Macros;
};
