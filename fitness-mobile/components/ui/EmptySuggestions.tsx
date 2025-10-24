import React from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export type Suggestion = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export default function EmptySuggestions({
  emoji,
  title,
  subtitle,
  actions,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  actions: Suggestion[];
}) {
  const { colors, isDark } = useTheme();

  return (
    <BlurView
      intensity={24}
      tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
      style={{
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          padding: 16,
          alignItems: "center",
          gap: 10,
          backgroundColor: "transparent",
        }}
      >
        <Text style={{ fontSize: 42 }}>{emoji}</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: colors.muted, textAlign: "center" }}>
            {subtitle}
          </Text>
        )}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 6,
          }}
        >
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Ionicons name={a.icon} size={14} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </BlurView>
  );
}
