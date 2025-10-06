import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// Collections
const mealPresetsCol    = (uid) => collection(db, "users", uid, "mealPresets");
const workoutPresetsCol = (uid) => collection(db, "users", uid, "workoutPresets");

// ---- Meal Presets ----
export async function addMealPreset(uid, preset) {
  // { name, calories, protein, carbs, fat, sugar, fiber, qty, unit }
  return addDoc(mealPresetsCol(uid), preset);
}
export function subscribeMealPresets(uid, cb) {
  const q = query(mealPresetsCol(uid), orderBy("__name__"));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function deleteMealPreset(uid, id) {
  return deleteDoc(doc(db, "users", uid, "mealPresets", id));
}

// ---- Workout Presets ----
export async function addWorkoutPreset(uid, preset) {
  // { exercise, sets, reps, weight, notes }
  return addDoc(workoutPresetsCol(uid), preset);
}
export function subscribeWorkoutPresets(uid, cb) {
  const q = query(workoutPresetsCol(uid), orderBy("__name__"));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function deleteWorkoutPreset(uid, id) {
  return deleteDoc(doc(db, "users", uid, "workoutPresets", id));
}
