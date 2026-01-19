// components/profile/bodyMetrics/TrendMini.tsx
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

type Props = {
  title: string;
  points: number[]; // already filtered (e.g., last 30)
  format?: (v: number) => string;
  emptyLabel?: string;
};

export default function TrendMini({
  title,
  points,
  format,
  emptyLabel = "Add a couple check-ins to see trends.",
}: Props) {
  const { colors, isDark } = useTheme();

  const { min, max } = useMemo(() => {
    if (!points.length) return { min: 0, max: 0 };
    return { min: Math.min(...points), max: Math.max(...points) };
  }, [points]);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
          backgroundColor: isDark
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)",
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {!!points.length && (
          <Text style={[styles.range, { color: colors.muted }]}>
            {format
              ? format(points[points.length - 1])
              : `${points[points.length - 1]}`}
          </Text>
        )}
      </View>

      {!points.length ? (
        <Text style={[styles.empty, { color: colors.muted }]}>
          {emptyLabel}
        </Text>
      ) : (
        <View style={styles.bars}>
          {points.map((v, i) => {
            const denom = Math.max(0.0001, max - min);
            const t = (v - min) / denom;
            const h = 10 + t * 26; // 10..36
            return (
              <View
                key={`${i}`}
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(0,0,0,0.18)",
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: "800" },
  range: { fontSize: 12, fontWeight: "700" },
  empty: { fontSize: 12, lineHeight: 16 },
  bars: {
    height: 44,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  bar: {
    width: 6,
    borderRadius: 6,
  },
});
