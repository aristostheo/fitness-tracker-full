import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  value: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  bgStroke?: string;
  fgStroke?: string;
  glowStroke?: string;
  label?: string;
  unit?: string;
  style?: ViewStyle;
  animateKey?: string | number;
  enableHaptics?: boolean;
};

export default function ProgressRingAnimated({
  value,
  goal,
  size = 116,
  strokeWidth = 12,
  bgStroke = "rgba(255,255,255,0.15)",
  fgStroke = "rgba(120,200,255,0.95)",
  glowStroke = "rgba(120,255,180,0.95)",
  label = "Progress",
  unit = "",
  style,
  animateKey,
  enableHaptics = true,
}: Props) {
  const r = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const c = useMemo(() => 2 * Math.PI * r, [r]);

  const progress = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
  const progSV = useSharedValue(0);
  const scaleSV = useSharedValue(1);
  const glowSV = useSharedValue(0);

  const animatedProps = useAnimatedProps(() => {
    const dashOffset = c * (1 - progSV.value);
    return { strokeDashoffset: dashOffset };
  });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleSV.value }],
  }));

  const glowProps = useAnimatedProps(() => {
    const dashOffset = c * (1 - progSV.value);
    return { strokeDashoffset: dashOffset, strokeOpacity: glowSV.value };
  });

  const trigger = async (hitGoal: boolean) => {
    progSV.value = withTiming(progress, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });

    scaleSV.value = withSequence(
      withTiming(1.03, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1.0, { duration: 140, easing: Easing.out(Easing.quad) })
    );

    if (enableHaptics) {
      try {
        await Haptics.selectionAsync();
      } catch {}
    }

    if (hitGoal) {
      glowSV.value = 0;
      glowSV.value = withSequence(
        withTiming(1, { duration: 120 }),
        withDelay(140, withTiming(0, { duration: 220 }))
      );

      if (enableHaptics) {
        try {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        } catch {}
      }
    }
  };

  useEffect(() => {
    const hitGoal = goal > 0 && value >= goal;
    trigger(hitGoal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateKey, value, goal]);

  const center = size / 2;

  return (
    <Animated.View style={[styles.wrap, style, animatedContainerStyle]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={bgStroke}
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          <AnimatedCircle
            cx={center}
            cy={center}
            r={r}
            stroke={glowStroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            animatedProps={glowProps}
            transform={`rotate(-90 ${center} ${center})`}
          />

          <AnimatedCircle
            cx={center}
            cy={center}
            r={r}
            stroke={fgStroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>

        <View style={styles.center}>
          <Text style={styles.value}>
            {Math.round(value)}
            {unit ? <Text style={styles.unit}> {unit}</Text> : null}
          </Text>
          <Text style={styles.label}>
            {label} • {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { color: "white", fontSize: 22, fontWeight: "800" },
  unit: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "700" },
  label: {
    marginTop: 4,
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
});
