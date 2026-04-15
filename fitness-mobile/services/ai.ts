// services/ai.ts
import { getAuth } from "firebase/auth";

const AI_URL = process.env.AI_PARSE_URL;

export type AiMealResponse = {
  suggestedName: string | null;
  qty: number | null;
  unit: string | null; // "serving" | "g" | "ml" | etc
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    fiber: number;
  };
};

export async function parseMealRemote(
  text: string,
  opts?: { qty?: number | null; unit?: string | null },
): Promise<AiMealResponse> {
  console.log("AI_URL =", process.env.AI_PARSE_URL);

  if (!AI_URL) throw new Error("Missing AI_PARSE_URL");

  const token = await getAuth().currentUser?.getIdToken?.();

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      text,
      qty: opts?.qty ?? null,
      unit: opts?.unit ?? null,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data?.totals) {
    throw new Error(data?.error || "AI parse failed");
  }
  return data as AiMealResponse;
}
