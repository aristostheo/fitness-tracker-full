import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Props = {
  value: number;
  unit?: string;
  highlight?: boolean;
  style?: ViewStyle;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function WeightPileBadge({
  value,
  unit = "lb",
  highlight,
  style,
}: Props) {
  const plates = useMemo(() => {
    const step = unit === "kg" ? 10 : 20;
    return clamp(Math.round(value / step), 0, 8);
  }, [value, unit]);

  const bump = useSharedValue(0);
  const count = useSharedValue(0);
  const prev = useSharedValue(value);

  useEffect(() => {
    const from = prev.value;
    prev.value = value;

    count.value = from;
    count.value = withTiming(value, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });

    if (highlight || Math.abs(value - from) > 0.001) {
      bump.value = withSequence(
        withTiming(1, { duration: 120 }),
        withSpring(0, { damping: 10, stiffness: 180 })
      );
    }
  }, [value, highlight]);

  const pileStyle = useAnimatedStyle(() => {
    const s = interpolate(bump.value, [0, 1], [1, 1.06]);
    const y = interpolate(bump.value, [0, 1], [0, -3]);
    return { transform: [{ translateY: y }, { scale: s }] };
  });

  const numStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bump.value, [0, 1], [0.9, 1]),
    transform: [{ translateY: interpolate(bump.value, [0, 1], [0, -1]) }],
  }));

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View style={[styles.pile, pileStyle]}>
        {Array.from({ length: plates }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.plate,
              {
                opacity: 0.92 - i * 0.06,
                transform: [{ translateY: -i * 3 }],
              },
            ]}
          />
        ))}
        <View style={styles.bar} />
      </Animated.View>

      <Animated.View style={numStyle}>
        <Text style={styles.num}>
          {Math.round(value)}
          <Text style={styles.unit}> {unit}</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-end", gap: 6, minWidth: 64 },
  pile: { width: 46, height: 34, position: "relative" },
  bar: {
    position: "absolute",
    bottom: 6,
    right: 0,
    width: 34,
    height: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  plate: {
    position: "absolute",
    bottom: 6,
    right: 16,
    width: 18,
    height: 16,
    borderRadius: 6,
    backgroundColor: "rgba(93,214,255,0.26)",
    borderWidth: 1,
    borderColor: "rgba(93,214,255,0.40)",
  },
  num: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "900",
    fontSize: 13,
    textAlign: "right",
  },
  unit: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "800",
    fontSize: 11,
  },
});
