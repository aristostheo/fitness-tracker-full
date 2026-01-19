// components/nutrition/MealHealthScoreIndicator.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import {
  computeMealHealthScore,
  type MealHealthInput,
  type MealHealthContext,
} from "@/lib/mealHealthScore";

type Props = {
  input: MealHealthInput;
  context?: MealHealthContext;

  // Visual options
  variant?: "pill" | "ring" | "pill+ring";
  compact?: boolean; // smaller text/padding
  style?: ViewStyle;

  // Optional interaction (e.g., open a sheet explaining the score)
  onPress?: () => void;
};

function pickAccent(colorKey: string) {
  // We deliberately keep these as simple semantic defaults.
  // If you want, map them to your theme palette later.
  switch (colorKey) {
    case "green":
      return ["#27f58b", "#1fc7ff"];
    case "mint":
      return ["#61f2ff", "#7cffb2"];
    case "amber":
      return ["#ffd36b", "#ff7ad9"];
    case "red":
    default:
      return ["#ff5a7a", "#ffb86b"];
  }
}

export default function MealHealthScoreIndicator({
  input,
  context,
  variant = "pill",
  compact,
  style,
  onPress,
}: Props) {
  const { colors, isDark } = useTheme();

  const res = useMemo(
    () => computeMealHealthScore(input, context),
    [input, context]
  );

  const grad = pickAccent(res.colorKey);
  const bg = isDark ? withAlpha("#0b0f18", 0.55) : withAlpha("#ffffff", 0.7);
  const stroke = isDark
    ? withAlpha("#ffffff", 0.14)
    : withAlpha("#0b0f18", 0.1);
  const text = isDark ? "#ffffff" : "#0b0f18";
  const subtext = isDark
    ? withAlpha("#ffffff", 0.7)
    : withAlpha("#0b0f18", 0.6);

  const Pill = (
    <BlurView
      intensity={isDark ? 22 : 28}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.pill,
        { backgroundColor: bg, borderColor: stroke },
        compact && styles.pillCompact,
      ]}
    >
      <LinearGradient
        colors={[
          withAlpha(grad[0], isDark ? 0.9 : 0.7),
          withAlpha(grad[1], isDark ? 0.85 : 0.65),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.pillAccent, compact && styles.pillAccentCompact]}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={styles.pillScoreWrap}>
          <Text style={[styles.pillScore, { color: text }]}>{res.score}</Text>
        </View>

        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.pillTitle, { color: text }]} numberOfLines={1}>
            Meal Health
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={[styles.pillSubtitle, { color: subtext }]}
              numberOfLines={1}
            >
              {res.tier}
            </Text>
            <View
              style={[
                styles.dot,
                { backgroundColor: withAlpha(grad[0], 0.85) },
              ]}
            />
            <Text
              style={[styles.pillSubtitle, { color: subtext }]}
              numberOfLines={1}
            >
              {Math.round(res.confidence * 100)}% confidence
            </Text>
          </View>
        </View>

        {!!onPress && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={withAlpha(text, 0.65)}
            style={{ marginLeft: "auto" }}
          />
        )}
      </View>
    </BlurView>
  );

  const Ring = (
    <View style={styles.ringWrap}>
      <LinearGradient
        colors={[withAlpha(grad[0], 0.95), withAlpha(grad[1], 0.9)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ringOuter}
      >
        <View
          style={[
            styles.ringInner,
            { backgroundColor: isDark ? "#0b0f18" : "#ffffff" },
          ]}
        >
          <Text style={[styles.ringScore, { color: text }]}>{res.score}</Text>
          <Text style={[styles.ringLabel, { color: subtext }]}>{res.tier}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const content =
    variant === "pill" ? (
      Pill
    ) : variant === "ring" ? (
      Ring
    ) : (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {Ring}
        <View style={{ flex: 1 }}>{Pill}</View>
      </View>
    );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[style]} hitSlop={10}>
        {content}
      </Pressable>
    );
  }

  return <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    overflow: "hidden",
  },
  pillCompact: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  pillAccent: {
    position: "absolute",
    left: -40,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 999,
    transform: [{ rotate: "12deg" }],
  },
  pillAccentCompact: {
    left: -48,
    top: -48,
    width: 110,
    height: 110,
  },
  pillScoreWrap: {
    width: 52,
    alignItems: "flex-start",
  },
  pillScore: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  pillTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  pillSubtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 99,
  },

  ringWrap: {
    width: 64,
    height: 64,
  },
  ringOuter: {
    flex: 1,
    borderRadius: 999,
    padding: 2.5,
  },
  ringInner: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  ringScore: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginBottom: -2,
  },
  ringLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
});
