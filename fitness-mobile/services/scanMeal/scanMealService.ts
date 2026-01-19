// services/scanMeal/mockScanService.ts
import { getAuth } from "firebase/auth";
import type { ScanMealResult } from "@/services/scanMeal/types";
import * as ImageManipulator from "expo-image-manipulator";

const AI_URL =
  process.env.EXPO_PUBLIC_AI_DESCRIBE_URL ||
  "https://us-central1-fitness-tracker-25254.cloudfunctions.net/describe";

/** Backend expects portion.unit in: g | oz | cups | tbsp | piece */
const VALID_PORTION_UNITS = ["g", "oz", "cups", "tbsp", "piece"] as const;
type ValidPortionUnit = (typeof VALID_PORTION_UNITS)[number];

const VALID_CONFIDENCE = ["high", "medium", "low", "manual"] as const;
type ValidConfidence = (typeof VALID_CONFIDENCE)[number];

async function uriToBase64(uri: string): Promise<string> {
  // ✅ IMPORTANT:
  // Photos from iOS camera roll are often HEIC.
  // Convert ANY input to JPEG + base64 so OpenAI accepts it.
  const out = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }], // optional but recommended (keeps aspect ratio)
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!out.base64) throw new Error("Failed to convert image to base64");
  return out.base64; // raw base64 (jpeg bytes)
}

function clampConfidence(v: any): ValidConfidence {
  const s = String(v || "").toLowerCase();
  return (VALID_CONFIDENCE as readonly string[]).includes(s)
    ? (s as any)
    : "medium";
}

function normalizePortion(p: any): {
  amount: number;
  unit: ValidPortionUnit;
  multiplier: number;
} {
  const amount = Number(p?.amount);
  const multiplier = Number(p?.multiplier);
  const unitRaw = String(p?.unit || "").toLowerCase();

  const unit: ValidPortionUnit = (
    VALID_PORTION_UNITS as readonly string[]
  ).includes(unitRaw)
    ? (unitRaw as ValidPortionUnit)
    : "piece";

  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
    unit,
    multiplier: Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
  };
}

export async function mockScanMealFromImage(
  uri: string
): Promise<ScanMealResult> {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken(true) : "";

  const base64 = await uriToBase64(uri);

  const payload = {
    mode: "scan_meal:v1", // ✅ MUST match backend (underscore)
    imageBase64: `data:image/jpeg;base64,${base64}`,
  };

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();

  // If the function errors, it may return plain text / HTML.
  if (!res.ok) {
    throw new Error(raw || `Scan failed (${res.status})`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(raw || "Scan failed (non-JSON response)");
  }

  return {
    foods: (Array.isArray(parsed?.foods) ? parsed.foods : []).map(
      (f: any, idx: number) => {
        const portion = normalizePortion(f?.portion);

        return {
          id: String(f?.id ?? `food_${idx}`),
          name: String(f?.name ?? "Food"),
          confidence: clampConfidence(f?.confidence),
          portion,
          macros: {
            calories: Number(f?.calories ?? f?.macros?.calories ?? 0) || 0,
            protein: Number(f?.protein ?? f?.macros?.protein ?? 0) || 0,
            carbs: Number(f?.carbs ?? f?.macros?.carbs ?? 0) || 0,
            fat: Number(f?.fat ?? f?.macros?.fat ?? 0) || 0,
            fiber: Number(f?.fiber ?? f?.macros?.fiber ?? 0) || 0,
            sugar: Number(f?.sugar ?? f?.macros?.sugar ?? 0) || 0,
            sodiumMg: Number(f?.sodiumMg ?? f?.macros?.sodiumMg ?? 0) || 0,
            satFat: Number(f?.satFat ?? f?.macros?.satFat ?? 0) || 0,
          },
          suggestions: Array.isArray(f?.suggestions)
            ? f.suggestions.map((s: any) => String(s)).slice(0, 4)
            : [],
        };
      }
    ),
  };
}
