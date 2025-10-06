import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        // 👇 This makes each screen's base background follow the theme
        sceneContainerStyle: { backgroundColor: colors.background },
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
