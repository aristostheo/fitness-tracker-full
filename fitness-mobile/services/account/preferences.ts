// services/account/preferences.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  reduceMotion: "account.reduceMotion",
  haptics: "account.haptics",
};

export async function getReduceMotion(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.reduceMotion);
  return v === "1";
}
export async function setReduceMotion(v: boolean) {
  await AsyncStorage.setItem(KEYS.reduceMotion, v ? "1" : "0");
}

export async function getHapticsEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.haptics);
  // default ON
  return v !== "0";
}
export async function setHapticsEnabled(v: boolean) {
  await AsyncStorage.setItem(KEYS.haptics, v ? "1" : "0");
}
