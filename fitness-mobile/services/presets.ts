// services/presets.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type WorkoutPreset = {
  id: string;
  name: string; // label shown in UI
  exercise?: string; // optional
  sets?: number;
  reps?: number;
  weight?: number; // kg
  notes?: string;
  createdAt?: any;
};

const col = (uid: string) =>
  collection(getFirestore() ?? db, "users", uid, "workoutPresets");

export function subscribeWorkoutPresets(
  uid: string,
  cb: (rows: WorkoutPreset[]) => void
) {
  if (!uid || uid === "__demo__") {
    cb([]);
    return () => {};
  }
  const qy = query(col(uid), orderBy("name", "asc"));
  return onSnapshot(
    qy,
    (snap) => {
      const rows: WorkoutPreset[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
      cb(rows);
    },
    (err) => {
      console.warn("[subscribeWorkoutPresets]", err);
      cb([]);
    }
  );
}

export async function addWorkoutPreset(
  uid: string,
  data: Omit<WorkoutPreset, "id"> | string
) {
  const payload =
    typeof data === "string" ? { name: data.trim() } : { ...data };
  return await addDoc(col(uid), {
    ...payload,
    createdAt: serverTimestamp(),
  } as any);
}

export async function updateWorkoutPreset(
  uid: string,
  id: string,
  patch: Partial<WorkoutPreset>
) {
  await updateDoc(doc(col(uid), id), patch as any);
}

export async function deleteWorkoutPreset(uid: string, id: string) {
  await deleteDoc(doc(col(uid), id));
}
