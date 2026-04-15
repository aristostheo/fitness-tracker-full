// services/ai/macroCompletion.ts
// Drop-in ✅
// Calls your existing HTTPS Cloud Function: describe (onRequest)
// Requires: firebase/auth for ID token

import { getAuth } from "firebase/auth";

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // optional secondaries (safe to omit)
  sugarTotal?: number;
  fiber?: number;
  sodiumMg?: number;
  satFat?: number;
};

export type DietPreferencesShape = {
  restrictions?: string[];
  allergies?: string[];
  dislikes?: string[];
  likes?: string[];
  moreOf?: string[];
  avoidLimit?: string[];
  notes?: string;
  updatedAt?: number;
};

export type MacroCompletionSuggestion = {
  id: string;
  label: string; // "1 meal + 1 snack"
  foods: string[]; // no recipes
  macros: { calories: number; protein: number; carbs: number; fat: number };
  tags: string[]; // "high_protein", "higher_fiber", ...
  notes?: string;
};

export type MacroCompletionResponse = {
  v: 1;
  date: string;
  remaining: { calories: number; protein: number; carbs: number; fat: number };
  preferencesUsed?: DietPreferencesShape;
  quotaUsed?: number;
  quotaLimit?: number;
  suggestions: MacroCompletionSuggestion[];
  rationale: string;
};

function getDescribeUrl() {
  // ✅ set one of these in your app env
  const fromEnv =
    process.env.AI_DESCRIBE_URL || process.env.FUNCTIONS_DESCRIBE_URL;

  if (fromEnv) return String(fromEnv);

  // If you already have your own helper, replace this function entirely.
  // This fallback forces you to define an env var so you don't accidentally call a wrong URL.
  throw new Error(
    "Missing DESCRIBE_URL. Set it to your Cloud Function URL for describe.",
  );
}

export async function fetchMacroCompletion(args: {
  dateISO: string;
  totals: MacroTotals;
  goals: MacroTotals;
  dietPreferences?: DietPreferencesShape | null;
  count?: number; // 2..4
  seed?: string | number;
  nonce?: string | number;
  forceNew?: boolean;
  lockedSuggestionIds?: string[]; // keep these
  swapIndex?: number | null; // swap just one slot
}): Promise<MacroCompletionResponse> {
  const auth = getAuth();
  const u = auth.currentUser;
  if (!u) throw new Error("not-signed-in");

  const token = await u.getIdToken();

  const body: Record<string, any> = {
    mode: "macro_completion:v1",
    date: args.dateISO,
    goals: args.goals,
    totals: args.totals,
    dietPreferences: args.dietPreferences ?? null,
    count: args.count ?? 3,
    forceNew: !!args.forceNew,
    lockedSuggestionIds: args.lockedSuggestionIds ?? [],
    swapIndex:
      typeof args.swapIndex === "number" ? Math.max(0, args.swapIndex) : null,
  };
  const seed = args.seed != null ? String(args.seed) : "";
  if (seed) body.seed = seed;
  const nonce = args.nonce != null ? String(args.nonce) : "";
  if (nonce) body.nonce = nonce;

  const rsp = await fetch(getDescribeUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await rsp.text();
  if (!rsp.ok)
    throw new Error(`describe_http_${rsp.status}:${text.slice(0, 220)}`);

  const json = JSON.parse(text);
  return json as MacroCompletionResponse;
}
