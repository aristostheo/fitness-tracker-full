// components/profile/premium/BadgesPreviewCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha } from "./ui";
import { BADGES } from "@/services/badges/registry";

export function BadgesPreviewCard(props: {
  onPressAll: () => void;
  unlockedCount?: number;
  previewIds?: string[]; // optional ids
}) {
  const { colors, isDark } = useTheme();

  const unlocked = props.unlockedCount ?? 0;
  const previewBadges = useMemo(
    () =>
      (props.previewIds ?? [])
        .map((id) => BADGES.find((b) => b.id === id))
        .filter(Boolean)
        .slice(0, 3),
    [props.previewIds]
  );
  const hasPreview = previewBadges.length > 0;

  const pill = useMemo(() => {
    if (unlocked <= 0) return "Start your first badge";
    if (unlocked < 10) return "Building momentum";
    return "Strong collection";
  }, [unlocked]);

  return (
    <GlassCard>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
          Badges
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
          accessibilityLabel="Open badges"
        >
          <Ionicons
            name="chevron-forward-outline"
            size={16}
            color={colors.text}
          />
        </Pressable>
      </View>

      <Text style={{ color: colors.muted, marginTop: 6 }}>{pill}</Text>

      <View style={{ height: 12 }} />

      <View
        style={[
          styles.preview,
          { backgroundColor: withAlpha(colors.border, isDark ? 0.12 : 0.2) },
        ]}
      >
        {hasPreview ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            {previewBadges.map((badge, idx) => (
              <View
                key={idx}
                style={[
                  styles.badgeDot,
                  {
                    backgroundColor: withAlpha(
                      badge!.accent ?? colors.primary,
                      isDark ? 0.25 : 0.16
                    ),
                    borderColor: withAlpha(
                      badge!.accent ?? colors.primary,
                      0.35
                    ),
                  },
                ]}
              >
                <Ionicons
                  name={(badge!.icon as any) ?? "ribbon-outline"}
                  size={16}
                  color={colors.text}
                />
              </View>
            ))}
          </View>
        ) : (
          <View
            style={{ alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="ribbon-outline" size={18} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              No featured badges yet
            </Text>
          </View>
        )}
      </View>

      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>
        Unlocked:{" "}
        <Text style={{ color: colors.text, fontWeight: "900" }}>
          {unlocked}
        </Text>
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
  badgeDot: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
