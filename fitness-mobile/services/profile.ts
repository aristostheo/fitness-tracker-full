// services/profile.ts
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Profile = {
  email?: string;
  displayName?: string | null;

  weightUnit?: "kg" | "lb";
  calorieGoal?: number;

  // used on Home
  dailyCaloriesTarget?: number;
  dailyProteinTarget?: number;

  // profile fields
  sex?: "male" | "female";
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "athlete";
  goal?: "cut" | "maintain" | "bulk";

  // targets
  targetMode?: "proteinPerKg" | "percent";
  proteinPerKg?: number;
  proteinPct?: number;
  carbPct?: number;
  fatPct?: number;

  // computed targets (optional)
  proteinGoal?: number;
  carbGoal?: number;
  fatGoal?: number;

  updatedAt?: number;
  createdAt?: number;

  targetWeightKg?: number;
  targetDate?: string;
  trainingDaysPerWeek?: number;
  stepsGoal?: number;

  macroMethod?: "proteinPerKg" | "percent" | "cycling";
  cycling?: {
    trainingCarbPct?: number;
    restCarbPct?: number;
    // optional, stored for reference
    trainingFatPct?: number;
    restFatPct?: number;
  };

  diet?: {
    type?:
      | "balanced"
      | "mediterranean"
      | "high-protein"
      | "vegetarian"
      | "vegan"
      | "keto";
    allergies?: string[];
    dislikes?: string[];
  };
  meals?: {
    schedule?: Array<{
      label: "breakfast" | "lunch" | "dinner" | "snacks";
      time?: string;
    }>;
  };
  cooking?: {
    minutes?: number;
    skill?: "beginner" | "intermediate" | "advanced";
    budgetPerMealUSD?: number;
  };

  equipment?: string[];
  workoutPlace?: "home" | "gym";
  injuries?: string[];
};

const ref = (uid: string) => doc(getFirestore() ?? db, "users", uid);

/**
 * Create the user doc if missing (with sensible defaults) and optionally
 * merge any seed values (email, displayName, etc.). If the doc exists,
 * we still merge the provided seed.
 */
export async function ensureProfile(uid: string, seed: Partial<Profile> = {}) {
  const r = ref(uid);
  const snap = await getDoc(r);

  const baseDefaults: Partial<Profile> = {
    weightUnit: "kg",
    calorieGoal: 2200,
    dailyCaloriesTarget: 2200,
    dailyProteinTarget: 130,
  };

  if (!snap.exists()) {
    await setDoc(
      r,
      {
        ...baseDefaults,
        ...seed,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } else if (Object.keys(seed).length) {
    // Merge any new info (e.g., email/displayName) if passed
    await setDoc(
      r,
      {
        ...seed,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }
}

export function subscribeProfile(uid: string, cb: (p: Profile | null) => void) {
  return onSnapshot(
    ref(uid),
    (snap) => {
      cb(snap.exists() ? (snap.data() as Profile) : null);
    },
    (err) => {
      console.warn("[subscribeProfile]", err);
      cb(null);
    }
  );
}

export async function updateProfile(uid: string, patch: Partial<Profile>) {
  await updateDoc(ref(uid), { ...patch, updatedAt: Date.now() });
}
