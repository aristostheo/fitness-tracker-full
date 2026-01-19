// components/exercises/FilterBar.tsx
import React, { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import type { ExerciseFilters } from "@/services/exercises/types";

type Chip = {
  key: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

const titleize = (s: string) =>
  s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type Props = {
  filters: ExerciseFilters;
  onChange: (next: ExerciseFilters) => void;
  // optional: if you later add a full advanced filters sheet
  onOpenAdvanced?: () => void;
};

export const FilterBar = memo(function FilterBar({
  filters,
  onChange,
  onOpenAdvanced,
}: Props) {
  const { colors, isDark } = useTheme();

  const chips: Chip[] = useMemo(() => {
    const muscle = filters.muscle ?? "all";
    const equipment = filters.equipment ?? "all";
    const hasDemo = !!filters.hasDemo;

    return [
      {
        key: "muscle",
        label: muscle === "all" ? "Muscle" : titleize(muscle),
        selected: muscle !== "all",
        icon: "body-outline",
        onPress: async () => {
          Haptics.selectionAsync().catch(() => {});
          // quick-cycle list (fast); replace with sheet later if you want
          const order = [
            "all",
            "chest",
            "back",
            "legs",
            "shoulders",
            "glutes",
            "biceps",
            "triceps",
            "abs",
            "lats",
          ];
          const idx = Math.max(0, order.indexOf(muscle));
          const next = order[(idx + 1) % order.length];
          onChange({ ...filters, muscle: next as any });
        },
      },
      {
        key: "equipment",
        label: equipment === "all" ? "Equipment" : titleize(equipment),
        selected: equipment !== "all",
        icon: "barbell-outline",
        onPress: async () => {
          Haptics.selectionAsync().catch(() => {});
          const order = [
            "all",
            "barbell",
            "dumbbell",
            "kettlebell",
            "cable-machine",
            "machine",
            "bodyweight",
            "band",
          ];
          const idx = Math.max(0, order.indexOf(equipment));
          const next = order[(idx + 1) % order.length];
          onChange({ ...filters, equipment: next as any });
        },
      },
      {
        key: "demo",
        label: hasDemo ? "Demo: On" : "Demo",
        selected: hasDemo,
        icon: "film-outline",
        onPress: async () => {
          Haptics.selectionAsync().catch(() => {});
          onChange({ ...filters, hasDemo: !hasDemo });
        },
      },
    ];
  }, [filters, onChange]);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {chips.map((c) => (
          <Pressable
            key={c.key}
            onPress={c.onPress}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: withAlpha(
                  colors.card,
                  c.selected ? (isDark ? 0.32 : 0.55) : isDark ? 0.22 : 0.4
                ),
                borderColor: withAlpha(
                  c.selected ? colors.primary : colors.border,
                  c.selected ? 0.55 : 0.6
                ),
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${c.label}`}
          >
            <Ionicons
              name={c.icon ?? "options-outline"}
              size={16}
              color={withAlpha(colors.text, c.selected ? 0.9 : 0.65)}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.chipText, { color: withAlpha(colors.text, 0.92) }]}
            >
              {c.label}
            </Text>
          </Pressable>
        ))}

        {onOpenAdvanced ? (
          <Pressable
            onPress={onOpenAdvanced}
            style={({ pressed }) => [
              styles.advBtn,
              {
                borderColor: withAlpha(colors.border, 0.65),
                backgroundColor: withAlpha(colors.card, isDark ? 0.18 : 0.32),
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open advanced filters"
          >
            {/* ✅ Ionicons-safe icon name */}
            <Ionicons
              name="options-outline"
              size={16}
              color={withAlpha(colors.text, 0.7)}
            />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  row: { paddingHorizontal: 0, gap: 10, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.2 },
  advBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
