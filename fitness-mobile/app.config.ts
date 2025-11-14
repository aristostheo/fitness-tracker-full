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

  // Needed so your custom dev client works smoothly after prebuild
  plugins: ["expo-dev-client"],

  ios: {
    // For local dev this can be anything unique; change to your real id later.
    bundleIdentifier: "com.aristos.fitnessmobile",
    infoPlist: {
      NSHealthShareUsageDescription:
        "We use Apple Health data (steps, energy, weight) to personalize goals and insights.",
      NSHealthUpdateUsageDescription:
        "We may write workouts or body metrics you choose to log to Apple Health.",
      NSCameraUsageDescription:
        "We use the camera to scan food barcodes to auto-fill nutrition.",
    },
  },

  /**
   * EXPO_PUBLIC_* envs are auto-inlined at build time.
   * Keeping them in `extra` is fine for debugging / EAS.
   */
  extra: {
    EXPO_PUBLIC_FDC_API_KEY: process.env.EXPO_PUBLIC_FDC_API_KEY,
    EXPO_PUBLIC_AI_DESCRIBE_URL: process.env.EXPO_PUBLIC_AI_DESCRIBE_URL,
  },
};

export default config;
