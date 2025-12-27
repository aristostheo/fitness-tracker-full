import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import Svg, {
  Defs,
  ClipPath,
  Path,
  Rect,
  G,
  Circle,
  LinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);
const AG = Animated.createAnimatedComponent(G);

type Props = {
  currentMl: number;
  goalMl: number;
  width?: number;
  height?: number;
  style?: ViewStyle;
  onQuickAdd?: (ml: number) => void;
  tint?: "aqua" | "purple";
};

function clamp01(x: number) {
  "worklet";
  return Math.max(0, Math.min(1, x));
}

function makeWavePath(
  w: number,
  h: number,
  level01: number,
  phase01: number,
  amplitude: number,
  cycles: number,
  biasY: number
) {
  "worklet";
  const levelY = (1 - clamp01(level01)) * h + biasY;

  const points = 34;
  const step = w / points;
  const omega = (Math.PI * 2 * cycles) / w;
  const phase = phase01 * Math.PI * 2;

  let d = `M 0 ${levelY}`;
  for (let i = 0; i <= points; i++) {
    const x = i * step;
    const y = levelY + Math.sin(omega * x + phase) * amplitude;
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  d += ` L ${w} ${h} L 0 ${h} Z`;
  return d;
}

function bottlePath(w: number, h: number) {
  const neckW = w * 0.38;
  const neckH = h * 0.18;
  const capH = h * 0.06;
  const bodyTop = neckH + capH;
  const r = w * 0.18;

  const cx = w / 2;
  const leftNeck = cx - neckW / 2;
  const rightNeck = cx + neckW / 2;

  return `
    M ${leftNeck} ${capH}
    Q ${leftNeck} 0 ${cx} 0
    Q ${rightNeck} 0 ${rightNeck} ${capH}
    L ${rightNeck} ${neckH + capH}
    Q ${rightNeck} ${bodyTop} ${rightNeck + r} ${bodyTop + r}
    L ${w - r} ${h - r}
    Q ${w} ${h} ${w - r} ${h}
    L ${r} ${h}
    Q 0 ${h} 0 ${h - r}
    L ${r} ${bodyTop + r}
    Q ${leftNeck - r} ${bodyTop} ${leftNeck} ${neckH + capH}
    Z
  `;
}

export default function WaterBottleCardRealistic({
  currentMl,
  goalMl,
  width = 120,
  height = 170,
  style,
  onQuickAdd,
  tint = "aqua",
}: Props) {
  const level = Math.max(0, Math.min(1, goalMl > 0 ? currentMl / goalMl : 0));

  const fillSV = useSharedValue(0);
  const phaseFast = useSharedValue(0);
  const phaseSlow = useSharedValue(0);
  const sloshY = useSharedValue(0);
  const tilt = useSharedValue(0);

  // Goal completion celebration
  const celebrate = useSharedValue(0); // 0..1 pulse for confetti/glow
  const capPop = useSharedValue(0); // 0..1 pop for cap
  const wasComplete = useRef(false);

  const b1 = useSharedValue(0);
  const b2 = useSharedValue(0);
  const b3 = useSharedValue(0);

  const bottleD = useMemo(() => bottlePath(width, height), [width, height]);

  const palette = useMemo(() => {
    if (tint === "purple") {
      return {
        glow: "rgba(160,140,255,0.40)",
        water1: "rgba(160,140,255,0.62)",
        water2: "rgba(120,220,255,0.32)",
        surface: "rgba(255,255,255,0.10)",
        goalGlow: "rgba(160,140,255,0.55)",
        confA: "rgba(160,140,255,0.95)",
        confB: "rgba(255,255,255,0.80)",
        sparkA: "rgba(220,200,255,0.95)",
        sparkB: "rgba(255,255,255,0.82)",
      };
    }
    return {
      glow: "rgba(120,200,255,0.38)",
      water1: "rgba(120,200,255,0.62)",
      water2: "rgba(80,255,220,0.26)",
      surface: "rgba(255,255,255,0.10)",
      goalGlow: "rgba(120,200,255,0.55)",
      confA: "rgba(120,200,255,0.95)",
      confB: "rgba(255,255,255,0.80)",
      sparkA: "rgba(180,245,255,0.95)",
      sparkB: "rgba(255,255,255,0.78)",
    };
  }, [tint]);

  useEffect(() => {
    const prev = fillSV.value;

    // Fill level
    fillSV.value = withTiming(level, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });

    // Water inertia bob
    sloshY.value = withSequence(
      withSpring(-6, { damping: 10, stiffness: 140 }),
      withSpring(0, { damping: 12, stiffness: 120 })
    );

    // Tilt slosh
    const dir = level >= prev ? 1 : -1;
    tilt.value = withSequence(
      withTiming(2.6 * dir, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(-1.4 * dir, {
        duration: 240,
        easing: Easing.inOut(Easing.quad),
      }),
      withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) })
    );

    // Goal complete celebration (trigger only once when crossing 100%)
    const completeNow = level >= 1;
    if (completeNow && !wasComplete.current) {
      wasComplete.current = true;

      celebrate.value = 0;
      celebrate.value = withSequence(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
        withDelay(
          520,
          withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })
        )
      );

      capPop.value = 0;
      capPop.value = withSequence(
        withSpring(1, { damping: 9, stiffness: 220 }),
        withDelay(180, withSpring(0, { damping: 10, stiffness: 200 }))
      );
    }
    if (!completeNow) wasComplete.current = false;
  }, [level]);

  useEffect(() => {
    phaseFast.value = 0;
    phaseSlow.value = 0;
    phaseFast.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false
    );
    phaseSlow.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.linear }),
      -1,
      false
    );

    b1.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.linear }),
      -1,
      false
    );
    b2.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.linear }),
      -1,
      false
    );
    b3.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const wave1Props = useAnimatedProps(() => {
    const amp = interpolate(fillSV.value, [0, 1], [2.8, 6.4]);
    const d = makeWavePath(
      width,
      height,
      fillSV.value,
      phaseSlow.value,
      amp,
      1.1,
      sloshY.value
    );
    return { d };
  });

  const wave2Props = useAnimatedProps(() => {
    const amp = interpolate(fillSV.value, [0, 1], [1.8, 4.2]);
    const d = makeWavePath(
      width,
      height,
      fillSV.value,
      phaseFast.value,
      amp,
      1.75,
      sloshY.value * 0.6
    );
    return { d };
  });

  const waterGroupProps = useAnimatedProps(() => {
    const cx = width / 2;
    const cy = height * 0.55;
    const a = tilt.value;
    return { transform: `rotate(${a} ${cx} ${cy})` };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fillSV.value, [0, 1], [0.14, 0.38]),
    transform: [{ scale: interpolate(fillSV.value, [0, 1], [0.9, 1.02]) }],
  }));

  const celebrateGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(celebrate.value, [0, 1], [0, 0.62]),
    transform: [{ scale: interpolate(celebrate.value, [0, 1], [0.92, 1.1]) }],
  }));

  const capStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(capPop.value, [0, 1], [0, -10]) },
      { rotate: `${interpolate(capPop.value, [0, 1], [0, -10])}deg` },
    ],
    opacity: 1,
  }));

  const b1Props = useAnimatedProps(() => {
    const lv = fillSV.value;
    const topY = (1 - lv) * height + 10;
    const bottomY = height - 10;

    const y = interpolate(b1.value, [0, 1], [bottomY, topY]);
    const op = interpolate(b1.value, [0, 0.15, 0.85, 1], [0, 0.35, 0.35, 0]);
    const drift = Math.sin((b1.value + 0.2) * Math.PI * 2) * 4;

    return {
      cx: width * 0.35 + drift,
      cy: y,
      r: 2.6,
      opacity: lv < 0.06 ? 0 : op,
    } as any;
  });

  const b2Props = useAnimatedProps(() => {
    const lv = fillSV.value;
    const topY = (1 - lv) * height + 10;
    const bottomY = height - 10;

    const y = interpolate(b2.value, [0, 1], [bottomY, topY]);
    const op = interpolate(b2.value, [0, 0.15, 0.85, 1], [0, 0.28, 0.28, 0]);
    const drift = Math.sin((b2.value + 0.5) * Math.PI * 2) * 3;

    return {
      cx: width * 0.55 + drift,
      cy: y,
      r: 2.0,
      opacity: lv < 0.06 ? 0 : op,
    } as any;
  });

  const b3Props = useAnimatedProps(() => {
    const lv = fillSV.value;
    const topY = (1 - lv) * height + 10;
    const bottomY = height - 10;

    const y = interpolate(b3.value, [0, 1], [bottomY, topY]);
    const op = interpolate(b3.value, [0, 0.15, 0.85, 1], [0, 0.34, 0.34, 0]);
    const drift = Math.sin((b3.value + 0.8) * Math.PI * 2) * 4.5;

    return {
      cx: width * 0.45 + drift,
      cy: y,
      r: 3.0,
      opacity: lv < 0.06 ? 0 : op,
    } as any;
  });

  const pct = Math.round(level * 100);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Water</Text>
          <Text style={styles.sub}>
            {currentMl.toLocaleString()} / {goalMl.toLocaleString()} ml • {pct}%
          </Text>

          {/* <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <QuickBtn label="+250" onPress={() => onQuickAdd?.(250)} />
            <QuickBtn label="+500" onPress={() => onQuickAdd?.(500)} />
          </View> */}
        </View>

        <View style={{ width, height }}>
          {/* Goal completion glow burst */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.goalGlow,
              celebrateGlowStyle,
              {
                backgroundColor: palette.goalGlow,
                borderColor: "rgba(255,255,255,0.16)",
              },
            ]}
          />

          {/* Normal glow */}
          <Animated.View
            style={[styles.glow, glowStyle, { backgroundColor: palette.glow }]}
          />

          <Svg width={width} height={height}>
            <Defs>
              <ClipPath id="bottleClip">
                <Path d={bottleD} />
              </ClipPath>

              <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={palette.water2} stopOpacity="1" />
                <Stop
                  offset="0.55"
                  stopColor={palette.water1}
                  stopOpacity="1"
                />
                <Stop
                  offset="1"
                  stopColor={palette.water1}
                  stopOpacity="0.85"
                />
              </LinearGradient>

              <LinearGradient id="glassShine" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="rgba(255,255,255,0.18)" />
                <Stop offset="1" stopColor="rgba(255,255,255,0.02)" />
              </LinearGradient>
            </Defs>

            <G clipPath="url(#bottleClip)">
              <AG animatedProps={waterGroupProps}>
                <Rect
                  x={0}
                  y={0}
                  width={width}
                  height={height}
                  fill="rgba(255,255,255,0.03)"
                />
                <Rect
                  x={0}
                  y={0}
                  width={width}
                  height={height}
                  fill="url(#waterGrad)"
                  opacity={0.28}
                />

                <APath
                  animatedProps={wave1Props}
                  fill="url(#waterGrad)"
                  opacity={0.7}
                />
                <APath
                  animatedProps={wave2Props}
                  fill={palette.water1}
                  opacity={0.42}
                />

                <APath
                  animatedProps={wave2Props}
                  fill={palette.surface}
                  transform="translate(0,-2)"
                  opacity={0.55}
                />

                <ACircle
                  animatedProps={b1Props}
                  fill="rgba(255,255,255,0.55)"
                />
                <ACircle
                  animatedProps={b2Props}
                  fill="rgba(255,255,255,0.45)"
                />
                <ACircle
                  animatedProps={b3Props}
                  fill="rgba(255,255,255,0.55)"
                />
              </AG>
            </G>

            <Path
              d={bottleD}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1.25}
            />

            <Path
              d={bottleD}
              fill="url(#glassShine)"
              opacity={0.14}
              transform={`translate(${-(width * 0.06)}, ${-(height * 0.02)})`}
            />
          </Svg>

          {/* Cap overlay (simple glossy cap) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cap,
              capStyle,
              {
                width: Math.round(width * 0.42),
                marginLeft: -Math.round((width * 0.42) / 2),
                top: Math.max(6, Math.round(height * 0.035)),
              },
            ]}
          />

          {/* Confetti burst */}
          <MiniConfetti
            triggerSV={celebrate}
            colorA={palette.sparkA}
            colorB={palette.sparkB}
          />
        </View>
      </View>
    </View>
  );
}

function MiniConfetti({
  triggerSV,
  colorA,
  colorB,
}: {
  triggerSV: { value: number };
  colorA: string;
  colorB: string;
}) {
  const dots = new Array(10).fill(0);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {dots.map((_, i) => {
        const a = (Math.PI * 2 * i) / dots.length;
        const r = 26 + (i % 3) * 6;

        const s = useAnimatedStyle(() => ({
          opacity: interpolate(triggerSV.value, [0, 0.2, 1], [0, 1, 0]),
          transform: [
            { translateX: Math.cos(a) * r * triggerSV.value },
            { translateY: Math.sin(a) * r * triggerSV.value },
            { scale: interpolate(triggerSV.value, [0, 0.2, 1], [0.6, 1, 0.8]) },
          ],
        }));

        return (
          <Animated.View
            key={i}
            style={[
              {
                position: "absolute",
                left: "50%",
                top: "45%",
                width: 6,
                height: 6,
                marginLeft: -3,
                marginTop: -3,
                borderRadius: 999,
                backgroundColor: i % 2 === 0 ? colorA : colorB,
              },
              s,
            ]}
          />
        );
      })}
    </View>
  );
}

// function QuickBtn({ label, onPress }: { label: string; onPress?: () => void }) {
//   return (
//     <Pressable onPress={onPress} style={styles.btn}>
//       <Text style={styles.btnTxt}>{label}</Text>
//     </Pressable>
//   );
// }

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  title: { color: "white", fontSize: 16, fontWeight: "900" },
  sub: {
    marginTop: 6,
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "700",
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  btnTxt: { color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 12 },

  goalGlow: {
    position: "absolute",
    inset: -18,
    borderRadius: 999,
    borderWidth: 1,
    zIndex: -2,
  },
  glow: {
    position: "absolute",
    inset: -12,
    borderRadius: 999,
    transform: [{ scale: 0.92 }],
    zIndex: -1,
  },
  cap: {
    position: "absolute",
    left: "50%",
    height: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
});
