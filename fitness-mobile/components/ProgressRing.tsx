import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/content/ThemeProvider";

export default function ProgressRing({
  label,
  value,
  target,
  unit,
  size = 140,
  stroke = 10,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  size?: number;
  stroke?: number;
}) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, (value || 0) / (target || 1)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <View
      style={{
        flex: 1,
        minWidth: 160,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ alignItems: "center" }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.border}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.primary}
            strokeWidth={stroke}
            strokeDasharray={`${dash}, ${c - dash}`}
            strokeLinecap="round"
            fill="none"
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        </Svg>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>
          {Math.round(value)} / {Math.round(target)} {unit}
        </Text>
        <Text style={{ color: colors.muted }}>{label}</Text>
      </View>
    </View>
  );
}
