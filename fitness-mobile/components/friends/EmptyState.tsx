import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingTop: 34, alignItems: "center" }}>
      <Ionicons name={icon} size={26} color={colors.muted} />
      <Text style={{ color: colors.text, fontWeight: "900", marginTop: 10 }}>
        {title}
      </Text>
      {!!subtitle && (
        <Text
          style={{ color: colors.muted, marginTop: 6, textAlign: "center" }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
