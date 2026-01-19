// components/profile/premium/GlassCard.tsx
import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "./ui";

export function GlassCard({
  children,
  style,
  intensity = 18,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.wrap, style]}>
      <BlurView
        intensity={intensity}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.card,
          {
            backgroundColor: withAlpha(
              isDark ? "#0A1020" : "#FFFFFF",
              isDark ? 0.22 : 0.55
            ),
            borderColor: withAlpha(colors.border, isDark ? 0.35 : 0.7),
          },
        ]}
      >
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 22, overflow: "hidden" },
  card: {
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
  },
});
