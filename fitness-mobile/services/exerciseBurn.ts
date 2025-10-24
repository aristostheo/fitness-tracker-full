// FILE: services/exerciseBurn.ts
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export type ExerciseBurnEntry = {
  date: string; // "YYYY-MM-DD"
  name: string; // label to show
  calories: number; // kcal (integer)
  createdAt?: any; // Firestore Timestamp
};

const db = getFirestore();

export async function addExerciseBurn(uid: string, entry: ExerciseBurnEntry) {
  // IMPORTANT: collection must match what `subscribeExerciseBetween` reads
  const col = collection(db, "users", uid, "exerciseEntries");
  const ref = await addDoc(col, {
    ...entry,
    createdAt: serverTimestamp(), // so ranges & ordering work
  });
  return ref; // { id }
}

export async function deleteExerciseBurn(uid: string, id: string) {
  const d = doc(db, "users", uid, "exerciseEntries", id);
  await deleteDoc(d);
}
