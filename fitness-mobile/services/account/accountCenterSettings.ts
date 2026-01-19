// services/account/accountCenterSettings.ts
// Drop-in ✅ simple, calm persistence for Account Center privacy/social settings
// Uses AsyncStorage. Optionally, you can mirror to Firestore later.

import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProfileVisibility = "private" | "friends" | "public";

export type AccountCenterPrivacySettings = {
  profileVisibility: ProfileVisibility;
  shareWorkouts: boolean;
  shareNutrition: boolean;
  shareStreaks: boolean;
};

export const DEFAULT_PRIVACY_SETTINGS: AccountCenterPrivacySettings = {
  profileVisibility: "friends",
  shareWorkouts: true,
  shareNutrition: false,
  shareStreaks: true,
};

const KEY = (uid?: string) => `@acct_center_privacy_v1:${uid || "guest"}`;

export async function getAccountCenterPrivacySettings(
  uid?: string
): Promise<AccountCenterPrivacySettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY(uid));
    if (!raw) return DEFAULT_PRIVACY_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...parsed,
    } as AccountCenterPrivacySettings;
  } catch {
    return DEFAULT_PRIVACY_SETTINGS;
  }
}

export async function setAccountCenterPrivacySettings(
  uid: string | undefined,
  settings: AccountCenterPrivacySettings
) {
  await AsyncStorage.setItem(KEY(uid), JSON.stringify(settings));
}
