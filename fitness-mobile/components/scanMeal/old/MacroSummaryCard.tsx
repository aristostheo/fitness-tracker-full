// components/scanMeal/MacroSummaryCard.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { Layout, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import type { MacroTotals } from "@/services/scanMeal/types";

export default function MacroSummaryCard({ totals }: { totals: MacroTotals }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      layout={Layout.springify()}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.kcal}>{totals.calories} kcal</Text>
          <Text style={styles.sub}>Estimated totals</Text>
        </View>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setExpanded((v) => !v);
          }}
          style={styles.expandBtn}
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? "Hide macro details" : "Show macro details"
          }
        >
          <Text style={styles.expandText}>{expanded ? "Less" : "Details"}</Text>
        </Pressable>
      </View>

      <View style={styles.macroRow}>
        <MacroPill label="Protein" value={`${totals.protein}g`} />
        <MacroPill label="Carbs" value={`${totals.carbs}g`} />
        <MacroPill label="Fat" value={`${totals.fat}g`} />
      </View>

      {expanded && (
        <Animated.View entering={FadeIn.duration(140)} style={styles.details}>
          <DetailRow label="Fiber" value={`${totals.fiber} g`} />
          <DetailRow label="Sugar" value={`${totals.sugar} g`} />
          <DetailRow label="Sodium" value={`${totals.sodiumMg} mg`} />
          <DetailRow label="Sat fat" value={`${totals.satFat} g`} />
          <Text style={styles.note}>
            Estimates vary by brand, recipe, and cooking method. Always
            editable.
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  const { colors, isDark } = useTheme();
  const hair = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: hair,
        alignItems: "center",
      }}
      accessibilityLabel={`${label} ${value}`}
    >
      <Text
        style={{
          color:
            colors.muted ??
            (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)"),
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          marginTop: 4,
          color: colors.text,
          fontWeight: "900",
          fontSize: 16,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color:
            colors.muted ??
            (isDark ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.55)"),
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
      <Text style={{ color: colors.text, fontWeight: "900" }}>{value}</Text>
    </View>
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
      justifyContent: "space-between",
      alignItems: "center",
    },
    kcal: { color: colors.text, fontSize: 22, fontWeight: "1000" as any },
    sub: {
      marginTop: 4,
      color:
        colors.muted ??
        (isDark ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.55)"),
      fontWeight: "700",
    },

    expandBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
    },
    expandText: { color: colors.text, fontWeight: "900" },

    macroRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    details: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hair,
    },
    note: {
      marginTop: 10,
      color:
        colors.muted ??
        (isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.50)"),
      fontWeight: "700",
      lineHeight: 18,
    },
  });
}
