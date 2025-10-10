// components/workouts/ui/Metric.tsx
import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
export function Metric({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}
