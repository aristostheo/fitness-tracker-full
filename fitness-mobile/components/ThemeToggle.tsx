// components/ThemeToggle.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

type Mode = "system" | "light" | "dark";

export default function ThemeToggle() {
  const { modeSetting, setModeSetting, colors } = useTheme();

  const Chip = ({ v, label }: { v: Mode; label: string }) => {
    const active = modeSetting === v;
    return (
      <Pressable
        onPress={() => setModeSetting(v)}
        hitSlop={8}
        style={{
          borderRadius: 999,
          borderWidth: 1,
          borderColor: active ? colors.chipActiveBg : colors.border,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: active ? colors.chipActiveBg : "transparent",
        }}
      >
        <Text
          style={{
            fontWeight: active ? "800" : "600",
            fontSize: 12,
            // if you want special text color for “light”, keep it readable; otherwise just use theme
            color: active ? colors.text : colors.muted,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        padding: 4,
        backgroundColor: colors.card,
      }}
    >
      <Chip v="system" label="System" />
      <Chip v="light" label="Light" />
      <Chip v="dark" label="Dark" />
    </View>
  );
}
