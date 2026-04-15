// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from "react";
import { StyleSheet, Platform, View, BackHandler } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/content/AuthContext";
import { subscribeUnreadCount } from "@/services/notifications";
import { withAlpha } from "@/components/workouts/utils/withAlpha";

let BlurView: any = null;
try {
  BlurView = require("expo-blur").BlurView;
} catch {}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }
    const unsub = subscribeUnreadCount(user.uid, setUnreadCount);
    return () => unsub && unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const onBackPress = () => {
      if (router.canGoBack?.()) {
        return false;
      }
      BackHandler.exitApp();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [router]);

  const tabBarHeight = 58 + Math.max(0, insets.bottom - 8); // total visual height
  const tabBarPadBottom = Math.max(8, insets.bottom / 2);
  const scenePaddingBottom = tabBarPadBottom + 20; // keep content off the bar without huge whitespace

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={({ route }) => ({
        headerShown: false,
        // ⬇️ This prevents content from being covered at the bottom
        sceneContainerStyle: {
          backgroundColor: colors.background,
          paddingBottom: scenePaddingBottom,
        },
        tabBarActiveTintColor: withAlpha(colors.primary, 0.9),
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
        tabBarHideOnKeyboard: true,
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
            route.name === "home"
              ? "home-outline"
              : route.name === "workouts"
              ? "barbell-outline"
              : route.name === "nutrition"
              ? "fast-food-outline"
              : route.name === "notifications"
              ? "notifications-outline"
              : "person-outline";
          const showBadge = route.name === "notifications" && unreadCount > 0;
          return (
            <View style={{ position: "relative" }}>
              <Ionicons name={name as any} color={color} size={size} />
              {showBadge ? (
                <View
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -6,
                    minWidth: 10,
                    height: 10,
                    borderRadius: 6,
                    backgroundColor: colors.primary,
                    borderWidth: 1,
                    borderColor: colors.background,
                  }}
                />
              ) : null}
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      {/* If you want the new home later, add <Tabs.Screen name="home" ... /> back */}
      <Tabs.Screen name="workouts" options={{ title: "Workouts" }} />
      <Tabs.Screen name="nutrition" options={{ title: "Nutrition" }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
