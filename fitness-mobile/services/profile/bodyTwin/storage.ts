// services/bodyTwin/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BodyTwinState } from "./types";

const KEY = "bodyTwin:v1";

export async function loadBodyTwinState(): Promise<BodyTwinState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BodyTwinState;
  } catch {
    return null;
  }
}

export async function saveBodyTwinState(state: BodyTwinState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // swallow to avoid breaking UI
  }
}

export async function clearBodyTwinState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
