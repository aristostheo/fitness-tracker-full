import React from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";

export type Timeframe = "7d" | "30d" | "all";

const TABS: { key: Timeframe; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "all", label: "All" },
];

export function TimeframePills({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (v: Timeframe) => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <BlurView
      intensity={isDark ? 22 : 44}
      style={{
        borderRadius: 16,
        padding: 6,
        flexDirection: "row",
        gap: 8,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
        backgroundColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.65)",
        overflow: "hidden",
      }}
    >
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(t.key);
            }}
            style={({ pressed }) => ({
              flex: 1,
              height: 38,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active
                ? isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.92)"
                : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active
                ? isDark
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(0,0,0,0.06)"
                : "transparent",
              opacity: pressed ? 0.92 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={`Show ${t.label}`}
            accessibilityState={{ selected: active }}
          >
            <Text
              style={{
                color: active ? colors.text : colors.muted,
                fontWeight: "900",
                letterSpacing: -0.1,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}
