// components/ThemeToggle.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

export default function ThemeToggle() {
  const { modeSetting, setModeSetting, colors } = useTheme();
  const Chip = ({
    v,
    label,
  }: {
    v: "system" | "light" | "dark";
    label: string;
  }) => {
    const active = modeSetting === v;
    return (
      <Pressable
        onPress={() => setModeSetting(v)}
        style={{
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: 6,
          paddingHorizontal: 12,
          backgroundColor: active ? colors.text : "transparent",
        }}
      >
        <Text
          style={{
            color: active ? (v === "light" ? "#fff" : "000") : colors.text,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Chip v="system" label="System" />
      <Chip v="light" label="Light" />
      <Chip v="dark" label="Dark" />
    </View>
  );
}
