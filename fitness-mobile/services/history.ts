// mobile/services/foodHistory.ts
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FoodHistoryItem = {
  key: string;
  name: string;
  unit: string;
  perUnit: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    fiber: number;
  };
  source: "fdc" | "manual";
  fdcId?: string | null;
  timesUsed: number;
  lastUsedAt: number;
};

export async function fetchFoodHistory(uid: string) {
  const base = collection(db, "users", uid, "foodHistory");
  const [recentSnap, frequentSnap] = await Promise.all([
    getDocs(query(base, orderBy("lastUsedAt", "desc"), limit(50))),
    getDocs(query(base, orderBy("timesUsed", "desc"), limit(50))),
  ]);

  const toItem = (d: any) => d as FoodHistoryItem;

  const recent = recentSnap.docs.map((doc) => toItem(doc.data()));
  const frequent = frequentSnap.docs.map((doc) => toItem(doc.data()));
  return { recent, frequent };
}
