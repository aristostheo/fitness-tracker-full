// components/home/MetricRing.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const ACircle = Animated.createAnimatedComponent(Circle);

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}

export type MetricTone = "tint" | "violet" | "mint";

export function MetricRing({
  tone,
  label,
  value,
  goal,
  unit,
  sublabel,
  reduceMotion,
  tokens,
  style,
  onPress,
}: {
  tone: MetricTone;
  label: string;
  value: number;
  goal: number;
  unit?: string;
  sublabel?: string;
  reduceMotion: boolean;
  tokens: {
    card: string;
    card2: string;
    text: string;
    muted: string;
    hairline: string;
    tint: string;
    ringA: string;
    ringB: string;
    good: string;
  };
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const pct = useMemo(
    () => clamp01(goal <= 0 ? 0 : value / goal),
    [value, goal]
  );

  const toneColor = useMemo(() => {
    if (tone === "violet") return tokens.ringB;
    if (tone === "mint") return tokens.good;
    return tokens.ringA;
  }, [tone, tokens]);

  const size = 84;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const progress = useSharedValue(reduceMotion ? pct : 0);

  React.useEffect(() => {
    progress.value = withTiming(pct, { duration: reduceMotion ? 1 : 700 });
  }, [pct, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => {
    const dashoffset = c * (1 - progress.value);
    return { strokeDashoffset: dashoffset };
  });

  const icon = tone === "mint" ? "walk" : tone === "violet" ? "flash" : "flame";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${value}${
        unit ? " " + unit : ""
      }. ${Math.round(pct * 100)} percent of goal.`}
      accessibilityHint={sublabel ? sublabel : "Opens details"}
      hitSlop={10}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <LinearGradient
        colors={[withAlpha(tokens.card, 1), withAlpha(tokens.card2, 1)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: tokens.hairline,
          padding: 12,
          minHeight: 150,
          ...(style as any),
        }}
      >
        <BlurView intensity={18} tint="default">
          <View style={{ padding: 2, gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ color: tokens.text, fontWeight: "900", fontSize: 13 }}
              >
                {label}
              </Text>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(toneColor, 0.14),
                  borderWidth: 1,
                  borderColor: withAlpha(toneColor, 0.24),
                }}
              >
                <Ionicons name={icon as any} size={14} color={toneColor} />
              </View>
            </View>

            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <Svg width={size} height={size}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={withAlpha(tokens.muted, 0.18)}
                  strokeWidth={stroke}
                  fill="transparent"
                />
                <ACircle
                  animatedProps={animatedProps as any}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={toneColor}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={`${c} ${c}`}
                />
              </Svg>

              <View style={{ position: "absolute", alignItems: "center" }}>
                <Text
                  style={{
                    color: tokens.text,
                    fontWeight: "900",
                    fontSize: 18,
                    letterSpacing: -0.2,
                  }}
                >
                  {Math.round(value)}
                  {unit ? (
                    <Text
                      style={{
                        color: tokens.muted,
                        fontWeight: "900",
                        fontSize: 12,
                      }}
                    >
                      {" "}
                      {unit}
                    </Text>
                  ) : null}
                </Text>
                <Text
                  style={{
                    color: tokens.muted,
                    fontWeight: "800",
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {Math.round(pct * 100)}%
                </Text>
              </View>
            </View>

            <Text
              style={{ color: tokens.muted, fontWeight: "800", fontSize: 12 }}
              numberOfLines={1}
            >
              {sublabel || "Tap for details"}
            </Text>
          </View>
        </BlurView>
      </LinearGradient>
    </Pressable>
  );
}
