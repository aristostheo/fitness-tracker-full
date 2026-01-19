// components/scanMeal/FoodRow.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import type { DetectedFood } from "@/components/scanMeal/new/types";

function confidenceMeta(conf: DetectedFood["confidence"]) {
  if (conf === "high")
    return { label: "High", icon: "checkmark-circle-outline" as const };
  if (conf === "medium")
    return { label: "Med", icon: "help-circle-outline" as const };
  if (conf === "low")
    return { label: "Low", icon: "alert-circle-outline" as const };
  return { label: "Manual", icon: "create-outline" as const };
}

export default function FoodRow({
  food,
  onPress,
  onRemove,
  onQuickAdjust,
}: {
  food: DetectedFood;
  onPress: () => void;
  onRemove: () => void;
  onQuickAdjust: (delta: number) => void;
}) {
  const { colors, isDark } = useTheme();
  const meta = useMemo(
    () => confidenceMeta(food.confidence),
    [food.confidence]
  );

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${food.name}`}
    >
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {food.name}
        </Text>

        <View
          style={[
            styles.conf,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          <Ionicons name={meta.icon} size={14} color={colors.muted} />
          <Text style={[styles.confText, { color: colors.muted }]}>
            {meta.label}
          </Text>
        </View>
      </View>

      <View style={styles.midRow}>
        <Text style={[styles.portion, { color: colors.muted }]}>
          {food.portion.amount} {food.portion.unit}
        </Text>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => onQuickAdjust(-1)}
            style={[styles.stepBtn, { borderColor: colors.border }]}
            accessibilityLabel="Decrease portion"
          >
            <Ionicons name="remove" size={16} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => onQuickAdjust(+1)}
            style={[styles.stepBtn, { borderColor: colors.border }]}
            accessibilityLabel="Increase portion"
          >
            <Ionicons name="add" size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.bottomRow}>
        <View style={styles.mini}>
          <Text style={[styles.miniVal, { color: colors.text }]}>
            {Math.round(food.macros.calories)}
          </Text>
          <Text style={[styles.miniLab, { color: colors.muted }]}>kcal</Text>
        </View>
        <View style={styles.mini}>
          <Text style={[styles.miniVal, { color: colors.text }]}>
            {food.macros.protein.toFixed(0)}
          </Text>
          <Text style={[styles.miniLab, { color: colors.muted }]}>P</Text>
        </View>
        <View style={styles.mini}>
          <Text style={[styles.miniVal, { color: colors.text }]}>
            {food.macros.carbs.toFixed(0)}
          </Text>
          <Text style={[styles.miniLab, { color: colors.muted }]}>C</Text>
        </View>
        <View style={styles.mini}>
          <Text style={[styles.miniVal, { color: colors.text }]}>
            {food.macros.fat.toFixed(0)}
          </Text>
          <Text style={[styles.miniLab, { color: colors.muted }]}>F</Text>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={onRemove}
          hitSlop={10}
          accessibilityLabel="Remove item"
        >
          <Ionicons name="trash-outline" size={18} color={colors.muted} />
        </Pressable>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.muted}
          style={{ marginLeft: 8 }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: { fontSize: 14.5, fontWeight: "900", flex: 1 },
  conf: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confText: { fontSize: 12, fontWeight: "800" },

  midRow: { marginTop: 10, flexDirection: "row", alignItems: "center" },
  portion: { fontSize: 12.5, fontWeight: "700" },
  stepper: { marginLeft: "auto", flexDirection: "row", gap: 8 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },

  bottomRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mini: { alignItems: "center", minWidth: 42 },
  miniVal: { fontSize: 13.5, fontWeight: "900" },
  miniLab: { fontSize: 11.5, fontWeight: "700", marginTop: 2 },
});
