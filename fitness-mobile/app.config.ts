import "dotenv/config";
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "fitness-mobile",
  slug: "fitness-mobile",
  scheme: "fitnessmobile",
  version: "1.0.0",
  orientation: "portrait",
  platforms: ["ios", "android"],
  plugins: ["expo-dev-client"],

  ios: {
    bundleIdentifier: "com.aristos.fitnessmobile",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSHealthShareUsageDescription:
        "We use Apple Health data (steps, energy, weight) to personalize goals and insights.",
      NSHealthUpdateUsageDescription:
        "We may write workouts or body metrics you choose to log to Apple Health.",
      NSCameraUsageDescription:
        "We use the camera to scan food barcodes to auto-fill nutrition.",
    },
  },

  extra: {
    FDC_API_KEY: process.env.FDC_API_KEY,
    AI_DESCRIBE_URL: process.env.AI_DESCRIBE_URL,
    eas: {
      projectId: "32f5a4f2-1672-4b2b-87d0-c97dc293f81d",
    },
  },
};

export default config;
