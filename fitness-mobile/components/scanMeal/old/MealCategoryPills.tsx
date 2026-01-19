// components/scanMeal/MealCategoryPills.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";

export type MealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export default function MealCategoryPills({
  value,
  onChange,
}: {
  value: MealCategory;
  onChange: (v: MealCategory) => void;
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const items: MealCategory[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

  return (
    <View style={styles.row} accessibilityLabel="Meal category">
      {items.map((it) => {
        const active = it === value;
        return (
          <Pressable
            key={it}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(it);
            }}
            style={[styles.pill, active && styles.pillActive]}
            accessibilityRole="button"
            accessibilityLabel={`Set meal category to ${it}`}
          >
            <Text style={[styles.text, active && styles.textActive]}>{it}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  const hair = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  return StyleSheet.create({
    row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    pill: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
    },
    pillActive: {
      backgroundColor: colors.primary ?? (isDark ? "#fff" : "#000"),
      borderColor: "transparent",
    },
    text: { color: colors.text, fontWeight: "900" },
    textActive: { color: colors.primaryText ?? (isDark ? "#000" : "#fff") },
  });
}
