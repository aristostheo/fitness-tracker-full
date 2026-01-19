// components/scanMeal/new/bodyTwin/AchievementToast.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

export function AchievementToast(props: {
  title: string;
  subtitle: string;
  visible: boolean;
}) {
  const { colors, isDark } = useTheme();

  if (!props.visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16)}
      exiting={FadeOutUp.duration(180)}
      style={styles.wrap}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark
              ? withAlpha("#0B0B0F", 0.72)
              : withAlpha("#FFFFFF", 0.86),
            borderColor: withAlpha(
              colors.primary ?? "#4B8DFF",
              isDark ? 0.28 : 0.18
            ),
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: withAlpha(colors.primary ?? "#4B8DFF", 0.95) },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {props.title}
          </Text>
          <Text
            style={[
              styles.sub,
              { color: withAlpha(colors.text, isDark ? 0.72 : 0.62) },
            ]}
            numberOfLines={2}
          >
            {props.subtitle}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10, // ✅ inline spacing inside card
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
    lineHeight: 16,
  },
});
