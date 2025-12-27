// components/profile/v2/GlassSurface.tsx
import React from "react";
import { View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";

export function GlassSurface({
  children,
  style,
  intensity = 18,
  rounded = 18,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  rounded?: number;
}) {
  const { isDark } = useTheme();

  // If BlurView ever fails in your env, it’ll still render with View.
  const Shell: any = BlurView ?? View;

  return (
    <Shell
      intensity={intensity}
      tint={isDark ? "dark" : "light"}
      style={[
        {
          borderRadius: rounded,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </Shell>
  );
}
