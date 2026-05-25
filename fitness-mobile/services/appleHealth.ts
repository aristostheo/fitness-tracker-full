import { Platform } from "react-native";

import { addActivity, type ActivityType } from "@/services/activity";
import { setStepsForDate, updateProfile } from "@/services/profile";
import {
  appendBodyMetricsHistory,
  loadBodyMetrics,
  saveBodyMetrics,
} from "@/services/profile/bodyMetrics";

type HealthKitModule = {
  isHealthDataAvailable?: () => Promise<boolean>;
  requestAuthorization?: (options: { toRead?: string[]; toShare?: string[] }) => Promise<unknown>;
  queryQuantitySamples?: (identifier: string, options?: Record<string, unknown>) => Promise<unknown>;
  getMostRecentQuantitySample?: (identifier: string) => Promise<unknown>;
  queryWorkouts?: (options?: Record<string, unknown>) => Promise<unknown>;
};

type QuantitySample = {
  quantity?: number;
  value?: number;
  startDate?: string;
  endDate?: string;
  sourceName?: string;
  metadata?: Record<string, unknown>;
};

type WorkoutSample = {
  platformId?: string;
  workoutActivityType?: string;
  workoutType?: string;
  activityName?: string;
  totalEnergyBurned?: number;
  calories?: number;
  duration?: number;
  startDate?: string;
  endDate?: string;
  start?: string;
  end?: string;
};

export type AppleHealthSyncResult = {
  ok: boolean;
  message?: string;
  stepsUpdated: number;
  activeCalories: number;
  workoutsImported: number;
  weightLb?: number;
  bodyFatPct?: number;
};

function healthkit(): HealthKitModule | null {
  if (Platform.OS !== "ios") return null;
  try {
    const mod = require("@kingstinct/react-native-healthkit");
    return mod?.default || mod;
  } catch {
    return null;
  }
}

function missingNativeModuleMessage() {
  return "Apple Health is not available in this build. Rebuild the iOS app after installing @kingstinct/react-native-healthkit; Expo Go cannot load this native module.";
}

function iso(d: Date) {
  return d.toISOString();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(date: Date, delta: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function quantityFromSample(sample: QuantitySample | null | undefined) {
  if (!sample) return 0;
  return Number(sample.quantity ?? sample.value ?? 0);
}

function normalizeQuantitySamples(result: unknown): QuantitySample[] {
  if (Array.isArray(result)) return result as QuantitySample[];
  if (result && typeof result === "object" && Array.isArray((result as any).samples)) {
    return (result as any).samples as QuantitySample[];
  }
  return [];
}

function normalizeWorkouts(result: unknown): WorkoutSample[] {
  if (Array.isArray(result)) return result as WorkoutSample[];
  if (result && typeof result === "object" && Array.isArray((result as any).workouts)) {
    return (result as any).workouts as WorkoutSample[];
  }
  if (result && typeof result === "object" && Array.isArray((result as any).samples)) {
    return (result as any).samples as WorkoutSample[];
  }
  return [];
}

function mapWorkoutType(name: string): ActivityType {
  const s = String(name || "").toLowerCase();
  if (s.includes("run")) return "run";
  if (s.includes("cycl") || s.includes("bike")) return "bike";
  if (s.includes("walk")) return "walk";
  if (s.includes("swim")) return "swim";
  if (s.includes("yoga")) return "yoga";
  return "other";
}

async function ensureModuleReady(HK: HealthKitModule | null) {
  if (!HK) {
    return {
      ok: false,
      message: Platform.OS === "ios" ? missingNativeModuleMessage() : "Apple Health is available on iOS only.",
    };
  }
  if (
    typeof HK.isHealthDataAvailable !== "function" ||
    typeof HK.requestAuthorization !== "function" ||
    typeof HK.queryQuantitySamples !== "function" ||
    typeof HK.getMostRecentQuantitySample !== "function"
  ) {
    return { ok: false, message: missingNativeModuleMessage() };
  }
  const available = await HK.isHealthDataAvailable();
  if (!available) {
    return { ok: false, message: "Health data is not available on this device." };
  }
  return { ok: true };
}

export async function requestAppleHealthPermissions() {
  const HK = healthkit();
  const ready = await ensureModuleReady(HK);
  if (!ready.ok) return ready;

  try {
    await HK!.requestAuthorization!({
      toRead: [
        "HKQuantityTypeIdentifierStepCount",
        "HKQuantityTypeIdentifierActiveEnergyBurned",
        "HKQuantityTypeIdentifierBasalEnergyBurned",
        "HKWorkoutTypeIdentifier",
        "HKQuantityTypeIdentifierHeartRate",
        "HKCategoryTypeIdentifierSleepAnalysis",
        "HKQuantityTypeIdentifierBodyMass",
        "HKQuantityTypeIdentifierBodyFatPercentage",
      ],
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Apple Health permission request failed.",
    };
  }
}

async function getQuantityTotal(HK: HealthKitModule, identifier: string, startDate: Date, endDate: Date) {
  const result = await HK.queryQuantitySamples!(identifier, {
    startDate: iso(startDate),
    endDate: iso(endDate),
    ascending: true,
    limit: 0,
  });
  return normalizeQuantitySamples(result).reduce((sum, sample) => sum + quantityFromSample(sample), 0);
}

async function getLatestQuantity(HK: HealthKitModule, identifier: string) {
  try {
    const sample = (await HK.getMostRecentQuantitySample!(identifier)) as QuantitySample | null;
    return quantityFromSample(sample);
  } catch {
    return 0;
  }
}

async function getWorkouts(HK: HealthKitModule, startDate: Date, endDate: Date) {
  if (typeof HK.queryWorkouts !== "function") return [];
  try {
    const result = await HK.queryWorkouts({
      startDate: iso(startDate),
      endDate: iso(endDate),
      ascending: true,
      limit: 0,
    });
    return normalizeWorkouts(result);
  } catch {
    return [];
  }
}

export async function syncAppleHealthToApp(uid: string, days = 14): Promise<AppleHealthSyncResult> {
  const auth = await requestAppleHealthPermissions();
  if (!auth.ok) {
    return {
      ok: false,
      message: auth.message,
      stepsUpdated: 0,
      activeCalories: 0,
      workoutsImported: 0,
    };
  }

  const HK = healthkit();
  const ready = await ensureModuleReady(HK);
  if (!ready.ok || !HK) {
    return {
      ok: false,
      message: ready.message || missingNativeModuleMessage(),
      stepsUpdated: 0,
      activeCalories: 0,
      workoutsImported: 0,
    };
  }

  const today = new Date();
  const start = addDays(today, -days + 1);
  let stepsUpdated = 0;
  let activeCalories = 0;

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [steps, active] = await Promise.all([
      getQuantityTotal(HK, "HKQuantityTypeIdentifierStepCount", dayStart, dayEnd),
      getQuantityTotal(HK, "HKQuantityTypeIdentifierActiveEnergyBurned", dayStart, dayEnd),
    ]);

    if (steps > 0) {
      await setStepsForDate(uid, ymd(date), Math.round(steps));
      stepsUpdated += 1;
    }

    const roundedActive = Math.round(active);
    activeCalories += roundedActive;
    if (roundedActive > 0) {
      await addActivity(uid, {
        id: `apple-health-active-${ymd(date)}`,
        type: "other",
        minutes: 0,
        intensity: "moderate",
        calories: roundedActive,
        note: "Synced active calories from Apple Health",
        timestamp: new Date(`${ymd(date)}T12:00:00`).getTime(),
      });
    }
  }

  const workouts = await getWorkouts(HK, start, today);
  let workoutsImported = 0;
  for (const workout of workouts) {
    const started = new Date(workout.startDate || workout.start || Date.now());
    const ended = new Date(workout.endDate || workout.end || started);
    const seconds = Number(workout.duration || 0);
    const minutes =
      seconds > 0
        ? Math.max(1, Math.round(seconds / 60))
        : Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000));

    await addActivity(uid, {
      id: `apple-health-workout-${workout.platformId || started.getTime()}`,
      type: mapWorkoutType(String(workout.workoutActivityType || workout.workoutType || workout.activityName || "")),
      minutes,
      intensity: "moderate",
      calories: Math.round(Number(workout.totalEnergyBurned || workout.calories || 0)),
      note: "Synced workout from Apple Health",
      timestamp: started.getTime(),
    });
    workoutsImported += 1;
  }

  const [weightKgRaw, bodyFatRaw] = await Promise.all([
    getLatestQuantity(HK, "HKQuantityTypeIdentifierBodyMass"),
    getLatestQuantity(HK, "HKQuantityTypeIdentifierBodyFatPercentage"),
  ]);

  const current = (await loadBodyMetrics()) || {};
  const patch: Record<string, number> = {};
  let weightLb: number | undefined;
  const weightKg = weightKgRaw > 0 ? weightKgRaw : 0;
  const bodyFatPct = bodyFatRaw > 0 ? (bodyFatRaw <= 1 ? bodyFatRaw * 100 : bodyFatRaw) : 0;

  if (weightKg > 0) {
    weightLb = weightKg * 2.20462;
    patch.weightLb = weightLb;
  }
  if (bodyFatPct > 0) {
    patch.bodyFatPct = bodyFatPct;
  }

  if (Object.keys(patch).length) {
    await saveBodyMetrics({ ...current, ...patch });
    await appendBodyMetricsHistory({
      t: Date.now(),
      weightLb: patch.weightLb ?? current.weightLb,
      bodyFatPct: patch.bodyFatPct ?? current.bodyFatPct,
    });
    await updateProfile(
      uid,
      {
        ...(weightKg > 0 ? { weightKg } : {}),
        ...(bodyFatPct > 0 ? { bodyFatPct } : {}),
        healthLastUpdatedVia: "Apple Health",
        healthLastUpdatedAt: Date.now(),
      } as any
    );
  }

  return {
    ok: true,
    stepsUpdated,
    activeCalories,
    workoutsImported,
    weightLb,
    bodyFatPct: bodyFatPct || undefined,
  };
}
