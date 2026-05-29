import "dotenv/config";
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Somata",
  slug: "fitness-mobile",
  scheme: "fitnessmobile",
  version: "1.0.0",
  orientation: "portrait",
  platforms: ["ios", "android"],
  icon: "./assets/images/icon.png",
  splash: {
    image: "./assets/images/icon.png",
    resizeMode: "contain",
    backgroundColor: "#0a0812",
  },

  plugins: [
    "expo-dev-client",
    "expo-build-properties",
    "expo-font",
    "expo-router",
    "expo-web-browser",
    [
      "react-native-health",
      {
        healthSharePermission:
          "Fitness Mobile reads Apple Health data you approve, including steps, workouts, energy, weight, body fat, heart rate, and sleep, to sync your fitness dashboard.",
        healthUpdatePermission:
          "Fitness Mobile may write workouts or body metrics only when you explicitly choose to export them.",
      },
    ],
  ],

  ios: {
    icon: "./assets/images/icon.png",
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

  android: {
    icon: "./assets/images/icon.png",
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#0a0812",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },

  updates: {
    url: "https://u.expo.dev/32f5a4f2-1672-4b2b-87d0-c97dc293f81d",
  },

  runtimeVersion: {
    policy: "appVersion",
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
