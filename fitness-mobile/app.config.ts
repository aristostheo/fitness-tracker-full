// fitness-mobile/app.config.ts
import "dotenv/config";
import type { ExpoConfig } from "expo/config";
import fs from "fs";
import path from "path";

function has(pkg: string) {
  try {
    // Resolve from the app directory
    require.resolve(pkg, { paths: [__dirname] });
    return true;
  } catch {
    return false;
  }
}

const plugins: ExpoConfig["plugins"] = [
  // Add Health Connect plugin only if installed
  ...(has("expo-health-connect") ? (["expo-health-connect"] as any) : []),

  [
    "expo-build-properties",
    {
      android: { minSdkVersion: 28 },
      ios: { useFrameworks: "static" },
    },
  ],
];

const config: ExpoConfig = {
  name: "fitness-mobile",
  slug: "fitness-mobile",
  scheme: "fitnessmobile",
  version: "1.0.0",
  orientation: "portrait",
  platforms: ["ios", "android"],

  ios: {
    bundleIdentifier: "com.anonymous.fitness-mobile",
    infoPlist: {
      NSHealthShareUsageDescription:
        "We read your step count from the Health app to track your daily activity.",
      NSHealthUpdateUsageDescription:
        "We may write activity data you log in the app to the Health app (if you allow).",
    },
    entitlements: { "com.apple.developer.healthkit": true },
  },

  android: {
    package: "com.anonymous.fitness_mobile",
  },

  plugins,

  extra: {
    EXPO_PUBLIC_FDC_API_KEY: process.env.EXPO_PUBLIC_FDC_API_KEY,
    EXPO_PUBLIC_AI_DESCRIBE_URL: process.env.EXPO_PUBLIC_AI_DESCRIBE_URL,
  },
};

export default config;
