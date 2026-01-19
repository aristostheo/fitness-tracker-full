// services/profile.ts
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
  increment,
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

  // macro goals engine inputs (persisted)
  goalIntensity?: number;
  performanceFocus?: number;
  proteinFocus?: number;
  trackingAccurate?: boolean;
  bodyFatPct?: number;
  waistCm?: number;
  macroEngineMode?: "cut" | "maintain" | "lean_bulk" | "bulk";
  macroEngineSimple?: boolean;

  stepsPerDay?: number;
  gymSessionsPerWeek?: number;
  sportSessionsPerWeek?: number;
  jobActivity?: "sedentary" | "light" | "active";
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
export async function setStepsForDate(
  uid: string,
  ymdDate: string,
  steps: number
) {
  const safe = Math.max(0, Math.floor(Number(steps) || 0));
  const r = ref(uid); // ✅ users/{uid}

  // Ensure doc exists + merge steps map
  await setDoc(
    r,
    {
      steps: { [ymdDate]: safe },
      stepsUpdatedAt: Date.now(),
      updatedAt: Date.now(),
    } as any,
    { merge: true }
  );

  // Dot-path write (keeps one canonical field)
  await updateDoc(r, {
    [`steps.${ymdDate}`]: safe,
    stepsUpdatedAt: Date.now(),
    updatedAt: Date.now(),
  } as any);
}

export async function addStepsForDate(
  uid: string,
  ymdDate: string,
  delta: number
) {
  const add = Math.max(0, Math.floor(Number(delta) || 0));
  if (!add) return;

  const r = ref(uid); // ✅ users/{uid}

  // Ensure doc exists (important for updateDoc)
  await setDoc(r, { updatedAt: Date.now() } as any, { merge: true });

  // ✅ Atomic increment (no stale reads)
  await updateDoc(r, {
    [`steps.${ymdDate}`]: increment(add),
    stepsUpdatedAt: Date.now(),
    updatedAt: Date.now(),
  } as any);
}
