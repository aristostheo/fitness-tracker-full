// components/scanMeal/ConfidenceLegend.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

function Pill({ label, desc }: { label: string; desc: string }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.05)",
        },
      ]}
    >
      <Text style={[styles.pillLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.pillDesc, { color: colors.muted }]}>{desc}</Text>
    </View>
  );
}

export default function ConfidenceLegend() {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Confidence</Text>
      <View style={styles.row}>
        <Pill label="High" desc="Looks clear" />
        <Pill label="Med" desc="Probably" />
        <Pill label="Low" desc="Needs review" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
  },
  title: { fontSize: 13.5, fontWeight: "900", marginBottom: 10 },
  row: { flexDirection: "row", gap: 8 },
  pill: { flex: 1, borderRadius: 12, padding: 10 },
  pillLabel: { fontSize: 12.5, fontWeight: "900" },
  pillDesc: { marginTop: 2, fontSize: 11.5, fontWeight: "600" },
});
