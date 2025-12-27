import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import type { NutritionColors } from "./NutritionTheme";
import type { DayLog } from "./NutritionTypes";
import { GlassCard, softShadow } from "./Glass";
import { alpha, clamp } from "./utils";

type Props = {
  colors: NutritionColors;
  isDark: boolean;
  day: DayLog;
  onAddMl: (delta: number) => void;
  onClear?: () => void;
};

export default function HydrationCard({ colors, isDark, day, onAddMl }: Props) {
  const pct = useMemo(
    () =>
      clamp(day.waterGoalMl > 0 ? day.waterMl / day.waterGoalMl : 0, 0, 1.5),
    [day.waterMl, day.waterGoalMl]
  );
  const pctShown = clamp(pct, 0, 1);

  const quick = [150, 250, 350];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 420, delay: 50 }}
    >
      <GlassCard
        colors={colors}
        isDark={isDark}
        style={[{ marginHorizontal: 16, marginTop: 14 }, softShadow(isDark)]}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: alpha(colors.text, 0.7) }]}>
              HYDRATION
            </Text>
            <Text style={[styles.big, { color: colors.text }]}>
              {Math.round(day.waterMl)} ml
            </Text>
            <Text style={[styles.sub, { color: alpha(colors.text, 0.7) }]}>
              Goal {day.waterGoalMl} •{" "}
              {Math.max(0, day.waterGoalMl - day.waterMl)} left
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <View
              style={[styles.bar, { backgroundColor: alpha(colors.text, 0.1) }]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pctShown * 100}%`,
                    backgroundColor: alpha(colors.water, 0.95),
                  },
                ]}
              />
            </View>
            <Text style={[styles.pct, { color: alpha(colors.text, 0.7) }]}>
              {Math.round(pctShown * 100)}%
            </Text>
          </View>
        </View>

        <View style={styles.quickRow}>
          {quick.map((ml) => (
            <Pressable
              key={ml}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAddMl(ml);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add ${ml} milliliters of water`}
              style={({ pressed }) => [
                styles.quickBtn,
                {
                  borderColor: alpha(colors.water, 0.3),
                  backgroundColor: alpha(colors.water, 0.1),
                },
                pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 },
              ]}
            >
              <Ionicons name="water" size={16} color={colors.water} />
              <Text style={[styles.quickText, { color: colors.text }]}>
                {ml} ml
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onAddMl(-250);
            }}
            accessibilityRole="button"
            accessibilityLabel="Remove 250 milliliters of water"
            style={({ pressed }) => [
              styles.quickBtn,
              {
                borderColor: alpha(colors.text, 0.14),
                backgroundColor: alpha(colors.card, isDark ? 0.1 : 0.65),
              },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons
              name="remove"
              size={16}
              color={alpha(colors.text, 0.85)}
            />
            <Text style={[styles.quickText, { color: colors.text }]}>Undo</Text>
          </Pressable>
        </View>

        <Text style={[styles.note, { color: alpha(colors.text, 0.6) }]}>
          Small steps count. A few sips between meals keeps you on track.
        </Text>
      </GlassCard>
    </MotiView>
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
  big: { fontSize: 22, fontWeight: "900", letterSpacing: -0.2 },
  sub: { marginTop: 2, fontSize: 13, fontWeight: "700" },
  bar: { height: 10, width: 110, borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999 },
  pct: { fontSize: 12, fontWeight: "900" },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  quickBtn: {
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  quickText: { fontSize: 13, fontWeight: "900" },
  note: { marginTop: 10, fontSize: 12, fontWeight: "700" },
});
