// services/badges/store.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UnlockMap, ProgressMap } from "./types";

const KEYS = {
  unlocks: "badges.unlocks.v1",
  progress: "badges.progress.v1",
  featured: "badges.featured.v1",
};

async function safeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function safeSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // non-critical
  }
}

export async function loadUnlocksLocal(): Promise<UnlockMap> {
  return safeGet(KEYS.unlocks, {});
}
export async function saveUnlocksLocal(unlocks: UnlockMap) {
  return safeSet(KEYS.unlocks, unlocks || {});
}

export async function loadProgressLocal(): Promise<ProgressMap> {
  return safeGet(KEYS.progress, {});
}
export async function saveProgressLocal(progress: ProgressMap) {
  return safeSet(KEYS.progress, progress || {});
}

export async function loadFeaturedLocal(): Promise<string[]> {
  return safeGet(KEYS.featured, []);
}
export async function saveFeaturedLocal(featured: string[]) {
  const next = Array.isArray(featured) ? featured.slice(0, 3) : [];
  return safeSet(KEYS.featured, next);
}
