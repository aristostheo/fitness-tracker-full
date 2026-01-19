// components/exercises/ExerciseCard.tsx
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";

import type { ExerciseDoc } from "@/services/exercises/types";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

type Props = {
  item: ExerciseDoc;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

const titleize = (s: string) =>
  s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const ExerciseCard = memo(function ExerciseCard({
  item,
  isFavorite,
  onPress,
  onToggleFavorite,
}: Props) {
  const { colors, isDark } = useTheme();

  const subtitle = useMemo(() => {
    const primary = item.primaryMuscles?.[0]
      ? titleize(item.primaryMuscles[0])
      : "";
    const equip = item.equipment?.[0] ? titleize(item.equipment[0]) : "";
    const bits = [primary, equip].filter(Boolean);
    return bits.length ? bits.join(" • ") : "Exercise";
  }, [item]);

  const hasDemo = !!item.images?.gif;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 200 }}
    >
      <Pressable
        onPress={async () => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        style={({ pressed }) => [
          styles.cardWrap,
          { transform: [{ scale: pressed ? 0.985 : 1 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}. ${subtitle}.`}
      >
        <BlurView
          intensity={isDark ? 22 : 34}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.card,
            {
              borderColor: withAlpha(colors.border, isDark ? 0.55 : 0.7),
              backgroundColor: withAlpha(colors.card, isDark ? 0.35 : 0.55),
            },
          ]}
        >
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: withAlpha(colors.text, 0.65) },
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>

            <Pressable
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                  () => {}
                );
                onToggleFavorite();
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              style={({ pressed }) => [
                styles.favBtn,
                {
                  backgroundColor: withAlpha(colors.card, pressed ? 0.2 : 0.14),
                  borderColor: withAlpha(colors.border, 0.6),
                },
              ]}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite ? "#ff3b30" : withAlpha(colors.text, 0.8)}
              />
            </Pressable>
          </View>

          <View style={styles.rowBottom}>
            <View style={styles.pills}>
              {hasDemo ? (
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: withAlpha(colors.primary, 0.14),
                      borderColor: withAlpha(colors.primary, 0.35),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: withAlpha(colors.text, 0.9) },
                    ]}
                  >
                    Demo
                  </Text>
                </View>
              ) : null}

              {item.level ? (
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: withAlpha(colors.card, 0.22),
                      borderColor: withAlpha(colors.border, 0.55),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: withAlpha(colors.text, 0.75) },
                    ]}
                  >
                    {titleize(item.level)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={withAlpha(colors.text, 0.45)}
            />
          </View>
        </BlurView>
      </Pressable>
    </MotiView>
  );
});

const styles = StyleSheet.create({
  cardWrap: { marginBottom: 12 },
  card: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
  subtitle: { marginTop: 3, fontSize: 12.5, fontWeight: "600" },
  favBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBottom: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pills: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: "800" },
});
