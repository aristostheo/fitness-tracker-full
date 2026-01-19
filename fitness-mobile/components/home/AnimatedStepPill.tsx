// components/home/AnimatedStepPill.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";

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

export function AnimatedStepPill({
  tokens,
  steps,
  goal,
  moveMin,
  reduceMotion,
  onPress,
  style,
}: {
  tokens: {
    card: string;
    card2: string;
    text: string;
    muted: string;
    hairline: string;
    tint: string;
    good: string;
  };
  steps: number;
  goal: number;
  moveMin: number;
  reduceMotion: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const pct = useMemo(
    () => clamp01(goal <= 0 ? 0 : steps / goal),
    [steps, goal]
  );
  const pctLabel = `${Math.round(pct * 100)}%`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Steps ${steps} of ${goal}. ${pctLabel}. Move minutes ${moveMin}.`}
      accessibilityHint="Opens activity details"
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
          height: 128,
          ...(style as any),
        }}
      >
        <BlurView intensity={18} tint="default">
          <View
            style={{
              padding: 14,
              height: 128,
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ color: tokens.text, fontWeight: "900", fontSize: 14 }}
              >
                Steps
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="walk" size={16} color={tokens.good} />
                <Text
                  style={{
                    color: tokens.muted,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  {pctLabel}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: tokens.text,
                    fontWeight: "900",
                    fontSize: 26,
                    letterSpacing: -0.4,
                  }}
                >
                  {steps.toLocaleString()}
                </Text>
                <Text
                  style={{
                    color: tokens.muted,
                    fontWeight: "800",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  of {goal.toLocaleString()}
                </Text>
              </View>

              {/* Gentle animated dot “breathing” */}
              <MotiView
                from={
                  reduceMotion ? undefined : { opacity: 0.45, translateY: 0 }
                }
                animate={
                  reduceMotion ? undefined : { opacity: 1, translateY: -2 }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        type: "timing",
                        duration: 900,
                        loop: true,
                        repeatReverse: true,
                      }
                }
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(tokens.tint, 0.14),
                  borderWidth: 1,
                  borderColor: withAlpha(tokens.tint, 0.2),
                }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Ionicons name="location" size={18} color={tokens.tint} />
              </MotiView>
            </View>

            {/* Progress bar */}
            <View
              style={{
                height: 10,
                borderRadius: 999,
                backgroundColor: withAlpha(tokens.muted, 0.14),
                borderWidth: 1,
                borderColor: withAlpha(tokens.muted, 0.14),
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.round(pct * 100)}%`,
                  height: "100%",
                  backgroundColor: withAlpha(tokens.good, 0.85),
                }}
              />
            </View>
          </View>
        </BlurView>
      </LinearGradient>
    </Pressable>
  );
}
