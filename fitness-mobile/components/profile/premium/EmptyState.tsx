// components/profile/premium/EmptyState.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "./ui";

export function EmptyState(props: {
  title: string;
  message: string;
  icon: any;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: withAlpha(colors.border, 0.7),
          backgroundColor: withAlpha(colors.card, isDark ? 0.16 : 0.65),
        },
      ]}
      accessibilityRole="text"
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: withAlpha(colors.primary, 0.14) },
        ]}
      >
        <Ionicons name={props.icon} size={16} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "900" }}>
          {props.title}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 16 }}>
          {props.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
