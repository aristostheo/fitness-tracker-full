// components/home/QuickActionRow.tsx
import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

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
  reduceMotion,
}: {
  tokens: { text: string; muted: string; hairline: string; card: string };
  actions: QuickAction[];
  reduceMotion: boolean;
  maxWidth: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      indicatorStyle="white"
      contentContainerStyle={{ gap: 10, paddingRight: 16 }}
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
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          })}
        >
          <View
            style={{
              width: 112,
              borderRadius: 20,
              padding: 12,
              borderWidth: 1,
	              borderColor: withAlpha(a.color, 0.28),
	              backgroundColor: withAlpha(a.color, 0.11),
	              gap: 10,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
	                backgroundColor: withAlpha(a.color, 0.18),
	                borderWidth: 1,
	                borderColor: withAlpha(a.color, 0.32),
              }}
            >
              <Ionicons name={a.icon} size={18} color={a.color} />
            </View>

            <Text
              style={{ color: tokens.text, fontWeight: "900", fontSize: 13 }}
              numberOfLines={1}
            >
              {a.label}
            </Text>
            <Text
              style={{ color: tokens.muted, fontWeight: "800", fontSize: 11 }}
              numberOfLines={1}
            >
              Tap
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
