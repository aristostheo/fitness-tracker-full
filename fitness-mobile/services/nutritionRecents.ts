// src/services/nutritionRecents.ts
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

export type RecentFood = {
  name: string;
  unit: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  addedSugar?: number;
  satFat?: number;
  sodium?: number;
  wholeFoodRatio?: number;
  veggieFruitServings?: number;
  unsatFatRatio?: number;
  alcoholCalories?: number;
};

export async function fetchMyRecentFoods(
  uid: string,
  take = 50
): Promise<RecentFood[]> {
  const db = getFirestore(app);

  const q = query(
    collection(db, "users", uid, "nutritionEntries"),
    orderBy("createdAt", "desc"),
    limit(300)
  );

  const snap = await getDocs(q);

  const seen = new Set<string>();
  const out: RecentFood[] = [];

  snap.forEach((docu) => {
    const d: any = docu.data() || {};
    const name = String(d.name || "").trim();
    if (!name) return;

    const unit = String(d.unit || "serving");
    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
    if (seen.has(key)) return;

    seen.add(key);
    out.push({
      name,
      unit,
      qty: Number(d.qty || 1),
      calories: Number(d.calories || 0),
      protein: Number(d.protein || 0),
      carbs: Number(d.carbs || 0),
      fat: Number(d.fat || 0),
      sugar: d.sugar != null ? Number(d.sugar) : undefined,
      fiber: d.fiber != null ? Number(d.fiber) : undefined,
      addedSugar: d.addedSugar != null ? Number(d.addedSugar) : undefined,
      satFat: d.satFat != null ? Number(d.satFat) : undefined,
      sodium: d.sodium != null ? Number(d.sodium) : undefined,
      wholeFoodRatio:
        d.wholeFoodRatio != null ? Number(d.wholeFoodRatio) : undefined,
      veggieFruitServings:
        d.veggieFruitServings != null
          ? Number(d.veggieFruitServings)
          : undefined,
      unsatFatRatio:
        d.unsatFatRatio != null ? Number(d.unsatFatRatio) : undefined,
      alcoholCalories:
        d.alcoholCalories != null ? Number(d.alcoholCalories) : undefined,
    });
  });

  return out.slice(0, take);
}

export async function fetchMyTopFoods(
  uid: string,
  take = 8,
  sample = 500
): Promise<RecentFood[]> {
  const db = getFirestore(app);

  const q = query(
    collection(db, "users", uid, "nutritionEntries"),
    orderBy("createdAt", "desc"),
    limit(sample)
  );

  const snap = await getDocs(q);

  const counts = new Map<
    string,
    { item: RecentFood; count: number; order: number }
  >();
  let idx = 0;

  snap.forEach((docu) => {
    const d: any = docu.data() || {};
    const name = String(d.name || "").trim();
    if (!name) return;

    const unit = String(d.unit || "serving");
    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }

    counts.set(key, {
      item: {
        name,
        unit,
        qty: Number(d.qty || 1),
        calories: Number(d.calories || 0),
        protein: Number(d.protein || 0),
        carbs: Number(d.carbs || 0),
        fat: Number(d.fat || 0),
        sugar: d.sugar != null ? Number(d.sugar) : undefined,
        fiber: d.fiber != null ? Number(d.fiber) : undefined,
        addedSugar: d.addedSugar != null ? Number(d.addedSugar) : undefined,
        satFat: d.satFat != null ? Number(d.satFat) : undefined,
        sodium: d.sodium != null ? Number(d.sodium) : undefined,
        wholeFoodRatio:
          d.wholeFoodRatio != null ? Number(d.wholeFoodRatio) : undefined,
        veggieFruitServings:
          d.veggieFruitServings != null
            ? Number(d.veggieFruitServings)
            : undefined,
        unsatFatRatio:
          d.unsatFatRatio != null ? Number(d.unsatFatRatio) : undefined,
        alcoholCalories:
          d.alcoholCalories != null ? Number(d.alcoholCalories) : undefined,
      },
      count: 1,
      order: idx++,
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, take)
    .map((x) => x.item);
}
