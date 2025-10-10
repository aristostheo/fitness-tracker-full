// components/profile/ui/SummaryCard.tsx
import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import Glass from "./Glass";

export default function SummaryCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  const { colors, isDark } = useTheme();
  const v =
    typeof value === "number" && !isNaN(value)
      ? Math.round(value)
      : String(value);

  return (
    <Glass
      tint={isDark ? "dark" : "light"}
      intensity={22}
      radius={14}
      style={{ paddingVertical: 12, paddingHorizontal: 14, minWidth: 120 }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "900",
            letterSpacing: 0.2,
          }}
        >
          {v} {unit || ""}
        </Text>
      </View>
    </Glass>
  );
}
