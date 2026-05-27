import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint?: string;
  onPress: () => void;
  color: string;
};

export function QuickActionRow({
  tokens,
  actions,
}: {
  tokens: {
    text: string;
    muted: string;
    hairline: string;
    card: string;
    tint: string;
    surface2?: string;
  };
  actions: QuickAction[];
  reduceMotion: boolean;
  maxWidth: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 16 }}
    >
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={a.onPress}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          accessibilityHint={a.hint || "Activates action"}
          hitSlop={10}
          style={({ pressed }) => ({
            opacity: pressed ? 0.94 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <View
            style={{
              width: 112,
              minHeight: 108,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 18,
              borderWidth: 1,
              borderColor: tokens.hairline,
              backgroundColor: tokens.card,
              gap: 16,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: tokens.surface2 || tokens.card,
                borderWidth: 1,
                borderColor: tokens.hairline,
              }}
            >
              <Ionicons name={a.icon} size={18} color={tokens.tint} />
            </View>

            <Text
              style={{ color: tokens.text, fontWeight: "500", fontSize: 14 }}
              numberOfLines={2}
            >
              {a.label}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
