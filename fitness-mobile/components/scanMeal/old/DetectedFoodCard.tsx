// components/scanMeal/DetectedFoodCard.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import type { DetectedFood } from "@/services/scanMeal/types";

type Props = {
  food: DetectedFood;
  onChange: (patch: Partial<DetectedFood>) => void;
  onRemove: () => void;
  children?: React.ReactNode; // PortionControl slot
};

export default function DetectedFoodCard({
  food,
  onChange,
  onRemove,
  children,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [editingName, setEditingName] = useState(false);

  const confidenceLabel =
    food.confidence === "high"
      ? "High"
      : food.confidence === "med"
      ? "Medium"
      : food.confidence === "low"
      ? "Low"
      : "Manual";
  const confidenceTone =
    food.confidence === "high"
      ? styles.confHigh
      : food.confidence === "med"
      ? styles.confMed
      : food.confidence === "low"
      ? styles.confLow
      : styles.confManual;

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      layout={Layout.springify()}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.confPill, confidenceTone]}>
              <Text style={styles.confText}>{confidenceLabel}</Text>
            </View>

            {!editingName ? (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setEditingName(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Edit food name, currently ${food.name}`}
              >
                <Text style={styles.foodName} numberOfLines={1}>
                  {food.name}
                </Text>
              </Pressable>
            ) : (
              <TextInput
                value={food.name}
                onChangeText={(t) => onChange({ name: t })}
                autoFocus
                onBlur={() => setEditingName(false)}
                style={styles.nameInput}
                placeholder="Food name"
                placeholderTextColor={
                  isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)"
                }
              />
            )}
          </View>

          {/* Suggestions */}
          {!!food.suggestions?.length && (
            <View style={styles.suggestionRow}>
              {food.suggestions.slice(0, 4).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    onChange({ name: s, confidence: "manual" });
                  }}
                  style={styles.suggestionChip}
                  accessibilityRole="button"
                  accessibilityLabel={`Use suggestion ${s}`}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={onRemove}
          style={styles.removeBtn}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${food.name}`}
          hitSlop={10}
        >
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 12 }}>{children}</View>

      <View style={styles.miniMacroRow}>
        <Text style={styles.miniMacroText}>
          Est. per serving: {food.macros.calories ?? 0} kcal • P{" "}
          {food.macros.protein ?? 0} • C {food.macros.carbs ?? 0} • F{" "}
          {food.macros.fat ?? 0}
        </Text>
      </View>
    </Animated.View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  const hair = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  return StyleSheet.create({
    card: {
      padding: 14,
      borderRadius: 20,
      backgroundColor:
        colors.surface ??
        (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
    },
    foodName: {
      color: colors.text,
      fontWeight: "900",
      fontSize: 15,
      maxWidth: 220,
    },
    nameInput: {
      color: colors.text,
      fontWeight: "900",
      fontSize: 15,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
      minWidth: 160,
    },

    confPill: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    confText: { color: colors.text, fontWeight: "900", fontSize: 12 },
    confHigh: {
      backgroundColor: isDark ? "rgba(76,175,80,0.12)" : "rgba(76,175,80,0.16)",
      borderColor: isDark ? "rgba(76,175,80,0.28)" : "rgba(76,175,80,0.32)",
    },
    confMed: {
      backgroundColor: isDark ? "rgba(3,169,244,0.12)" : "rgba(3,169,244,0.16)",
      borderColor: isDark ? "rgba(3,169,244,0.28)" : "rgba(3,169,244,0.32)",
    },
    confLow: {
      backgroundColor: isDark ? "rgba(255,193,7,0.12)" : "rgba(255,193,7,0.18)",
      borderColor: isDark ? "rgba(255,193,7,0.28)" : "rgba(255,193,7,0.34)",
    },
    confManual: {
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      borderColor: hair,
    },

    suggestionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    suggestionChip: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
    },
    suggestionText: { color: colors.text, fontWeight: "800", fontSize: 12 },

    removeBtn: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: isDark ? "rgba(244,67,54,0.14)" : "rgba(244,67,54,0.12)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? "rgba(244,67,54,0.30)" : "rgba(244,67,54,0.25)",
      alignSelf: "flex-start",
    },
    removeText: { color: colors.text, fontWeight: "900", fontSize: 12 },

    miniMacroRow: { marginTop: 12 },
    miniMacroText: {
      color:
        colors.muted ??
        (isDark ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.55)"),
      fontWeight: "700",
    },
  });
}
