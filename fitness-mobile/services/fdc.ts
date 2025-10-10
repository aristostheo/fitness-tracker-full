// fitness-mobile/services/fdc.ts
import Constants from "expo-constants";

type FdcItem = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  dataType?: string;
  labelNutrients?: any;
};

function nutrientsFromLabel(label: any) {
  const pick = (k: string) => Number(label?.[k]?.value || 0);
  return {
    calories: pick("calories"),
    protein: pick("protein"),
    carbs: pick("carbohydrate"),
    fat: pick("fat"),
    sugar: pick("sugars"),
    fiber: pick("fiber"),
  };
}

export async function searchFDC(q: string, opts: { limit?: number } = {}) {
  // Works for Expo SDK 50+ (expo-constants new API) and older manifest fallback
  const extra =
    (Constants?.expoConfig?.extra as any) ||
    ((Constants as any)?.manifest?.extra as any) ||
    {};
  const key = extra.fdcApiKey;

  if (!key) {
    console.warn(
      "FDC API key missing. Add FDC_API_KEY in .env and expose via app.config.ts extra.fdcApiKey"
    );
    return [];
  }

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
    q
  )}&pageSize=${opts.limit ?? 20}&api_key=${key}`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const foods: FdcItem[] = data.foods || [];
  return foods.map((f) => ({
    ...f,
    nutrients: nutrientsFromLabel(f.labelNutrients || {}),
    per: "100g" as const, // treat results as per 100g for scaling UX
  }));
}
