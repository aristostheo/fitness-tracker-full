import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { withAlpha } from "@/lib/color";

export function AlertsEmptyState({
  colors,
  isDark,
}: {
  colors: any;
  isDark: boolean;
}) {
  return (
    <LinearGradient
      colors={[
        withAlpha(colors.primary, isDark ? 0.18 : 0.12),
        withAlpha(colors.card, isDark ? 0.45 : 0.78),
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        { borderColor: withAlpha(colors.primary, isDark ? 0.28 : 0.18) },
      ]}
    >
      <View style={styles.iconWrap} accessibilityElementsHidden>
        <Ionicons
          name="notifications-off-outline"
          size={18}
          color={withAlpha(colors.text, 0.9)}
        />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>No alerts</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        You’re up to date. When something matters—friend updates or
        time-sensitive nudges—it’ll show up here.
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  body: {
    marginTop: 6,
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 17,
  },
});
