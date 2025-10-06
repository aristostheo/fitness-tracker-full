import "react-native-reanimated";

import React, { useEffect } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/content/AuthContext"; // keep your path
import { ThemeProvider, useTheme } from "@/content/ThemeProvider";

function Gate() {
  const { user, initializing } = useAuth();
  const pathname = usePathname(); // e.g. "/(auth)/login"
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Treat these as the "auth stack" routes
  const AUTH_ROUTES = new Set(["/login", "/register", "/reset"]);
  const inAuth = AUTH_ROUTES.has(pathname ?? "");

  useEffect(() => {
    if (initializing) return;
    console.log("[gate] user:", !!user, "path:", pathname, "inAuth:", inAuth);

    if (user && inAuth) {
      router.replace("/(tabs)");
    } else if (!user && !inAuth) {
      router.replace("/(auth)/login");
    }
  }, [user, initializing, pathname]);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator color={colors.primary} />
        <Text style={{ marginTop: 8, color: colors.muted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 👈 global bg */}
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.background}
      />
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        {/* Background & status bar color come from ThemeProvider */}
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </View>
    </ThemeProvider>
  );
}
