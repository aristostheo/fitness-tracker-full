import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { MotiView } from "moti";
import { alpha, clamp, round1 } from "./utils";
import type { NutritionColors } from "./NutritionTheme";
import type { DayLog } from "./NutritionTypes";
import { GlassCard, softShadow } from "./Glass";
import { sumMacros } from "./utils";

type Props = {
  colors: NutritionColors;
  isDark: boolean;
  day: DayLog;
};

export default function RingSummaryCard({ colors, isDark, day }: Props) {
  const totals = useMemo(() => sumMacros(day.meals), [day.meals]);
  const goal = day.macroGoals;

  const calPct = clamp(
    goal.calories > 0 ? totals.calories / goal.calories : 0,
    0,
    1.5
  );
  const pPct = clamp(
    goal.protein > 0 ? totals.protein / goal.protein : 0,
    0,
    1.5
  );
  const cPct = clamp(goal.carbs > 0 ? totals.carbs / goal.carbs : 0, 0, 1.5);
  const fPct = clamp(goal.fat > 0 ? totals.fat / goal.fat : 0, 0, 1.5);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 420 }}
    >
      <GlassCard
        colors={colors}
        isDark={isDark}
        style={[{ marginHorizontal: 16 }, softShadow(isDark)]}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: alpha(colors.text, 0.7) }]}>
              TODAY
            </Text>
            <Text style={[styles.big, { color: colors.text }]}>
              {Math.round(totals.calories)} kcal
            </Text>
            <Text style={[styles.sub, { color: alpha(colors.text, 0.7) }]}>
              Goal {goal.calories} •{" "}
              {Math.max(0, goal.calories - Math.round(totals.calories))} left
            </Text>

            <View style={styles.macroRow}>
              <MacroPill
                label="P"
                value={`${round1(totals.protein)}g`}
                tint={colors.protein}
                colors={colors}
              />
              <MacroPill
                label="C"
                value={`${round1(totals.carbs)}g`}
                tint={colors.carbs}
                colors={colors}
              />
              <MacroPill
                label="F"
                value={`${round1(totals.fat)}g`}
                tint={colors.fat}
                colors={colors}
              />
            </View>
          </View>

          <Rings
            colors={colors}
            calPct={calPct}
            pPct={pPct}
            cPct={cPct}
            fPct={fPct}
            centerText={`${Math.round(clamp(calPct, 0, 1) * 100)}%`}
          />
        </View>
      </GlassCard>
    </MotiView>
  );
}

function MacroPill({
  label,
  value,
  tint,
  colors,
}: {
  label: string;
  value: string;
  tint: string;
  colors: NutritionColors;
}) {
  return (
    <View
      style={[
        styles.pill,
        { borderColor: alpha(tint, 0.35), backgroundColor: alpha(tint, 0.1) },
      ]}
    >
      <Text style={[styles.pillLabel, { color: alpha(colors.text, 0.75) }]}>
        {label}
      </Text>
      <Text style={[styles.pillValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function Rings({
  colors,
  calPct,
  pPct,
  cPct,
  fPct,
  centerText,
}: {
  colors: NutritionColors;
  calPct: number;
  pPct: number;
  cPct: number;
  fPct: number;
  centerText: string;
}) {
  const size = 86;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  function dash(pct: number) {
    const p = clamp(pct, 0, 1);
    return `${c * p} ${c}`;
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Nutrition progress rings"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={alpha(colors.text, 0.1)}
          strokeWidth={stroke}
          fill="transparent"
        />

        {/* Calories ring (outer-ish) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={dash(calPct)}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />

        {/* Protein / Carbs / Fat as subtle inner arcs */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r - 12}
          stroke={colors.protein}
          strokeWidth={6}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={dash(pPct)}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
          opacity={0.95}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r - 22}
          stroke={colors.carbs}
          strokeWidth={6}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={dash(cPct)}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
          opacity={0.9}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r - 32}
          stroke={colors.fat}
          strokeWidth={6}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={dash(fPct)}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
          opacity={0.85}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={[styles.centerText, { color: colors.text }]}>
          {centerText}
        </Text>
        <Text style={[styles.centerSub, { color: alpha(colors.text, 0.65) }]}>
          cal
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  big: { fontSize: 26, fontWeight: "900", letterSpacing: -0.4 },
  sub: { marginTop: 2, fontSize: 13, fontWeight: "700" },
  macroRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  pill: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  pillLabel: { fontSize: 12, fontWeight: "900" },
  pillValue: { fontSize: 12, fontWeight: "900" },
  center: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: { fontSize: 16, fontWeight: "900" },
  centerSub: { marginTop: -2, fontSize: 11, fontWeight: "800" },
});
