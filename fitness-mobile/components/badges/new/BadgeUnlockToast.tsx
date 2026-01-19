// components/badges/BadgeUnlockToast.tsx
import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import BadgeMedallion from "./BadgeMedalion";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
};

export default function BadgeUnlockToast({
  visible,
  onDismiss,
  title,
  subtitle,
  icon,
  accent,
}: Props) {
  const { colors, isDark } = useTheme();
  const y = useSharedValue(18);
  const o = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      y.value = withTiming(0, { duration: 280 });
      o.value = withTiming(1, { duration: 220 });
    } else {
      y.value = withTiming(18, { duration: 200 });
      o.value = withTiming(0, { duration: 160 });
    }
  }, [visible]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: o.value,
  }));

  const bg = useMemo(
    () => (isDark ? withAlpha("#07101F", 0.62) : withAlpha("#FFFFFF", 0.78)),
    [isDark]
  );
  const border = useMemo(
    () => withAlpha(colors.border, isDark ? 0.22 : 0.18),
    [colors.border, isDark]
  );

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Animated.View style={[styles.toast, { borderColor: border }, anim]}>
        <BlurView
          intensity={isDark ? 18 : 28}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            { opacity: pressed ? 0.88 : 1 },
            styles.inner,
          ]}
        >
          <BadgeMedallion icon={icon} unlocked accent={accent} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                styles.kicker,
                { color: withAlpha(colors.text, isDark ? 0.7 : 0.6) },
              ]}
            >
              Badge unlocked
            </Text>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {!!subtitle && (
              <Text
                style={[
                  styles.sub,
                  { color: withAlpha(colors.text, isDark ? 0.7 : 0.6) },
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={withAlpha(colors.text, isDark ? 0.55 : 0.45)}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    zIndex: 9999,
  },
  toast: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  inner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  kicker: { fontSize: 12, fontWeight: "800" },
  title: { fontSize: 15, fontWeight: "900" },
  sub: { marginTop: 2, fontSize: 12, fontWeight: "800" },
});
