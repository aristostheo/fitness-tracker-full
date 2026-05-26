import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

export function RequestRowPremium({
  name,
  handle,
  subtitle,
  accentSeed,
  mode,
  onAccept,
  onDecline,
  onCancel,
  onOpenActions,
}: {
  name: string;
  handle?: string;
  subtitle?: string;
  accentSeed: string;
  mode: "incoming" | "sent";
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onOpenActions?: () => void;
}) {
  const { colors } = useTheme();
  const hue = Math.abs(
    accentSeed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  );
  const avatar = ["#6C63FF", "#22D3EE", "#34D399", "#F59E0B", "#EC4899"][
    hue % 5
  ];

  return (
    <Pressable onPress={onOpenActions}>
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            {
              backgroundColor: pressed ? withAlpha(colors.text, 0.04) : "#1A1A24",
              borderColor: withAlpha(colors.text, 0.08),
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: withAlpha(avatar, 0.18),
                borderColor: withAlpha(avatar, 0.28),
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.text }]}>
              {(name || "F")[0]?.toUpperCase() || "F"}
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            {handle ? (
              <Text style={[styles.handle, { color: colors.muted }]} numberOfLines={1}>
                {handle}
              </Text>
            ) : null}
            <Text
              style={[styles.subtitle, { color: colors.muted }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>

          {mode === "incoming" ? (
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  onAccept?.();
                }}
                style={({ pressed: p }) => [
                  styles.cta,
                  {
                    backgroundColor: withAlpha("#4CAF50", p ? 0.28 : 0.18),
                    borderColor: withAlpha("#4CAF50", 0.26),
                  },
                ]}
              >
                <Text style={styles.ctaText}>Accept ✓</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDecline?.();
                }}
                style={({ pressed: p }) => [
                  styles.cta,
                  {
                    backgroundColor: withAlpha("#F44336", p ? 0.24 : 0.14),
                    borderColor: withAlpha("#F44336", 0.24),
                  },
                ]}
              >
                <Text style={styles.ctaText}>Decline ✗</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCancel?.();
              }}
              style={({ pressed: p }) => [
                styles.cancel,
                {
                  backgroundColor: p
                    ? withAlpha(colors.text, 0.08)
                    : withAlpha(colors.text, 0.04),
                  borderColor: withAlpha(colors.text, 0.12),
                },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>
                Cancel →
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "900",
  },
  name: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  handle: {
    marginTop: 3,
    fontSize: 11.5,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: "700",
  },
  actions: {
    gap: 8,
  },
  cta: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "900",
  },
  cancel: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
});
