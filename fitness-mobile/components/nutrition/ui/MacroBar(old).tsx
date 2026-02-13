import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import withAlpha from "../utils/withAlpha";

export default function MacroBar({
  protein,
  carbs,
  fat,
  compact,
}: {
  protein: number;
  carbs: number;
  fat: number;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const total = Math.max(1, protein + carbs + fat);
  const p = (protein / total) * 100;
  const c = (carbs / total) * 100;
  const f = (fat / total) * 100;

  return (
    <View style={{ marginTop: 10, gap: compact ? 6 : 8 }}>
      <View
        style={{
          height: compact ? 8 : 10,
          borderRadius: 999,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          flexDirection: "row",
        }}
      >
        <View
          style={{ width: `${p}%`, backgroundColor: withAlpha("#22c55e", 0.8) }}
        />
        <View
          style={{ width: `${c}%`, backgroundColor: withAlpha("#60a5fa", 0.8) }}
        />
        <View
          style={{
            width: `${f}%`,
            backgroundColor: withAlpha("#f97316", 0.85),
          }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Protein {Math.round(p)}%
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Carbs {Math.round(c)}%
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Fat {Math.round(f)}%
        </Text>
      </View>
    </View>
  );
}
