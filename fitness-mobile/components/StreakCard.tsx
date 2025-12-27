import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

type Props = {
  streakDays: number;
  bestDays?: number;
  didImprove?: boolean; // set true when user hits new best
  style?: ViewStyle;
};

function BurstDot({
  i,
  trigger,
}: {
  i: number;
  trigger: { value: number };
}) {
  const seed = useMemo(() => {
    const angle = (Math.PI * 2 * i) / 10;
    const dist = 26 + (i % 3) * 10;
    return { angle, dist, size: 6 + (i % 3) * 2 };
  }, [i]);

  const st = useAnimatedStyle(() => {
    const t = trigger.value; // 0..1..0
    const x = Math.cos(seed.angle) * seed.dist * t;
    const y = Math.sin(seed.angle) * seed.dist * t;
    return {
      opacity: 1 - t,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: 0.7 + 0.6 * (1 - t) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        { width: seed.size, height: seed.size, borderRadius: seed.size / 2 },
        st,
      ]}
    />
  );
}

export default function StreakCard({
  streakDays,
  bestDays,
  didImprove,
  style,
}: Props) {
  const wiggle = useSharedValue(0);
  const burst = useSharedValue(0);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wiggle.value}deg` }],
  }));

  useEffect(() => {
    // tiny wiggle on any streak change
    wiggle.value = withSequence(
      withTiming(-10, { duration: 70 }),
      withTiming(10, { duration: 70 }),
      withTiming(-6, { duration: 70 }),
      withTiming(6, { duration: 70 }),
      withTiming(0, { duration: 90 })
    );
  }, [streakDays]);

  useEffect(() => {
    if (!didImprove) return;
    (async () => {
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {}
    })();
    burst.value = 0;
    burst.value = withSequence(
      withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 140 })
    );
  }, [didImprove]);

  return (
    <View style={[styles.card, style]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={styles.kicker}>Consistency</Text>
          <Text style={styles.title}>{streakDays} day streak</Text>
          {!!bestDays && <Text style={styles.sub}>Best: {bestDays} days</Text>}
        </View>

        <View style={styles.iconWrap}>
          <Animated.View style={[styles.icon, iconStyle]}>
            <Text style={styles.iconTxt}>🔥</Text>
          </Animated.View>

          {/* confetti burst */}
          <View style={styles.burstCenter} pointerEvents="none">
            {Array.from({ length: 10 }).map((_, i) => (
              <BurstDot key={i} i={i} trigger={burst} />
            ))}
          </View>
        </View>
      </View>
    </View>
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
  kicker: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "700" },
  title: { color: "white", fontSize: 18, fontWeight: "900", marginTop: 4 },
  sub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  iconWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  iconTxt: { fontSize: 26 },
  burstCenter: {
    position: "absolute",
    width: 2,
    height: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { position: "absolute", backgroundColor: "rgba(255,255,255,0.85)" },
});
