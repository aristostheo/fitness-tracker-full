// components/scanMeal/ExplainAIButton.tsx
import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export default function ExplainAIButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.btn,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
      accessibilityRole="button"
      accessibilityLabel="How the scan works"
    >
      <Ionicons
        name="shield-checkmark-outline"
        size={15}
        color={colors.muted}
      />
      <Text style={[styles.text, { color: colors.muted }]}>How it works</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  text: { fontSize: 12, fontWeight: "800" },
});
