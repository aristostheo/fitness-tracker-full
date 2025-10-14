// app/(tabs)/_layout.tsx
import React from "react";
import { StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let BlurView: any = null;
try {
  BlurView = require("expo-blur").BlurView;
} catch {}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const tabBarHeight = 58 + Math.max(0, insets.bottom - 8); // total visual height
  const tabBarPadBottom = Math.max(8, insets.bottom / 2);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        // ⬇️ This prevents content from being covered at the bottom
        sceneContainerStyle: {
          backgroundColor: colors.background,
          paddingBottom: tabBarHeight,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontWeight: "700" },

        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: tabBarPadBottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: "transparent",
          ...Platform.select({ android: { elevation: 5 } }),
        },
        tabBarBackground: () =>
          BlurView ? (
            <BlurView
              intensity={22}
              tint={isDark ? "dark" : "light"}
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: isDark
                    ? "rgba(12,14,20,0.55)"
                    : "rgba(245,248,255,0.55)",
                },
              ]}
            />
          ) : undefined,

        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === "index"
              ? "home-outline"
              : route.name === "workouts"
              ? "barbell-outline"
              : route.name === "nutrition"
              ? "fast-food-outline"
              : route.name === "insights"
              ? "analytics-outline"
              : "person-outline";
          return <Ionicons name={name as any} color={color} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts" }} />
      <Tabs.Screen name="nutrition" options={{ title: "Nutrition" }} />
      <Tabs.Screen name="insights" options={{ title: "Insights" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
