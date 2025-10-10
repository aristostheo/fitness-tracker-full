import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

export default function Tip({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        alignItems: "flex-start",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 10,
      }}
    >
      <Ionicons name="bulb-outline" size={16} color={colors.muted} />
      <Text style={{ color: colors.muted, fontSize: 12, flex: 1 }}>{text}</Text>
    </View>
  );
}
