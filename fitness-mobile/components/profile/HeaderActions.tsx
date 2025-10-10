// fitness-mobile/components/profile/HeaderActions.tsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import Glass from "./ui/Glass";
import { router } from "expo-router";

export default function HeaderActions() {
  const { colors, isDark } = useTheme();

  const Btn = ({
    icon,
    label,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }) => (
    <Glass
      tint={isDark ? "dark" : "light"}
      intensity={24}
      radius={14}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderColor: colors.border,
        marginLeft: 8,
      }}
    >
      <Pressable
        onPress={onPress}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name={icon} size={16} color={colors.text} />
        <Text style={{ color: colors.text, fontWeight: "800" }}>{label}</Text>
      </Pressable>
    </Glass>
  );

  return (
    <View style={{ flexDirection: "row" }}>
      <Btn
        icon="person-circle-outline"
        label="Account"
        onPress={() => router.push("/(modals)/account")}
      />
      <Btn
        icon="settings-outline"
        label="Settings"
        onPress={() => router.push("/(modals)/settings")}
      />
    </View>
  );
}
