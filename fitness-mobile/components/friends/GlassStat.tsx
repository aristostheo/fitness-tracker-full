import React from "react";
import { Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";

export function GlassStat({ label, value }: { label: string; value: string }) {
  const { colors, isDark } = useTheme();
  return (
    <BlurView
      intensity={isDark ? 22 : 44}
      style={{
        flex: 1,
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
        backgroundColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.70)",
        overflow: "hidden",
      }}
    >
      <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontWeight: "900",
          fontSize: 18,
          marginTop: 6,
          letterSpacing: -0.2,
        }}
      >
        {value}
      </Text>
    </BlurView>
  );
}
