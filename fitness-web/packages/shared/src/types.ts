export type FoodEntry = {
  id?: string;
  date: string;
  meal: "breakfast" | "lunch" | "dinner" | "snacks";
  name: string;
  qty: number;
  unit: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  source?: "manual" | "ai";
  createdAt?: number;
};
