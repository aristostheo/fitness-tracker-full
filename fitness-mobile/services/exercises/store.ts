// services/exercises/store.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_FAVS = "exercises:favorites:v1";
const KEY_RECENTS = "exercises:recents:v1";

const clampList = (arr: string[], max: number) => arr.slice(0, max);

export async function loadFavorites(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(KEY_FAVS);
  if (!raw) return new Set();
  try {
    const ids = JSON.parse(raw) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export async function saveFavorites(ids: Set<string>) {
  await AsyncStorage.setItem(KEY_FAVS, JSON.stringify(Array.from(ids)));
}

export async function toggleFavorite(
  exerciseId: string,
  current: Set<string>
): Promise<Set<string>> {
  const next = new Set(current);
  if (next.has(exerciseId)) next.delete(exerciseId);
  else next.add(exerciseId);
  await saveFavorites(next);
  return next;
}

export async function loadRecents(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY_RECENTS);
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export async function addRecent(exerciseId: string): Promise<string[]> {
  const existing = await loadRecents();
  const next = [exerciseId, ...existing.filter((x) => x !== exerciseId)];
  const clamped = clampList(next, 25);
  await AsyncStorage.setItem(KEY_RECENTS, JSON.stringify(clamped));
  return clamped;
}

export async function clearRecents(): Promise<void> {
  await AsyncStorage.removeItem(KEY_RECENTS);
}
