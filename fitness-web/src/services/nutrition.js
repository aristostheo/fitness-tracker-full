import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  limit,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

// Flat collections make querying easy
const foodsCol = (uid) => collection(db, "users", uid, "nutritionEntries"); // foods for a date
const exerciseCol = (uid) => collection(db, "users", uid, "exerciseEntries"); // exercise for a date

// ---- FOOD ENTRIES ----
export async function addFood(uid, food) {
  // food: { date, meal, name, calories, protein, carbs, fat, sugar, fiber, qty, unit }
  return addDoc(foodsCol(uid), {
    ...food,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(), // ← immediate local sort key
  });
}
export function subscribeFoodsBetween(uid, from, to, cb) {
  const q = query(
    foodsCol(uid),
    where("date", ">=", from),
    where("date", "<=", to),
    orderBy("date", "asc")
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export function subscribeExerciseBetween(uid, from, to, cb) {
  const q = query(
    exerciseCol(uid),
    where("date", ">=", from),
    where("date", "<=", to),
    orderBy("date", "asc")
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function updateFood(uid, id, patch) {
  return updateDoc(doc(db, "users", uid, "nutritionEntries", id), patch);
}

export async function deleteFood(uid, id) {
  return deleteDoc(doc(db, "users", uid, "nutritionEntries", id));
}

export function subscribeFoodsByDate(uid, date, cb) {
  const q = query(
    foodsCol(uid),
    where("date", "==", date),
    orderBy("createdAtMs", "desc") // ← sorts immediately
  );
  return onSnapshot(
    q,
    { includeMetadataChanges: true }, // <— emit local writes instantly
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

// Recent distinct foods to power suggestions/autocomplete
export async function getRecentFoods(uid, take = 25) {
  const q = query(foodsCol(uid), orderBy("createdAt", "desc"), limit(take));
  const snap = await getDocs(q);
  // dedupe by name
  const seen = new Set();
  const items = [];
  snap.forEach((docu) => {
    const f = docu.data();
    if (!seen.has(f.name)) {
      seen.add(f.name);
      items.push(f);
    }
  });
  return items;
}

// ---- EXERCISE ENTRIES ----
export async function addExercise(uid, entry) {
  // entry: { date:'YYYY-MM-DD', name, calories }  // calories burned (we'll subtract from net)
  return addDoc(exerciseCol(uid), { ...entry, createdAt: serverTimestamp() });
}

export function subscribeExerciseByDate(uid, date, cb) {
  const q = query(
    exerciseCol(uid),
    where("date", "==", date),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function deleteExercise(uid, id) {
  return deleteDoc(doc(db, "users", uid, "exerciseEntries", id));
}
/**
 * Get foods for an inclusive date range.
 * Returns [{ date: 'YYYY-MM-DD', items: [food, ...] }, ...]
 */
export async function getFoodsRange(uid, startISO, endISO) {
  const foodsCol = collection(db, "users", uid, "nutritionEntries");
  const qy = query(
    foodsCol,
    where("date", ">=", startISO),
    where("date", "<=", endISO)
  );
  const snap = await getDocs(qy);
  const byDay = {};
  snap.forEach((doc) => {
    const data = doc.data();
    const d = data.date;
    if (!byDay[d]) byDay[d] = { date: d, items: [] };
    byDay[d].items.push({ ...data });
  });
  return Object.values(byDay);
}

/**
 * Get exercise entries for an inclusive date range.
 * Returns [{ date: 'YYYY-MM-DD', items: [exercise, ...] }, ...]
 */
export async function getExerciseRange(uid, startISO, endISO) {
  const exCol = collection(db, "users", uid, "exerciseEntries");
  const qy = query(
    exCol,
    where("date", ">=", startISO),
    where("date", "<=", endISO)
  );
  const snap = await getDocs(qy);
  const byDay = {};
  snap.forEach((doc) => {
    const data = doc.data();
    const d = data.date;
    if (!byDay[d]) byDay[d] = { date: d, items: [] };
    byDay[d].items.push({ ...data });
  });
  return Object.values(byDay);
}
export async function getFoodsInRange(uid, fromDate, toDate) {
  // fromDate/toDate in "YYYY-MM-DD" (inclusive)
  const ref = collection(db, "users", uid, "nutritionEntries");
  const qy = query(
    ref,
    where("date", ">=", fromDate),
    where("date", "<=", toDate),
    orderBy("date", "asc")
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getExerciseInRange(uid, fromDate, toDate) {
  const ref = collection(db, "users", uid, "exerciseEntries");
  const qy = query(
    ref,
    where("date", ">=", fromDate),
    where("date", "<=", toDate),
    orderBy("date", "asc")
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
