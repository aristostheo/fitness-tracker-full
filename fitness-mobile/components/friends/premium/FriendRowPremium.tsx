// components/friends/premium/FriendRowPremium.tsx
// Drop-in ✅ premium friend row with quick Ping micro-action

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

// FriendRowPremium.tsx

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

export function FriendRowPremium({
  name,
  handle,
  subtitle,
  accentSeed,
  onPress,
  onPing,
}: {
  name: string;
  handle?: string;
  subtitle?: string;
  accentSeed: string;
  onPress: () => void;
  onPing: () => void;
}) {
  const { colors, isDark } = useTheme();
  const accent = useMemo(() => pickAccent(accentSeed), [accentSeed]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
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
                {subtitle || "Connected"}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                onPing();
              }}
              style={({ pressed: p }) => [
                styles.ping,
                {
                  backgroundColor: withAlpha(colors.text, p ? 0.12 : 0.08),
                  borderColor: colors.glassBorder,
                },
              ]}
              hitSlop={10}
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color={colors.text}
              />
            </Pressable>
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
    opacity: 0.7,
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
  ping: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
