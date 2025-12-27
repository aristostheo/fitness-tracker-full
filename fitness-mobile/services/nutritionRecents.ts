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
};

export async function fetchMyRecentFoods(
  uid: string,
  take = 18
): Promise<RecentFood[]> {
  const db = getFirestore(app);

  const q = query(
    collection(db, "users", uid, "nutritionEntries"),
    orderBy("createdAt", "desc"),
    limit(80)
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
    });
  });

  return out.slice(0, take);
}
