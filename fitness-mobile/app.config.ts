// fitness-mobile/app.config.ts
import "dotenv/config";
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "fitness-mobile",
  slug: "fitness-mobile",
  scheme: "fitnessmobile",
  version: "1.0.0",
  orientation: "portrait",
  platforms: ["ios", "android"],

  /**
   * You don't actually need to put EXPO_PUBLIC_* values in `extra` for them
   * to be available in the app — Expo inlines them automatically.
   * Keeping them here is harmless and can help with debugging/eas.json.
   */
  extra: {
    EXPO_PUBLIC_FDC_API_KEY: process.env.EXPO_PUBLIC_FDC_API_KEY,
    EXPO_PUBLIC_AI_DESCRIBE_URL: process.env.EXPO_PUBLIC_AI_DESCRIBE_URL,
  },

  // keep any other fields you had (icons, plugins, etc.)
};

export default config;
