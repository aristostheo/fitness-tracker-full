// src/services/usda.js
const API = "https://api.nal.usda.gov/fdc/v1/foods/search";

const N = {
  ENERGY_KCAL: 1008,
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
  SUGAR: 2000,
  FIBER: 1079,
};
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pickN = (arr = [], id) => {
  const n = arr.find((x) => x.nutrientId === id || x.nutrient?.id === id);
  return n ? toNum(n.value ?? n.amount) : 0;
};

export async function searchUsdaFoods(
  query,
  { limit = 8, page = 1, signal } = {}
) {
  const q = (query || "").trim();
  if (!q) return [];

  const API_KEY = process.env.REACT_APP_FDC_API_KEY;
  if (!API_KEY) {
    console.warn("Missing REACT_APP_USDA_API_KEY");
    return [];
  }

  const url = new URL(API);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("query", q);
  url.searchParams.set("pageSize", String(limit));
  url.searchParams.set("pageNumber", String(page));

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`USDA error: ${res.status}`);
  const data = await res.json();
  const foods = Array.isArray(data.foods) ? data.foods : [];

  return foods.map((f) => {
    const nutrients = f.foodNutrients || [];
    const name =
      f.description ||
      f.lowercaseDescription ||
      f.additionalDescriptions ||
      "Food";
    const brand = f.brandOwner || f.brandName || "";

    const calories = pickN(nutrients, N.ENERGY_KCAL);
    const protein = pickN(nutrients, N.PROTEIN);
    const carbs = pickN(nutrients, N.CARBS);
    const fat = pickN(nutrients, N.FAT);
    const sugar = pickN(nutrients, N.SUGAR);
    const fiber = pickN(nutrients, N.FIBER);

    const qty = f.servingSize ? toNum(f.servingSize) : 100;
    const unit = f.servingSizeUnit || "g";

    return {
      id: f.fdcId || f.gtinUpc || `fdc-${Math.random().toString(36).slice(2)}`,
      name: `${name}${brand ? " — " + brand : ""}`,
      brand,
      calories,
      protein,
      carbs,
      fat,
      sugar,
      fiber,
      qty,
      unit,
      _raw: f,
    };
  });
}

// // Search USDA FoodData Central
// export async function searchFoodsFDC(query, pageSize = 10) {
//   try {
//     if (!API_KEY || !query) return [];
//     const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
//     url.searchParams.set("api_key", API_KEY);
//     url.searchParams.set("query", query);
//     url.searchParams.set("pageSize", String(pageSize));
//     url.searchParams.set("dataType", "Branded,Survey (FNDDS),SR Legacy,Foundation");

//     const res = await fetch(url.toString());
//     if (!res.ok) return [];
//     const data = await res.json();
//     return (data.foods || []).map(mapFdcFood);
//   } catch {
//     return [];
//   }
// }

// // Map FDC nutrients to our shape
// function mapFdcFood(f) {
//   const byNum = {};
//   (f.foodNutrients || []).forEach(n => { byNum[n.nutrientNumber] = n.value; });
//   return {
//     source: "fdc",
//     id: f.fdcId,
//     name: f.description || f.lowercaseDescription || f.brandName || "Food",
//     calories: byNum["208"] ?? 0, // kcal
//     protein:  byNum["203"] ?? 0, // g
//     carbs:    byNum["205"] ?? 0, // g
//     fat:      byNum["204"] ?? 0, // g
//     sugar:    byNum["269"] ?? 0, // g
//     fiber:    byNum["291"] ?? 0, // g
//     qty: 1,
//     unit: "serving",
//   };
// }
