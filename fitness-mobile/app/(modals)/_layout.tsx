// =============================
// FILE: app/(modals)/_layout.tsx
// =============================
import React from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerTransparent: true,
        headerBlurEffect:
          Platform.OS === "ios" ? "systemChromeMaterial" : "regular",
        headerTitleAlign: "left",
        headerLargeTitle: Platform.OS === "ios",
        headerShadowVisible: false,
        headerBackground: () => (
          <BlurView
            intensity={30}
            tint={Platform.OS === "ios" ? "systemChromeMaterial" : "light"}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.12)", "rgba(0,0,0,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ position: "absolute", inset: 0 }}
            />
          </BlurView>
        ),
      }}
    >
      <Stack.Screen name="full-calendar" />
    </Stack>
  );
}
