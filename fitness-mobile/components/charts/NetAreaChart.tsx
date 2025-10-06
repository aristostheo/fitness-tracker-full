// components/charts/NetAreaChart.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";
import Svg, { Path, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "@/content/ThemeProvider";

type Row = { label: string; net: number };

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

export default function NetAreaChart({ data }: { data: Row[] }) {
  const { colors } = useTheme();

  const width = Math.max(320, data.length * 44);
  const height = 180;
  const padding = 16;

  const { maxAbs, pathD } = useMemo(() => {
    const maxAbs = Math.max(
      1,
      ...data.map((d) => Math.abs(Math.round(d.net || 0)))
    );
    const w = width - padding * 2;
    const h = height - padding * 2;
    const baseY = padding + h / 2;

    const xFor = (i: number) =>
      padding + (i / Math.max(1, data.length - 1)) * w;
    const yFor = (v: number) => baseY - (v / maxAbs) * (h / 2);

    let d = `M ${xFor(0)} ${baseY} `;
    data.forEach((row, i) => {
      d += `L ${xFor(i)} ${yFor(row.net || 0)} `;
    });
    d += `L ${xFor(data.length - 1)} ${baseY} Z`;
    return { maxAbs, pathD: d };
  }, [data, width, height, padding]);

  const baseY = height / 2;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 12,
        gap: 8,
      }}
    >
      <Text style={{ fontWeight: "700", color: colors.text }}>
        Net calories (last 7 days)
      </Text>

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="5%" stopColor={colors.primary} stopOpacity={0.35} />
            <Stop offset="95%" stopColor={colors.primary} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {/* middle baseline */}
        <Line
          x1={0}
          y1={baseY}
          x2={width}
          y2={baseY}
          stroke={withAlpha(colors.text, 0.15)}
          strokeWidth={1}
        />

        {/* outline path + fill */}
        <Path
          d={pathD}
          fill="url(#netFill)"
          stroke={colors.primary}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}
