// components/profile/premium/FriendsPreviewCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha } from "./ui";

export function FriendsPreviewCard(props: {
  onPressAll: () => void;
  friendsCount?: number;
  streakPings?: number;
  previewFriends?: Array<{ name?: string | null; email?: string | null }>;
}) {
  const { colors, isDark } = useTheme();

  const friends = props.friendsCount ?? 0;
  const pings = props.streakPings ?? 0;
  const previewFriends = props.previewFriends ?? [];

  const subtitle = useMemo(() => {
    if (friends <= 0) return "Add supportive friends";
    if (pings > 0)
      return `${pings} gentle ping${pings === 1 ? "" : "s"} waiting`;
    return "Quiet support";
  }, [friends, pings]);

  return (
    <GlassCard>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
          Friends
        </Text>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            props.onPressAll();
          }}
          style={({ pressed }) => [
            styles.btn,
            {
              marginLeft: "auto",
              backgroundColor: withAlpha(
                colors.card,
                isDark ? (pressed ? 0.22 : 0.18) : pressed ? 0.7 : 0.55
              ),
              borderColor: withAlpha(colors.border, 0.7),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open friends"
        >
          <Ionicons
            name="chevron-forward-outline"
            size={16}
            color={colors.text}
          />
        </Pressable>
      </View>

      <Text style={{ color: colors.muted, marginTop: 6 }}>{subtitle}</Text>

      <View style={{ height: 12 }} />

      <View
        style={[
          styles.preview,
          { backgroundColor: withAlpha(colors.border, isDark ? 0.12 : 0.2) },
        ]}
      >
        {friends > 0 ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            {(previewFriends.length
              ? previewFriends
              : Array.from({ length: Math.min(3, friends) }).map(() => null)
            )
              .slice(0, 3)
              .map((f, idx) => {
                const seed = f?.name || f?.email || "Friend";
                const parts = seed
                  .replace(/@.*/, "")
                  .split(/\s|[._-]/)
                  .filter(Boolean);
                const initials = `${(parts[0]?.[0] || "F").toUpperCase()}${
                  (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase()
                }`;
                return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor: withAlpha(
                      colors.text,
                      isDark ? 0.08 : 0.06
                    ),
                    borderColor: withAlpha(colors.border, 0.7),
                  },
                ]}
              >
                {initials.trim() ? (
                  <Text style={{ color: colors.text, fontWeight: "900" }}>
                    {initials}
                  </Text>
                ) : (
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={colors.text}
                  />
                )}
              </View>
                );
              })}
          </View>
        ) : (
          <View
            style={{ alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="people-outline" size={18} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              No friends yet
            </Text>
          </View>
        )}
      </View>

      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>
        Friends:{" "}
        <Text style={{ color: colors.text, fontWeight: "900" }}>{friends}</Text>
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    height: 92,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
