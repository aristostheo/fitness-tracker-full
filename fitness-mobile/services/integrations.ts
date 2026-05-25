import AsyncStorage from "@react-native-async-storage/async-storage";

import { syncAppleHealthToApp } from "@/services/appleHealth";

export type IntegrationStatus = "connected" | "disconnected" | "warning" | "error" | "syncing";
export type SyncFrequency = "live" | "15min" | "hourly" | "manual";
export type ConflictPolicy = "highest" | "recent" | "apple" | "ask";

export type IntegrationDef = {
  id: string;
  name: string;
  group: "health" | "wearable" | "scale";
  platform?: "ios" | "android";
  icon: string;
  iconBg: string;
  description: string;
  fields: string[];
  primaryEligible?: boolean;
  warning?: string;
};

export type IntegrationConnection = {
  id: string;
  status: IntegrationStatus;
  connected: boolean;
  lastSyncedAt?: number;
  failCount?: number;
  primary?: boolean;
  lastError?: string;
};

const IMPLEMENTED_INTEGRATIONS = new Set(["apple_health"]);

export type IntegrationSettings = {
  frequency: SyncFrequency;
  conflictPolicy: ConflictPolicy;
  backgroundSync: boolean;
  activeCaloriesAdjustment: boolean;
  onboardingDone: boolean;
  lastFullSyncAt?: number;
};

export type IntegrationSnapshot = {
  connections: Record<string, IntegrationConnection>;
  settings: IntegrationSettings;
};

const KEY = "integrations:v1";
const listeners = new Set<(snapshot: IntegrationSnapshot) => void>();

export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    group: "health",
    platform: "ios",
    icon: "heart",
    iconBg: "#F44336",
    description: "Syncs steps, workouts, heart rate, sleep, weight, and calories burned",
    fields: ["Steps", "Active calories", "Resting calories", "Workouts", "Heart rate", "Sleep", "Weight", "Body fat %"],
    primaryEligible: true,
  },
  {
    id: "google_fit",
    name: "Google Fit",
    group: "health",
    platform: "android",
    icon: "fitness",
    iconBg: "#4CAF50",
    description: "Syncs steps, workouts, heart rate, and calories",
    fields: ["Steps", "Calories burned", "Workouts", "Heart rate", "Weight"],
    primaryEligible: true,
  },
  {
    id: "garmin",
    name: "Garmin Connect",
    group: "health",
    icon: "watch",
    iconBg: "#22D3EE",
    description: "Syncs detailed workout data, steps, heart rate, sleep, and stress scores",
    fields: ["Steps", "Workouts", "Heart rate", "Sleep", "Stress score", "VO2 max", "Body battery"],
    primaryEligible: true,
  },
  {
    id: "fitbit",
    name: "Fitbit / Pixel Watch",
    group: "health",
    icon: "pulse",
    iconBg: "#00B0B9",
    description: "Syncs steps, sleep, heart rate zones, and active minutes",
    fields: ["Steps", "Sleep stages", "Heart rate zones", "Active minutes", "Calories"],
  },
  {
    id: "whoop",
    name: "Whoop",
    group: "health",
    icon: "battery-charging",
    iconBg: "#6C63FF",
    description: "Syncs recovery score, strain, sleep performance, and HRV",
    fields: ["Recovery %", "Strain score", "Sleep performance", "HRV", "Resting heart rate"],
  },
  {
    id: "oura",
    name: "Oura Ring",
    group: "health",
    icon: "ellipse",
    iconBg: "#8B5CF6",
    description: "Syncs readiness score, sleep stages, HRV, and activity",
    fields: ["Readiness score", "Sleep stages", "HRV", "Activity", "Body temperature"],
  },
  {
    id: "strava",
    name: "Strava",
    group: "health",
    icon: "navigate",
    iconBg: "#FC4C02",
    description: "Syncs running, cycling, and cardio workouts with route and pace data",
    fields: ["Workout type", "Duration", "Distance", "Pace", "Calories burned", "Route map"],
  },
  {
    id: "myfitnesspal",
    name: "MyFitnessPal",
    group: "health",
    icon: "restaurant",
    iconBg: "#1976D2",
    description: "Import your food log to avoid double entry",
    fields: ["Meals logged", "Calories", "Macros"],
    warning: "If both apps log food, disable one to avoid duplicates.",
  },
  {
    id: "cronometer",
    name: "Cronometer",
    group: "health",
    icon: "nutrition",
    iconBg: "#FFC107",
    description: "Syncs detailed micronutrient data for deeper nutrition tracking",
    fields: ["Meals", "Macros", "Vitamins", "Minerals"],
  },
  {
    id: "peloton",
    name: "Peloton",
    group: "health",
    icon: "bicycle",
    iconBg: "#E53935",
    description: "Syncs cycling and strength classes with output and calories",
    fields: ["Workout type", "Duration", "Output", "Calories", "Heart rate"],
  },
  {
    id: "apple_watch",
    name: "Apple Watch",
    group: "wearable",
    icon: "watch",
    iconBg: "#111827",
    description: "Direct sync for workouts, heart rate, and activity rings",
    fields: ["Workouts", "HR", "Activity rings", "Stand hours"],
  },
  {
    id: "galaxy_watch",
    name: "Samsung Galaxy Watch",
    group: "wearable",
    icon: "watch",
    iconBg: "#2563EB",
    description: "Syncs workouts, steps, sleep, and body composition",
    fields: ["Workouts", "Steps", "Sleep", "Body composition"],
  },
  {
    id: "polar",
    name: "Polar",
    group: "wearable",
    icon: "radio",
    iconBg: "#DC2626",
    description: "Syncs training load, HR zones, and recovery status",
    fields: ["Training load", "HR zones", "Recovery"],
  },
  {
    id: "suunto",
    name: "Suunto",
    group: "wearable",
    icon: "map",
    iconBg: "#0F172A",
    description: "Syncs outdoor workouts, GPS routes, and fitness estimates",
    fields: ["Workouts", "GPS", "VO2 max"],
  },
  {
    id: "withings",
    name: "Withings Body+",
    group: "scale",
    icon: "scale",
    iconBg: "#38BDF8",
    description: "Syncs weight, body fat %, muscle mass, and BMI automatically",
    fields: ["Weight", "Body fat %", "Muscle mass", "BMI"],
  },
  {
    id: "renpho",
    name: "Renpho",
    group: "scale",
    icon: "scale",
    iconBg: "#A855F7",
    description: "Syncs weight and body composition metrics via Bluetooth",
    fields: ["Weight", "Body fat %", "Body composition"],
  },
  {
    id: "garmin_index",
    name: "Garmin Index",
    group: "scale",
    icon: "scale",
    iconBg: "#06B6D4",
    description: "Syncs weight and body fat directly to your profile",
    fields: ["Weight", "Body fat %"],
  },
];

const defaultSettings: IntegrationSettings = {
  frequency: "15min",
  conflictPolicy: "highest",
  backgroundSync: false,
  activeCaloriesAdjustment: false,
  onboardingDone: false,
};

function emptySnapshot(): IntegrationSnapshot {
  return { connections: {}, settings: defaultSettings };
}

async function readSnapshot() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return emptySnapshot();
  try {
    const parsed = JSON.parse(raw) as IntegrationSnapshot;
    return {
      connections: parsed.connections || {},
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
    };
  } catch {
    return emptySnapshot();
  }
}

async function writeSnapshot(snapshot: IntegrationSnapshot) {
  await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
  listeners.forEach((cb) => cb(snapshot));
}

export async function getIntegrationSnapshot() {
  return readSnapshot();
}

export function subscribeIntegrations(cb: (snapshot: IntegrationSnapshot) => void) {
  let active = true;
  readSnapshot().then((snapshot) => active && cb(snapshot));
  listeners.add(cb);
  return () => {
    active = false;
    listeners.delete(cb);
  };
}

export async function setIntegrationConnected(id: string, connected: boolean, uid?: string) {
  const snapshot = await readSnapshot();
  const previous = snapshot.connections[id] || { id, status: "disconnected", connected: false };
  if (id === "apple_health" && connected && uid) {
    snapshot.connections[id] = { ...previous, id, connected: true, status: "syncing" };
    await writeSnapshot(snapshot);
    const result = await syncAppleHealthToApp(uid, 14);
    const latest = await readSnapshot();
    latest.connections[id] = {
      ...latest.connections[id],
      id,
      connected: result.ok,
      status: result.ok ? "connected" : "warning",
      lastSyncedAt: result.ok ? Date.now() : latest.connections[id]?.lastSyncedAt,
      failCount: result.ok ? 0 : (latest.connections[id]?.failCount || 0) + 1,
      lastError: result.ok ? undefined : result.message || "Apple Health sync failed.",
    };
    if (result.ok && !Object.values(latest.connections).some((c) => c.primary)) {
      latest.connections[id].primary = true;
    }
    await writeSnapshot(latest);
    return result;
  }
  if (connected && !IMPLEMENTED_INTEGRATIONS.has(id)) {
    snapshot.connections[id] = {
      ...previous,
      id,
      connected: false,
      status: "warning",
      lastSyncedAt: previous.lastSyncedAt,
      failCount: previous.failCount,
      lastError: "This integration is not live yet. Apple Health is the only working source right now.",
    };
    await writeSnapshot(snapshot);
    return { ok: false, message: snapshot.connections[id].lastError };
  }
  snapshot.connections[id] = {
    ...previous,
    id,
    connected,
    status: connected ? "connected" : "disconnected",
    lastSyncedAt: connected ? Date.now() : previous.lastSyncedAt,
    failCount: connected ? 0 : previous.failCount,
    lastError: connected ? undefined : previous.lastError,
  };
  if (connected && !Object.values(snapshot.connections).some((c) => c.primary)) {
    snapshot.connections[id].primary = true;
  }
  await writeSnapshot(snapshot);
  return { ok: true };
}

export async function markPrimaryIntegration(id: string) {
  const snapshot = await readSnapshot();
  Object.keys(snapshot.connections).forEach((key) => {
    snapshot.connections[key].primary = key === id;
  });
  if (snapshot.connections[id]) snapshot.connections[id].primary = true;
  await writeSnapshot(snapshot);
}

export async function updateIntegrationSettings(patch: Partial<IntegrationSettings>) {
  const snapshot = await readSnapshot();
  snapshot.settings = { ...snapshot.settings, ...patch };
  await writeSnapshot(snapshot);
}

export async function runIntegrationSync(uid?: string) {
  const snapshot = await readSnapshot();
  const now = Date.now();
  Object.values(snapshot.connections).forEach((c) => {
    if (!c.connected) return;
    c.status = "syncing";
  });
  await writeSnapshot({ ...snapshot });
  setTimeout(async () => {
    const next = await readSnapshot();
    if (uid && next.connections.apple_health?.connected) {
      const result = await syncAppleHealthToApp(uid, 14);
      next.connections.apple_health.status = result.ok ? "connected" : "warning";
      next.connections.apple_health.failCount = result.ok ? 0 : (next.connections.apple_health.failCount || 0) + 1;
      next.connections.apple_health.lastError = result.ok ? undefined : result.message || "Apple Health sync failed.";
      next.connections.apple_health.lastSyncedAt = result.ok ? now : next.connections.apple_health.lastSyncedAt;
    }
    Object.values(next.connections).forEach((c) => {
      if (!c.connected) return;
      c.status = c.failCount && c.failCount >= 3 ? "error" : c.status === "warning" ? "warning" : "connected";
      if (c.id !== "apple_health") c.lastSyncedAt = now;
    });
    next.settings.lastFullSyncAt = now;
    await writeSnapshot(next);
  }, 450);
}

export function connectedCount(snapshot: IntegrationSnapshot) {
  return Object.values(snapshot.connections).filter((c) => c.connected).length;
}

export function syncHealth(snapshot: IntegrationSnapshot) {
  const connected = Object.values(snapshot.connections).filter((c) => c.connected);
  if (connected.some((c) => c.status === "error")) return "error";
  if (connected.some((c) => c.status === "syncing")) return "syncing";
  return connected.length ? "ready" : "none";
}

export function formatLastSync(ts?: number) {
  if (!ts) return "Never";
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
