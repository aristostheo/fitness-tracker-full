// components/friends/premium/PremiumSegmented.tsx
// Drop-in ✅ calm premium segmented control

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

export type FriendsTabKey = "friends" | "requests" | "sent";

export function PremiumSegmented({
  value,
  onChange,
}: {
  value: FriendsTabKey;
  onChange: (v: FriendsTabKey) => void;
}) {
  const { colors, isDark } = useTheme();

  const items: { key: FriendsTabKey; label: string }[] = [
    { key: "friends", label: "Friends" },
    { key: "requests", label: "Requests" },
    { key: "sent", label: "Sent" },
  ];

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: colors.glassBorder,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <BlurView
        intensity={22}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFillObject}
      />
      {items.map((it) => {
        const active = value === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(it.key);
            }}
            style={({ pressed }) => [
              styles.item,
              active && {
                backgroundColor: withAlpha(colors.text, 0.12),
                borderColor: withAlpha(colors.text, 0.16),
              },
              pressed && !active
                ? { backgroundColor: withAlpha(colors.text, 0.06) }
                : null,
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: active ? colors.text : colors.muted },
              ]}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    padding: 4,
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  text: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
