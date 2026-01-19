// components/friends/premium/RequestRowPremium.tsx
// Drop-in ✅ incoming + sent request rows

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

type GradientTuple = readonly [string, string, ...string[]];

function pickAccent(seed: string): GradientTuple {
  const palettes: readonly GradientTuple[] = [
    ["rgba(110,231,255,0.45)", "rgba(167,139,250,0.18)"] as const,
    ["rgba(52,211,153,0.45)", "rgba(96,165,250,0.18)"] as const,
    ["rgba(251,191,36,0.45)", "rgba(244,114,182,0.18)"] as const,
    ["rgba(248,113,113,0.45)", "rgba(251,146,60,0.18)"] as const,
    ["rgba(148,163,184,0.40)", "rgba(99,102,241,0.16)"] as const,
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length];
}

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
  const { colors, isDark } = useTheme();
  const accent = useMemo(() => pickAccent(accentSeed), [accentSeed]);

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onOpenActions?.();
      }}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onOpenActions?.();
      }}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            {
              borderColor: colors.glassBorder,
              backgroundColor: pressed ? colors.surface2 : colors.glass,
            },
          ]}
        >
          <BlurView
            intensity={20}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.accentGlow}
          />

          <View style={styles.row}>
            <View style={styles.avatar}>
              <LinearGradient
                colors={
                  [
                    withAlpha(accent[0], 0.9),
                    withAlpha(accent[1], 0.9),
                  ] as const
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />

              <Text style={[styles.avatarText, { color: colors.text }]}>
                {(name?.trim()?.[0] || "F").toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text
                  style={[styles.name, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                {handle ? (
                  <Text
                    style={[styles.handle, { color: colors.muted }]}
                    numberOfLines={1}
                  >
                    {handle}
                  </Text>
                ) : null}
              </View>
              <Text
                style={[styles.subtitle, { color: colors.muted }]}
                numberOfLines={1}
              >
                {subtitle ||
                  (mode === "incoming"
                    ? "Incoming request"
                    : "Pending approval")}
              </Text>
            </View>

            {mode === "incoming" ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    );
                    onAccept?.();
                  }}
                  style={({ pressed: p }) => [
                    styles.smallBtn,
                    {
                      backgroundColor: withAlpha(colors.success, p ? 0.24 : 0.18),
                      borderColor: withAlpha(colors.success, 0.3),
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={18} color={colors.text} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onDecline?.();
                  }}
                  style={({ pressed: p }) => [
                    styles.smallBtn,
                    {
                      backgroundColor: withAlpha(colors.text, p ? 0.12 : 0.08),
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onCancel?.();
                }}
                style={({ pressed: p }) => [
                  styles.cancelBtn,
                  {
                    backgroundColor: withAlpha(colors.danger, p ? 0.2 : 0.14),
                    borderColor: withAlpha(colors.danger, 0.24),
                  },
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={colors.text}
                />
              </Pressable>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  accentGlow: {
    position: "absolute",
    right: -80,
    top: -60,
    width: 200,
    height: 200,
    borderRadius: 999,
    opacity: 0.65,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "rgba(0,0,0,0.80)",
    fontWeight: "900",
    fontSize: 16,
  },
  name: {
    fontSize: 14.5,
    fontWeight: "900",
    letterSpacing: -0.25,
    maxWidth: 170,
  },
  handle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "600",
  },
  smallBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cancelBtn: {
    width: 44,
    height: 40,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
