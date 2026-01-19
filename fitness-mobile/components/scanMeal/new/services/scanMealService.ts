// components/scanMeal/new/services/scanMealService.ts
// Adapter layer ✅
// Converts backend scan result (services/scanMeal/types) -> new UI types (components/scanMeal/new/types)
// Fixes confidence mismatch ("med" -> "medium") and normalizes portion/macro shapes.

import type {
  ScanMealResult as UiScanMealResult,
  DetectedFood as UiDetectedFood,
  Confidence as UiConfidence,
  PortionUnit as UiPortionUnit,
} from "@/components/scanMeal/new/types";

// backend types
import type {
  ScanMealResult as BackendScanMealResult,
  DetectedFood as BackendDetectedFood,
  Confidence as BackendConfidence,
} from "@/services/scanMeal/types";

import { mockScanMealFromImage } from "@/services/scanMeal/scanMealService";

const VALID_UNITS: UiPortionUnit[] = ["g", "oz", "cups", "tbsp", "piece"];

export async function scanMealFromImage(
  photoUri: string
): Promise<UiScanMealResult> {
  const backend: BackendScanMealResult = await mockScanMealFromImage(photoUri);
  return mapBackendResultToUi(backend);
}

function mapBackendResultToUi(res: BackendScanMealResult): UiScanMealResult {
  return {
    foods: (res.foods ?? []).map(mapBackendFoodToUi),
  };
}

function mapBackendFoodToUi(f: BackendDetectedFood): UiDetectedFood {
  const amount = safeNumber(f.portion?.amount, 1);
  const unit = normalizeUnit(String(f.portion?.unit ?? "g"));
  //   const multiplier = safeNumber(
  //     // backend sometimes uses multiplier; if missing, use amount as old screen did
  //     (f as any)?.portion?.multiplier,
  //     amount
  //   );

  const m: any = f.macros ?? {};

  return {
    id: String(
      f.id ?? `food_${Date.now()}_${Math.random().toString(16).slice(2)}`
    ),
    name: String(f.name ?? "Food"),
    confidence: normalizeConfidence(f.confidence),
    portion: {
      amount,
      unit,
      multiplier: 1,
    },
    // Keep macro field names aligned with new UI types (includes optional advanced fields)
    macros: {
      calories: nonNeg(m.calories),
      protein: nonNeg(m.protein),
      carbs: nonNeg(m.carbs),
      fat: nonNeg(m.fat),

      fiber: m.fiber != null ? nonNeg(m.fiber) : undefined,
      sugar: m.sugar != null ? nonNeg(m.sugar) : undefined,
      sodiumMg: m.sodiumMg != null ? nonNeg(m.sodiumMg) : undefined,
      satFat: m.satFat != null ? nonNeg(m.satFat) : undefined,
    },
    rationale: (f as any).rationale,
    suggestions: (f as any).suggestions,
  };
}

function normalizeConfidence(c: BackendConfidence | undefined): UiConfidence {
  // backend uses: "high" | "med" | "low" | "manual" (based on your error)
  // UI uses: "high" | "medium" | "low" | "manual"
  if (c === "med") return "medium";
  if (c === "high" || c === "low" || c === "manual") return c;
  // fallback
  return "medium";
}

function normalizeUnit(u: string): UiPortionUnit {
  const s = u.trim().toLowerCase();
  if (VALID_UNITS.includes(s as UiPortionUnit)) return s as UiPortionUnit;

  // common aliases just in case
  if (s === "grams" || s === "gram") return "g";
  if (s === "ounces" || s === "ounce") return "oz";
  if (s === "cup") return "cups";
  if (s === "tablespoon" || s === "tablespoons" || s === "tbsp.") return "tbsp";
  if (s === "pcs" || s === "pc" || s === "serving") return "piece";

  return "g";
}

function safeNumber(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function nonNeg(v: any) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
