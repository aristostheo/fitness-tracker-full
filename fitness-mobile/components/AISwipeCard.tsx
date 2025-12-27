import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
// Gesture handler types can sometimes be missing in TS in bare setups; the module is present in Expo.
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

type Props = {
  title?: string;
  suggestion: string;
  onAccept?: () => void;
  onDismiss?: () => void;
  style?: ViewStyle;
};

export default function AISwipeCard({
  title = "AI Suggestion",
  suggestion,
  onAccept,
  onDismiss,
  style,
}: Props) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e: any) => {
      x.value = e.translationX;
      y.value = e.translationY * 0.25;
    })
    .onEnd(() => {
      const threshold = 120;
      if (x.value > threshold) {
        x.value = withSpring(420, { damping: 16, stiffness: 160 });
        runOnJS(Haptics.selectionAsync)();
        onAccept && runOnJS(onAccept)();
      } else if (x.value < -threshold) {
        x.value = withSpring(-420, { damping: 16, stiffness: 160 });
        runOnJS(Haptics.selectionAsync)();
        onDismiss && runOnJS(onDismiss)();
      } else {
        x.value = withSpring(0, { damping: 18, stiffness: 180 });
        y.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rot = interpolate(x.value, [-200, 200], [-8, 8]);
    const scale = interpolate(Math.abs(x.value), [0, 200], [1, 0.98]);
    return {
      transform: [
        { translateX: x.value },
        { translateY: y.value },
        { rotate: `${rot}deg` },
        { scale },
      ],
    };
  });

  const leftBadge = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-140, -40], [1, 0]),
  }));

  const rightBadge = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [40, 140], [0, 1]),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, style, cardStyle]}>
        <View style={styles.topRow}>
          <Text style={styles.kicker}>{title}</Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Animated.View style={[styles.badge, styles.badgeNo, leftBadge]}>
              <Text style={styles.badgeTxt}>SKIP</Text>
            </Animated.View>
            <Animated.View style={[styles.badge, styles.badgeYes, rightBadge]}>
              <Text style={styles.badgeTxt}>ADD</Text>
            </Animated.View>
          </View>
        </View>

        <Text style={styles.text}>{suggestion}</Text>
        <Text style={styles.hint}>Swipe right to add • left to skip</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "800" },
  text: {
    marginTop: 10,
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  hint: {
    marginTop: 10,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeYes: {
    backgroundColor: "rgba(120,255,180,0.14)",
    borderColor: "rgba(120,255,180,0.35)",
  },
  badgeNo: {
    backgroundColor: "rgba(255,120,120,0.12)",
    borderColor: "rgba(255,120,120,0.35)",
  },
  badgeTxt: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
});
