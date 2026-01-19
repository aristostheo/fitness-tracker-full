// components/badges/BadgeCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import BadgeMedallion from "./BadgeMedalion";

type Props = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  unlocked?: boolean;
  accent?: string;
  rightMeta?: string; // e.g. "Rare"
  onPress?: () => void;
};

export default function BadgeCard({
  title,
  subtitle,
  icon,
  unlocked = false,
  accent,
  rightMeta,
  onPress,
}: Props) {
  const { colors, isDark } = useTheme();

  const cardBg = useMemo(() => {
    if (isDark) return withAlpha("#0B1220", 0.62);
    return withAlpha("#FFFFFF", 0.72);
  }, [isDark]);

  const border = useMemo(
    () => withAlpha(colors.border, isDark ? 0.22 : 0.18),
    [colors.border, isDark]
  );
  const titleColor = unlocked
    ? colors.text
    : withAlpha(colors.text, isDark ? 0.7 : 0.6);
  const subColor = unlocked
    ? withAlpha(colors.text, isDark ? 0.72 : 0.62)
    : withAlpha(colors.text, isDark ? 0.52 : 0.48);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.press,
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.96 },
      ]}
    >
      <View style={[styles.card, { borderColor: border }]}>
        <BlurView
          intensity={isDark ? 16 : 24}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: cardBg }]} />

        <View style={styles.row}>
          <BadgeMedallion
            icon={icon}
            unlocked={unlocked}
            accent={accent}
            size={46}
          />

          <View style={styles.textCol}>
            <Text
              style={[styles.title, { color: titleColor }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {!!subtitle && (
              <Text style={[styles.sub, { color: subColor }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          <View style={styles.right}>
            {!!rightMeta && (
              <Text
                style={[
                  styles.meta,
                  { color: withAlpha(colors.text, isDark ? 0.6 : 0.55) },
                ]}
              >
                {rightMeta}
              </Text>
            )}
            <Ionicons
              name="chevron-forward"
              size={16}
              color={withAlpha(colors.text, isDark ? 0.45 : 0.35)}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "700" },
  sub: { marginTop: 2, fontSize: 13, fontWeight: "600" },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  meta: { fontSize: 12, fontWeight: "700" },
});
