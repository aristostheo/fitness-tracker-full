// app/(auth)/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { useTheme } from "@/content/ThemeProvider";

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // keep the background consistent with your theme
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
