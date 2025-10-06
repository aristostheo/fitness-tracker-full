// components/charts/MacrosStackedBars.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useTheme } from "@/content/ThemeProvider";

type Row = { label: string; protein: number; carbs: number; fat: number };

function withAlpha(hex: string, alpha: number) {
  // Convert #rrggbb (or #rgb) to rgba(r,g,b,a)
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

export default function MacrosStackedBars({ data }: { data: Row[] }) {
  const { colors } = useTheme();

  // palette: protein=success, carbs=primary, fat=amber-ish
  const cProtein = colors.success; // theme green
  const cCarbs = colors.primary; // theme primary
  const cFat = "#F59E0B"; // amber-500 (works in dark too)

  const height = 180;
  const barW = 22;
  const gap = 16;
  const padding = 16;
  const width = Math.max(320, data.length * (barW + gap) + padding * 2);

  const max = useMemo(
    () =>
      Math.max(
        1,
        ...data.map((d) =>
          Math.round((d.protein || 0) + (d.carbs || 0) + (d.fat || 0))
        )
      ),
    [data]
  );

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
        Macros per day
      </Text>

      <Svg width={width} height={height}>
        {/* faint baseline grid (3 steps) */}
        {Array.from({ length: 3 }).map((_, i) => {
          const y = height - padding - ((i + 1) / 3) * (height - padding * 2);
          return (
            <Rect
              key={i}
              x={padding}
              y={y}
              width={width - padding * 2}
              height={1}
              fill={withAlpha(colors.text, 0.08)}
            />
          );
        })}

        {data.map((d, i) => {
          const total = (d.protein || 0) + (d.carbs || 0) + (d.fat || 0);
          const scale = (height - padding * 2) / Math.max(1, max);

          const hP = (d.protein || 0) * scale;
          const hC = (d.carbs || 0) * scale;
          const hF = (d.fat || 0) * scale;

          const x = padding + i * (barW + gap);
          let y = height - padding;

          const seg = (h: number, key: "p" | "c" | "f") => {
            if (h <= 0) return null;
            y -= h;
            const fill = key === "p" ? cProtein : key === "c" ? cCarbs : cFat;
            return (
              <Rect
                key={key}
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={fill}
              />
            );
          };

          return (
            <React.Fragment key={i}>
              {seg(hF, "f")}
              {seg(hC, "c")}
              {seg(hP, "p")}
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
          { label: "Protein", swatch: cProtein },
          { label: "Carbs", swatch: cCarbs },
          { label: "Fat", swatch: cFat },
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
