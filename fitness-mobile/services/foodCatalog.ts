// services/foodCatalog.ts
import {
  collection,
  doc,
  getFirestore,
  query as fbQuery,
  where,
  orderBy,
  limit as fbLimit,
  getDocs,
  setDoc,
  increment,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

export type FoodCatalogItem = {
  name: string;
  unit: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  nameLower: string;
  tokens: string[];
  createdAt: number;
  updatedAt: number;
  submitterUid?: string;
  uses?: number; // popularity
  verified?: boolean;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function foodIdFor(name: string, unit: string) {
  return `${slugify(name)}|${slugify(unit)}`;
}
function tokenize(name: string) {
  return slugify(name).split(" ").filter(Boolean);
}

/** Create or update a catalog item. Does NOT bump popularity. */
export async function upsertFoodToCatalog(
  item: Omit<
    FoodCatalogItem,
    "nameLower" | "tokens" | "createdAt" | "updatedAt" | "uses"
  > & { submitterUid?: string }
) {
  const id = foodIdFor(item.name, item.unit);
  const now = Date.now();
  const ref = doc(db, "foodCatalog", id);

  // If the doc exists, we keep its current `uses` value.
  const existing = await getDoc(ref);
  const base = {
    ...item,
    nameLower: item.name.toLowerCase(),
    tokens: tokenize(item.name),
    createdAt: existing.exists() ? existing.data()?.createdAt ?? now : now,
    updatedAt: now,
  };

  // Do not increment `uses` here — only when selected/logged.
  await setDoc(ref, base, { merge: true });
  return ref;
}

/** Increment popularity when a catalog item gets used. */
export async function bumpUse(foodId: string) {
  const ref = doc(db, "foodCatalog", foodId);
  await updateDoc(ref, { uses: increment(1), updatedAt: Date.now() });
}

/** Popular list (no text query). */
export async function getPopularCatalog(max = 25) {
  const col = collection(db, "foodCatalog");
  try {
    const q = fbQuery(col, orderBy("uses", "desc"), fbLimit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as (FoodCatalogItem & { id: string })[];
  } catch {
    // Fallback if index/rules prevent orderBy
    const snap = await getDocs(fbQuery(col, fbLimit(max)));
    const arr = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as (FoodCatalogItem & { id: string })[];
    return arr.sort((a: any, b: any) => (b?.uses ?? 0) - (a?.uses ?? 0));
  }
}

/**
 * Text search (token OR semantics).
 * Requires composite index: tokens (array), uses (desc), __name__ (desc).
 * Falls back to tokens-only + client-side sort while index is missing/building.
 */
export async function searchCatalog(qstr: string, max = 25) {
  const qnorm = slugify(qstr);
  const col = collection(db, "foodCatalog");

  // Empty query -> popular
  if (!qnorm) return getPopularCatalog(max);

  const words = qnorm.split(" ").filter(Boolean).slice(0, 10);

  try {
    const q = fbQuery(
      col,
      where("tokens", "array-contains-any", words),
      orderBy("uses", "desc"),
      fbLimit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as (FoodCatalogItem & { id: string })[];
  } catch (e) {
    // Fallback when the composite index isn't ready
    const q = fbQuery(
      col,
      where("tokens", "array-contains-any", words),
      fbLimit(max)
    );
    const snap = await getDocs(q);
    const arr = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as (FoodCatalogItem & { id: string })[];
    return arr.sort((a: any, b: any) => (b?.uses ?? 0) - (a?.uses ?? 0));
  }
}

// --- Barcode linking helpers & scan submit ---

/** Optional: map barcode -> foodId for fast lookups later */
export async function linkBarcode(barcode: string, foodId: string) {
  if (!barcode) return;
  const ref = doc(db, "barcodeIndex", barcode);
  await setDoc(ref, { foodId, updatedAt: Date.now() }, { merge: true });
}

/** Optional: lookup by barcode (returns full catalog item + id, or null) */
export async function findByBarcode(barcode: string) {
  if (!barcode) return null;
  const ref = doc(db, "barcodeIndex", barcode);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const fid = snap.data()?.foodId as string | undefined;
  if (!fid) return null;

  const foodRef = doc(db, "foodCatalog", fid);
  const foodSnap = await getDoc(foodRef);
  if (!foodSnap.exists()) return null;
  return { id: fid, ...(foodSnap.data() as FoodCatalogItem) };
}

/** Called when a user confirms a scanned item.
 *  - Upserts into foodCatalog (verified=false by default)
 *  - Links barcode -> foodId for future scans
 *  - Optionally bumps popularity immediately (toggle bump parameter)
 */
export async function submitSuggestionFromScan(args: {
  barcode?: string | null;
  name: string;
  unit: string; // e.g., "serving", "100 g", "100 ml"
  qty: number; // per amount for the macros above (1 or 100 typically)
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  submitterUid?: string | null;
  verified?: boolean; // default false
  bumpPopularity?: boolean; // default true
}) {
  const {
    barcode,
    name,
    unit,
    qty,
    calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    sugar,
    fiber,
    submitterUid,
    verified = false,
    bumpPopularity = true,
  } = args;

  // Upsert to catalog
  await upsertFoodToCatalog({
    name,
    unit,
    qty,
    calories,
    protein,
    carbs,
    fat,
    sugar,
    fiber,
    submitterUid: submitterUid || undefined,
    verified,
  });

  // Link barcode -> foodId
  const fid = foodIdFor(name, unit);
  if (barcode) await linkBarcode(barcode, fid);

  // Optionally bump popularity since it was just used
  if (bumpPopularity) {
    try {
      await bumpUse(fid);
    } catch {}
  }

  return fid;
}
