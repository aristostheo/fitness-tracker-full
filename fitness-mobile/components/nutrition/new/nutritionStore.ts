import AsyncStorage from "@react-native-async-storage/async-storage";
import { DayLog, MealItem, MealType, Macros } from "./NutritionTypes";
import { dateKey } from "./utils";

const KEY_PREFIX = "nutrition:day:";

function defaultDay(dateKeyStr: string): DayLog {
  return {
    dateKey: dateKeyStr,
    meals: [],
    waterMl: 0,
    waterGoalMl: 2500,
    macroGoals: { calories: 2400, protein: 170, carbs: 260, fat: 70 },
  };
}

export async function loadDay(dateKeyStr?: string): Promise<DayLog> {
  const key = KEY_PREFIX + (dateKeyStr || dateKey(new Date()));
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return defaultDay(key.replace(KEY_PREFIX, ""));
  try {
    const parsed = JSON.parse(raw) as DayLog;
    return {
      ...defaultDay(parsed.dateKey),
      ...parsed,
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
    };
  } catch {
    return defaultDay(key.replace(KEY_PREFIX, ""));
  }
}

export async function saveDay(day: DayLog) {
  const key = KEY_PREFIX + day.dateKey;
  await AsyncStorage.setItem(key, JSON.stringify(day));
}

export function createMeal(params: {
  name: string;
  brand?: string;
  amount?: string;
  mealType: MealType;
  macros: Macros;
  notes?: string;
  at?: Date;
}): MealItem {
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const timeISO = (params.at ?? new Date()).toISOString();
  return {
    id,
    name: params.name.trim(),
    brand: params.brand?.trim() || undefined,
    amount: params.amount?.trim() || undefined,
    mealType: params.mealType,
    timeISO,
    macros: {
      calories: Number(params.macros.calories) || 0,
      protein: Number(params.macros.protein) || 0,
      carbs: Number(params.macros.carbs) || 0,
      fat: Number(params.macros.fat) || 0,
    },
    notes: params.notes?.trim() || undefined,
  };
}

export async function addMeal(dateKeyStr: string, meal: MealItem) {
  const day = await loadDay(dateKeyStr);
  day.meals = [meal, ...day.meals].sort((a, b) =>
    a.timeISO < b.timeISO ? 1 : -1
  );
  await saveDay(day);
  return day;
}

export async function deleteMeal(dateKeyStr: string, mealId: string) {
  const day = await loadDay(dateKeyStr);
  day.meals = day.meals.filter((m) => m.id !== mealId);
  await saveDay(day);
  return day;
}

export async function setWater(dateKeyStr: string, waterMl: number) {
  const day = await loadDay(dateKeyStr);
  day.waterMl = Math.max(0, Math.round(waterMl));
  await saveDay(day);
  return day;
}

export async function setGoals(
  dateKeyStr: string,
  macroGoals?: Macros,
  waterGoalMl?: number
) {
  const day = await loadDay(dateKeyStr);
  if (macroGoals) day.macroGoals = macroGoals;
  if (typeof waterGoalMl === "number")
    day.waterGoalMl = Math.max(500, Math.round(waterGoalMl));
  await saveDay(day);
  return day;
}
