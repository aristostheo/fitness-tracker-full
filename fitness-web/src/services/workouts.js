import {
  collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc,
  serverTimestamp, updateDoc, where
} from "firebase/firestore";
import { db } from "../firebaseConfig";

const colRefForUser = (uid) => collection(db, "users", uid, "workouts");

export async function addWorkout(uid, workout) {
  return addDoc(colRefForUser(uid), { ...workout, createdAt: serverTimestamp() });
}

export function subscribeWorkouts(uid, cb, { from, to } = {}) {
  let q = query(colRefForUser(uid), orderBy("date", "desc")); // we store YYYY-MM-DD
  if (from) q = query(q, where("date", ">=", from));
  if (to)   q = query(q, where("date", "<=", to));
  return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function deleteWorkout(uid, id) {
  return deleteDoc(doc(db, "users", uid, "workouts", id));
}

export async function updateWorkout(uid, id, patch) {
  return updateDoc(doc(db, "users", uid, "workouts", id), patch);
}
