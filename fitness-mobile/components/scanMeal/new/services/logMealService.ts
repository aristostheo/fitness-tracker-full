// components/scanMeal/services/logMealService.ts
// Drop-in logging stub.
// Replace with your Firestore / backend logging.
// Keep interface stable so UI stays unchanged.

import type {
  DetectedFood,
  MacroTotals,
} from "@/components/scanMeal/new/types";

export async function logMeal(payload: {
  photoUri?: string;
  foods: DetectedFood[];
  totals: MacroTotals;
  notes?: string;
  createdAt: string;
}): Promise<void> {
  // ✅ Replace with real logging, e.g. Firestore:
  // await addDoc(collection(db, "nutrition"), { ...payload, type:"meal_scan" })

  // simulate latency
  await new Promise((r) => setTimeout(r, 500));

  // no-op
  return;
}
