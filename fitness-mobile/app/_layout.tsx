// app/_layout.tsx
import "react-native-reanimated";

import React, { useEffect } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/content/AuthContext";
import { ThemeProvider, useTheme } from "@/content/ThemeProvider";
import { SettingsProvider } from "@/content/SettingsContext";

// 🔽 ensure a /users/{uid} doc exists after login
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// 🔹 Tiny, theme-aware glossy header background
function GlassHeaderBackground() {
  const { isDark } = useTheme();
  let BlurView: any = View;
  try {
    BlurView = require("expo-blur").BlurView;
  } catch {}

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Soft gradient so the header blends with page backgrounds */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? "rgba(12,14,20,0.75)"
              : "rgba(245,248,255,0.65)",
          },
        ]}
      />
      {/* Frosted blur layer */}
      <BlurView
        intensity={26}
        tint={isDark ? "dark" : "light"}
        style={[
          StyleSheet.absoluteFill,
          {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          },
        ]}
      />
    </View>
  );
}

function Gate() {
  const { user, initializing } = useAuth();
  const pathname = usePathname(); // e.g. "/(auth)/login"
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // ✅ Robust auth-route detection for Expo Router groups
  const inAuth =
    pathname?.startsWith("/(auth)") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/reset";

  // 🔽 Create profile doc once per sign-in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          email: u.email ?? null,
          displayName: u.displayName ?? null,
          photoURL: u.photoURL ?? null,
          createdAt: serverTimestamp(),
        });
      }
    });
    return unsub;
  }, []);

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

  // ⬇️ Use a Stack so we can set a global glossy header
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor="transparent"
        translucent
      />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.text, fontWeight: "800" },
          headerTintColor: colors.text,
          headerBackground: () => <GlassHeaderBackground />,
          // Allow content to slide under header a bit (nice with blur)
          // presentation / animation can still be overridden per-screen
        }}
      >
        {/* Tabs group usually provides its own header via (tabs)/_layout.tsx.
            We can hide the root header for the tabs container if needed. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Auth screens typically want no header */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        {/* Modals inherit the glossy header and can still be true modals */}
        <Stack.Screen
          name="(modals)"
          options={{
            presentation: "modal",
            // Keep the glass header in modals too
          }}
        />
        {/* Fallback for any other top-level routes */}
        <Stack.Screen name="+not-found" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <View style={{ flex: 1 }}>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </View>
      </ThemeProvider>
    </SettingsProvider>
  );
}
