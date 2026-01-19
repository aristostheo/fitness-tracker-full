import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

export function AlertsSectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors, isDark } = useTheme() as any;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      <View
        style={{
          marginTop: 10,
          height: StyleSheet.hairlineWidth,
          backgroundColor: withAlpha(colors.text, isDark ? 0.12 : 0.08),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sub: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
