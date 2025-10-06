// src/services/profile.js
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Subscribe to a user's profile
export function subscribeProfile(uid, cb) {
  const ref = doc(db, "profiles", uid); // adjust path if you store under /users/{uid}/profile
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/**
 * Ensure a profile doc exists.
 * Pass optional seed fields (e.g., { email }) from the caller.
 */
export async function ensureProfile(uid, seed = {}) {
  const ref = doc(db, "profiles", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const def = {
      email: seed.email ?? "",
      weightUnit: "kg",
      sex: "male",
      age: 25,
      heightCm: 175,
      weightKg: 75,
      activityLevel: "moderate", // sedentary|light|moderate|active|athlete
      goal: "maintain", // cut|maintain|bulk
      calorieGoal: 2200,
      proteinGoal: 135,
      carbGoal: 240,
      fatGoal: 73,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(ref, { ...def, ...seed });
  }
}

// Patch/update profile fields
export async function updateProfile(uid, patch) {
  const ref = doc(db, "profiles", uid);
  await updateDoc(ref, { ...patch, updatedAt: Date.now() });
}
