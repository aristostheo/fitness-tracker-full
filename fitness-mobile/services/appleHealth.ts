import { Platform } from "react-native";

import { addActivity, type ActivityType } from "@/services/activity";
import { setStepsForDate, updateProfile } from "@/services/profile";
import {
  appendBodyMetricsHistory,
  loadBodyMetrics,
  saveBodyMetrics,
} from "@/services/profile/bodyMetrics";

type HealthKitModule = any;

export type AppleHealthSyncResult = {
  ok: boolean;
  message?: string;
  stepsUpdated: number;
  activeCalories: number;
  workoutsImported: number;
  weightLb?: number;
  bodyFatPct?: number;
};

function hk(): HealthKitModule | null {
  if (Platform.OS !== "ios") return null;
  try {
    // Dynamic require keeps Android/web bundles from trying to initialize HealthKit.
    const mod = require("react-native-health");
    return mod?.default || mod?.HealthKit || mod;
  } catch {
    return null;
  }
}

function missingNativeModuleMessage() {
  return "Apple Health is not available in this build. Rebuild the iOS dev client after installing react-native-health; Expo Go cannot load this native module.";
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

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { startDate: iso(start), endDate: iso(end) };
}

function addDays(date: Date, delta: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function permissions(HK: HealthKitModule) {
  const P = HK?.Constants?.Permissions || {};
  return {
    permissions: {
      read: [
        P.StepCount,
        P.ActiveEnergyBurned,
        P.BasalEnergyBurned,
        P.Workout,
        P.HeartRate,
        P.SleepAnalysis,
        P.Weight,
        P.BodyFatPercentage,
      ].filter(Boolean),
      write: [],
    },
  };
}

export async function requestAppleHealthPermissions() {
  const HK = hk();
  if (!HK) {
    return {
      ok: false,
      message: Platform.OS === "ios" ? missingNativeModuleMessage() : "Apple Health is available on iOS only.",
    };
  }
  if (typeof HK.initHealthKit !== "function") {
    return { ok: false, message: missingNativeModuleMessage() };
  }
  return new Promise<{ ok: boolean; message?: string }>((resolve) => {
    HK.initHealthKit(permissions(HK), (err: string) => {
      if (err) resolve({ ok: false, message: err });
      else resolve({ ok: true });
    });
  });
}

function getDailySteps(HK: HealthKitModule, date: Date) {
  const range = dayRange(date);
  return new Promise<number>((resolve) => {
    HK.getDailyStepCountSamples(range, (err: string, res: any[]) => {
      if (err || !Array.isArray(res)) return resolve(0);
      resolve(Math.round(res.reduce((acc, x) => acc + Number(x?.value || 0), 0)));
    });
  });
}

function getActiveEnergy(HK: HealthKitModule, date: Date) {
  const range = dayRange(date);
  return new Promise<number>((resolve) => {
    HK.getActiveEnergyBurned(range, (err: string, res: any[]) => {
      if (err || !Array.isArray(res)) return resolve(0);
      resolve(Math.round(res.reduce((acc, x) => acc + Number(x?.value || 0), 0)));
    });
  });
}

function getLatestWeightKg(HK: HealthKitModule) {
  return new Promise<number | null>((resolve) => {
    HK.getLatestWeight({ unit: "kg" }, (err: string, res: any) => {
      if (err || !res?.value) return resolve(null);
      resolve(Number(res.value));
    });
  });
}

function getLatestBodyFatPct(HK: HealthKitModule) {
  return new Promise<number | null>((resolve) => {
    HK.getLatestBodyFatPercentage({ unit: "percent" }, (err: string, res: any) => {
      if (err || res?.value == null) return resolve(null);
      const raw = Number(res.value);
      resolve(raw <= 1 ? raw * 100 : raw);
    });
  });
}

function getWorkouts(HK: HealthKitModule, startDate: Date, endDate: Date) {
  return new Promise<any[]>((resolve) => {
    HK.getAnchoredWorkouts(
      {
        startDate: iso(startDate),
        endDate: iso(endDate),
        type: "Workout",
      },
      (err: any, res: any) => {
        if (err) return resolve([]);
        resolve(Array.isArray(res?.data) ? res.data : []);
      }
    );
  });
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

export async function syncAppleHealthToApp(uid: string, days = 14): Promise<AppleHealthSyncResult> {
  const auth = await requestAppleHealthPermissions();
  if (!auth.ok) {
    return { ok: false, message: auth.message, stepsUpdated: 0, activeCalories: 0, workoutsImported: 0 };
  }
  const HK = hk();
  if (!HK) {
    return { ok: false, message: "Apple Health native module unavailable.", stepsUpdated: 0, activeCalories: 0, workoutsImported: 0 };
  }

  const today = new Date();
  const start = addDays(today, -days + 1);
  let stepsUpdated = 0;
  let activeCalories = 0;

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const [steps, active] = await Promise.all([getDailySteps(HK, date), getActiveEnergy(HK, date)]);
    if (steps > 0) {
      await setStepsForDate(uid, ymd(date), steps);
      stepsUpdated += 1;
    }
    activeCalories += active;
    if (active > 0) {
      await addActivity(uid, {
        id: `apple-health-active-${ymd(date)}`,
        type: "other",
        minutes: 0,
        intensity: "moderate",
        calories: active,
        note: "Synced active calories from Apple Health",
        timestamp: new Date(`${ymd(date)}T12:00:00`).getTime(),
      });
    }
  }

  const workouts = await getWorkouts(HK, start, today);
  let workoutsImported = 0;
  for (const w of workouts) {
    const started = new Date(w.start || w.startDate || Date.now());
    const ended = new Date(w.end || w.endDate || started);
    const minutes = Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000));
    await addActivity(uid, {
      id: `apple-health-workout-${w.id || started.getTime()}`,
      type: mapWorkoutType(w.activityName || w.type),
      minutes,
      intensity: "moderate",
      calories: Math.round(Number(w.calories || 0)),
      note: `Synced ${w.activityName || "workout"} from Apple Health`,
      timestamp: started.getTime(),
    });
    workoutsImported += 1;
  }

  const [weightKg, bodyFatPct] = await Promise.all([getLatestWeightKg(HK), getLatestBodyFatPct(HK)]);
  const current = (await loadBodyMetrics()) || {};
  const patch: any = {};
  let weightLb: number | undefined;
  if (weightKg && weightKg > 0) {
    weightLb = weightKg * 2.20462;
    patch.weightLb = weightLb;
  }
  if (bodyFatPct && bodyFatPct > 0) {
    patch.bodyFatPct = bodyFatPct;
  }
  if (Object.keys(patch).length) {
    await saveBodyMetrics({ ...current, ...patch });
    await appendBodyMetricsHistory({ t: Date.now(), weightLb: patch.weightLb ?? current.weightLb, bodyFatPct: patch.bodyFatPct ?? current.bodyFatPct });
    await updateProfile(uid, {
      ...(weightKg ? { weightKg } : {}),
      ...(bodyFatPct ? { bodyFatPct } : {}),
      healthLastUpdatedVia: "Apple Health",
      healthLastUpdatedAt: Date.now(),
    } as any);
  }

  return { ok: true, stepsUpdated, activeCalories, workoutsImported, weightLb, bodyFatPct: bodyFatPct || undefined };
}
