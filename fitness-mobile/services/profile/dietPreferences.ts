// utils/dietPreferences.ts
// Drop-in ✅
// Calm, beginner-friendly dietary preferences model + helpers

export type DietRestriction =
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "halal"
  | "kosher"
  | "gluten_free"
  | "lactose_free"
  | "dairy_free"
  | "low_carb"
  | "keto"
  | "paleo";

export type Allergy =
  | "peanuts"
  | "tree_nuts"
  | "dairy"
  | "eggs"
  | "shellfish"
  | "fish"
  | "soy"
  | "wheat"
  | "sesame";

export type MoreOfGoal =
  | "protein"
  | "fiber"
  | "whole_foods"
  | "hydration"
  | "vegetables"
  | "omega_3"
  | "iron"
  | "calcium";

export type AvoidLimitGoal =
  | "added_sugar"
  | "fried_foods"
  | "processed_foods"
  | "sodium"
  | "alcohol"
  | "high_saturated_fat";

export type DietPreferences = {
  version: 1;

  // Simple pick lists (chips)
  restrictions: DietRestriction[];
  allergies: Allergy[];

  // User language (beginner-friendly)
  dislikes: string[]; // e.g. ["mushrooms", "olives"]
  likes: string[]; // e.g. ["chicken", "greek yogurt"]

  // Soft goals (non-judgmental)
  moreOf: MoreOfGoal[];
  avoidLimit: AvoidLimitGoal[];

  // Optional UX niceties
  notes?: string; // “I prefer simple meals” / “no spicy”
  updatedAt?: number; // Date.now()
};

export const DEFAULT_DIET_PREFERENCES: DietPreferences = {
  version: 1,
  restrictions: [],
  allergies: [],
  dislikes: [],
  likes: [],
  moreOf: [],
  avoidLimit: [],
  notes: "",
  updatedAt: undefined,
};

export function normalizeToken(s: string) {
  return (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[,.\-–—\s]+|[,.\-–—\s]+$/g, "");
}

export function uniqTokens(arr: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of arr || []) {
    const t = normalizeToken(raw);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function clampList<T>(arr: T[], max = 50) {
  return (arr || []).slice(0, max);
}

export function computeDietPrefsCompletion(p?: DietPreferences | null) {
  const v = p || DEFAULT_DIET_PREFERENCES;

  const hasRestrictions = (v.restrictions?.length || 0) > 0;
  const hasAllergies = (v.allergies?.length || 0) > 0;
  const hasDislikes = (v.dislikes?.length || 0) > 0;
  const hasLikes = (v.likes?.length || 0) > 0;
  const hasMore = (v.moreOf?.length || 0) > 0;
  const hasAvoid = (v.avoidLimit?.length || 0) > 0;

  const buckets = [
    hasRestrictions,
    hasAllergies,
    hasDislikes,
    hasLikes,
    hasMore,
    hasAvoid,
  ];

  const filled = buckets.filter(Boolean).length;
  const total = buckets.length;
  const pct = total ? filled / total : 0;

  const state: "empty" | "partial" | "complete" =
    filled === 0 ? "empty" : filled >= 4 ? "complete" : "partial";

  return { filled, total, pct, state };
}

export function summarizeDietPrefs(p?: DietPreferences | null) {
  const v = p || DEFAULT_DIET_PREFERENCES;
  const r = v.restrictions?.length || 0;
  const a = v.allergies?.length || 0;
  const d = v.dislikes?.length || 0;
  const l = v.likes?.length || 0;

  if (r + a + d + l === 0) return "Personalize meal suggestions";
  const parts: string[] = [];
  if (r) parts.push(`${r} restriction${r === 1 ? "" : "s"}`);
  if (a) parts.push(`${a} allerg${a === 1 ? "y" : "ies"}`);
  if (d) parts.push(`${d} dislike${d === 1 ? "" : "s"}`);
  if (l) parts.push(`${l} favorite${l === 1 ? "" : "s"}`);
  return parts.slice(0, 3).join(" · ");
}
