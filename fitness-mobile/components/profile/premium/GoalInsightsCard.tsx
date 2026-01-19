// components/profile/premium/GoalInsightsCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha } from "./ui";

type Targets = {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
};
type MacroMethod = "proteinPerKg" | "percent" | "cycling";

export function GoalInsightsCard(props: {
  isDark: boolean;
  macroMethod: MacroMethod;
  maintenance: Targets;
  activeTargets: Targets;
  goalType: "cut" | "maintain" | "lean_bulk" | "bulk";
  weeklyPace: number;
}) {
  const { colors, isDark } = useTheme();

  const delta = useMemo(() => {
    const d =
      (props.activeTargets?.calorieGoal ?? 0) -
      (props.maintenance?.calorieGoal ?? 0);
    return Math.round(d);
  }, [props.activeTargets, props.maintenance]);

  const deltaLabel = useMemo(() => {
    if (!delta) return "±0";
    return delta > 0 ? `+${delta}` : `${delta}`;
  }, [delta]);

  const direction = useMemo(() => {
    if (delta < -80) return "Deficit";
    if (delta > 80) return "Surplus";
    return "Neutral";
  }, [delta]);

  const methodLine = useMemo(() => {
    if (props.macroMethod === "proteinPerKg")
      return "Protein-first: stable, consistent, easy to follow.";
    if (props.macroMethod === "percent")
      return "Percent split: flexible ratios, good for preference-based eating.";
    return "Cycling: advanced approach — varies macros across days.";
  }, [props.macroMethod]);

  const safetyCopy = useMemo(() => {
    if (props.goalType === "cut")
      return "Focus on recovery + consistency. A small deficit is enough.";
    if (props.goalType === "bulk")
      return "Aim for a controlled surplus. Strength + sleep do the heavy lifting.";
    return "Maintain is a powerful phase. Build habits without pressure.";
  }, [props.goalType]);

  return (
    <GlassCard>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={colors.text}
        />
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
          Insights
        </Text>
      </View>

      <View style={{ height: 10 }} />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pill
          label="Maintenance"
          value={`${props.maintenance.calorieGoal} kcal`}
        />
        <Pill label={direction} value={`${deltaLabel} kcal`} emphasis />
      </View>

      <View style={{ height: 10 }} />

      <View
        style={[
          styles.block,
          {
            borderColor: withAlpha(colors.border, 0.7),
            backgroundColor: withAlpha(colors.card, isDark ? 0.16 : 0.65),
          },
        ]}
      >
        <Text style={{ color: colors.text, fontWeight: "900" }}>
          Macro method
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 18 }}>
          {methodLine}
        </Text>
      </View>

      <View style={{ height: 10 }} />

      <View
        style={[
          styles.block,
          {
            borderColor: withAlpha(colors.border, 0.7),
            backgroundColor: withAlpha(colors.card, isDark ? 0.16 : 0.65),
          },
        ]}
      >
        <Text style={{ color: colors.text, fontWeight: "900" }}>
          Supportive guidance
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 18 }}>
          {safetyCopy}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 18 }}>
          No guilt loops: the app prioritizes steady signals over daily noise.
        </Text>
      </View>
    </GlassCard>
  );
}

function Pill(props: { label: string; value: string; emphasis?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{props.label}</Text>
      <Text style={{ color: colors.text, fontWeight: "900", marginTop: 4 }}>
        {props.value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flex: 1, borderRadius: 16, padding: 10 },
  block: { borderRadius: 16, borderWidth: 1, padding: 12 },
});
