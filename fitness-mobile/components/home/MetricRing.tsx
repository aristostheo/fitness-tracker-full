import React, { useMemo } from "react";
import { View, Text, Pressable, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const ACircle = Animated.createAnimatedComponent(Circle);

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export type MetricTone = "tint" | "violet" | "mint";

export function MetricRing({
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
    text: string;
    muted: string;
    hairline: string;
    tint: string;
    ringA: string;
    ringB: string;
    good: string;
    warn?: string;
    bad?: string;
    ringTrack?: string;
  };
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const pct = useMemo(
    () => clamp01(goal <= 0 ? 0 : value / goal),
    [goal, value]
  );
  const size = 104;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(reduceMotion ? pct : 0);

  React.useEffect(() => {
    progress.value = withTiming(pct, { duration: reduceMotion ? 1 : 600 });
  }, [pct, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.value),
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${value}${unit ? ` ${unit}` : ""}. ${Math.round(
        pct * 100
      )} percent of goal.`}
      style={({ pressed }) => ({
        opacity: pressed ? 0.96 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={[
          {
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingVertical: 18,
            borderWidth: 1,
            borderColor: tokens.hairline,
            backgroundColor: tokens.card,
            minHeight: 176,
            justifyContent: "space-between",
          },
          style,
        ]}
      >
        <Text
          style={{
            color: tokens.muted,
            fontSize: 11,
            fontWeight: "500",
            letterSpacing: 1,
          }}
          numberOfLines={1}
        >
          {label.toUpperCase()}
        </Text>

        <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={tokens.ringTrack ?? "#1C1C2E"}
              strokeWidth={stroke}
              fill="transparent"
            />
            <ACircle
              animatedProps={animatedProps as any}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={tokens.tint}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${c} ${c}`}
            />
          </Svg>

          <View style={{ position: "absolute", alignItems: "center", gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
              <Text
                style={{
                  color: tokens.text,
                  fontSize: 34,
                  fontWeight: "300",
                  letterSpacing: -1.2,
                }}
              >
                {Math.round(value).toLocaleString()}
              </Text>
              {unit ? (
                <Text
                  style={{
                    color: tokens.muted,
                    fontSize: 11,
                    fontWeight: "300",
                    letterSpacing: 0.3,
                    marginBottom: 8,
                  }}
                >
                  {unit}
                </Text>
              ) : null}
            </View>
            <Text
              style={{
                color: tokens.muted,
                fontSize: 11,
                fontWeight: "300",
                letterSpacing: 0.3,
              }}
            >
              {Math.round(pct * 100)}% of goal
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: tokens.muted,
            fontSize: 11,
            fontWeight: "300",
            letterSpacing: 0.3,
          }}
          numberOfLines={1}
        >
          {sublabel || "Goal progress"}
        </Text>
      </View>
    </Pressable>
  );
}
