// components/scanMeal/ScanMealHeader.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export default function ScanMealHeader({
  title,
  subtitle,
  onClose,
  onExplain,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onExplain: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={[
          styles.iconBtn,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="close" size={18} color={colors.text} />
      </Pressable>

      <View style={{ flex: 1, paddingHorizontal: 10 }}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle ? (
          <Text style={[styles.sub, { color: colors.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="How it works"
        onPress={onExplain}
        style={[
          styles.iconBtn,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={colors.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16.5, fontWeight: "800" },
  sub: { marginTop: 1, fontSize: 12.5, fontWeight: "600" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
