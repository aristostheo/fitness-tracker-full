import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

export type FriendsTabKey = "friends" | "requests" | "sent";

export function PremiumSegmented({
  value,
  onChange,
  requestCount = 0,
}: {
  value: FriendsTabKey;
  onChange: (v: FriendsTabKey) => void;
  requestCount?: number;
}) {
  const { colors } = useTheme();

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
          backgroundColor: "#1A1A24",
          borderColor: withAlpha(colors.text, 0.08),
        },
      ]}
    >
      {items.map((item) => {
        const active = value === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(item.key);
            }}
            style={({ pressed }) => [
              styles.item,
              pressed && !active
                ? { backgroundColor: withAlpha(colors.text, 0.04) }
                : null,
            ]}
          >
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.label,
                  { color: active ? colors.text : colors.muted },
                ]}
              >
                {item.label}
              </Text>
              {item.key === "requests" && requestCount > 0 ? (
                <View style={styles.badgeDot}>
                  <Text style={styles.badgeText}>{requestCount}</Text>
                </View>
              ) : null}
            </View>
            <View
              style={[
                styles.underline,
                {
                  opacity: active ? 1 : 0,
                  backgroundColor: "#6C63FF",
                },
              ]}
            />
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
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    minHeight: 58,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingTop: 8,
    paddingBottom: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  underline: {
    marginTop: 8,
    width: 28,
    height: 3,
    borderRadius: 999,
  },
  badgeDot: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 10,
  },
});
