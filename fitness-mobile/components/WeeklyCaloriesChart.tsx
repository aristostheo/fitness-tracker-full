// components/WeeklyCaloriesChart.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line } from "react-native-svg";
import { useTheme } from "@/content/ThemeProvider";

type Point = { date: string; consumed: number; burned: number; net: number };

function withAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const parse = (s: string) => parseInt(s, 16);
  let r: number, g: number, b: number;
  if (h.length === 3) {
    r = parse(h[0] + h[0]);
    g = parse(h[1] + h[1]);
    b = parse(h[2] + h[2]);
  } else {
    r = parse(h.slice(0, 2));
    g = parse(h.slice(2, 4));
    b = parse(h.slice(4, 6));
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function WeeklyCaloriesChart({ data }: { data: Point[] }) {
  const { colors } = useTheme();

  const max = useMemo(
    () =>
      Math.max(
        1,
        ...data.map((d) =>
          Math.max(Math.round(d.consumed || 0), Math.round(d.burned || 0))
        )
      ),
    [data]
  );

  const barW = 12;
  const gap = 16;
  const padding = 16;
  const bottomPad = 22; // space above x-axis/baseline
  const height = 180;
  const width = Math.max(320, data.length * (barW * 2 + gap) + padding * 2);

  const chartH = height - padding - bottomPad;
  const baseY = padding + chartH;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 12,
        gap: 8,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ fontWeight: "700", color: colors.text }}>
        Weekly Calories
      </Text>

      <Svg width={width} height={height}>
        {/* grid lines at ~25/50/75% */}
        {[0.25, 0.5, 0.75].map((pct, i) => {
          const y = padding + chartH * (1 - pct);
          return (
            <Line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={withAlpha(colors.text, 0.08)}
              strokeWidth={1}
            />
          );
        })}

        {/* baseline */}
        <Line
          x1={padding}
          y1={baseY}
          x2={width - padding}
          y2={baseY}
          stroke={withAlpha(colors.text, 0.15)}
          strokeWidth={1}
        />

        {/* bars */}
        {data.map((d, i) => {
          const groupX = padding + i * (barW * 2 + gap);
          const hConsumed = Math.round(((d.consumed || 0) / max) * chartH);
          const hBurned = Math.round(((d.burned || 0) / max) * chartH);
          return (
            <React.Fragment key={i}>
              <Rect
                x={groupX}
                y={baseY - hConsumed}
                width={barW}
                height={hConsumed}
                fill={colors.chartPrimary}
                rx={3}
              />
              <Rect
                x={groupX + barW + 4}
                y={baseY - hBurned}
                width={barW}
                height={hBurned}
                fill={colors.chartSecondary}
                rx={3}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 4,
        }}
      >
        {[
          { label: "Consumed", swatch: colors.chartPrimary },
          { label: "Burned", swatch: colors.chartSecondary },
        ].map((it) => (
          <View
            key={it.label}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: it.swatch,
              }}
            />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {it.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
