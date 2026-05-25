// components/profile/premium/PremiumProfileHeader.tsx
import React, { useMemo } from "react";
import { Image, View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha, clamp, fmt } from "./ui";

function PressScale({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const s = useSharedValue(1);

  const a = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
  }));

  return (
    <Animated.View style={a}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          (s.value = withSpring(0.98, { damping: 18, stiffness: 260 }))
        }
        onPressOut={() =>
          (s.value = withSpring(1, { damping: 18, stiffness: 260 }))
        }
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function PremiumProfileHeader(props: {
  initials: string;
  name: string;
  subtitle: string;
  isPro: boolean;
  weightKg: number;
  targetWeightKg: number;
  unit: "kg" | "lb";
  goalType: "cut" | "maintain" | "lean_bulk" | "bulk";
  activityLevel: string;
  onToggleUnit: () => void;
  onPressSettings: () => void;
  onPressAvatar?: () => void;
  onPressAccount?: () => void;
  onPressGoPro: () => void;
  photoURL?: string | null;
  rightSlot?: React.ReactNode;
}) {
  const { colors, isDark } = useTheme();

  const goalLabel = useMemo(() => {
    if (props.goalType === "cut") return "Cut";
    if (props.goalType === "bulk") return "Lean bulk";
    return "Maintain";
  }, [props.goalType]);

  const unitWeight = useMemo(() => {
    if (!props.weightKg) return "--";
    return props.unit === "kg"
      ? `${fmt.num1(props.weightKg)} kg`
      : `${fmt.num1(props.weightKg * 2.20462)} lb`;
  }, [props.unit, props.weightKg]);

  const progress = useMemo(() => {
    // a gentle, non-judgment progress proxy:
    // closeness to target weight, capped
    const w = props.weightKg || 0;
    const t = props.targetWeightKg || 0;
    if (!w || !t) return 0.5;
    const dist = Math.abs(w - t);
    return clamp(1 - dist / 20, 0.15, 0.95);
  }, [props.weightKg, props.targetWeightKg]);
  const progressPct = Math.round(progress * 100);
  const momentumColor =
    progressPct >= 70 ? colors.primary : progressPct >= 40 ? "#FFC107" : "#F44336";

  return (
    <GlassCard style={{ padding: 0 }}>
      <LinearGradient
        colors={
          isDark
            ? [
                withAlpha("#3B82F6", 0.16),
                withAlpha("#22C55E", 0.08),
                withAlpha("#A78BFA", 0.12),
              ]
            : [
                withAlpha("#3B82F6", 0.14),
                withAlpha("#22C55E", 0.07),
                withAlpha("#A78BFA", 0.09),
              ]
        }
        style={styles.heroBg}
      />

      <View style={{ padding: 14, gap: 12 }}>
        <View style={styles.row}>
          <PressScale
            onPress={() => {
              Haptics.selectionAsync();
              props.onPressAvatar?.();
            }}
            accessibilityLabel="Change profile photo"
          >
            <View style={styles.avatar}>
              {props.photoURL ? (
                <Image source={{ uri: props.photoURL }} style={styles.avatarImg} />
              ) : (
                <Text
                  style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
                >
                  {props.initials}
                </Text>
              )}
              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: withAlpha(colors.primary, 0.95),
                    borderColor: withAlpha(colors.text, 0.16),
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={12} color="#fff" />
              </View>
            </View>
          </PressScale>

          <View style={{ flex: 1 }}>
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}
              numberOfLines={1}
            >
              {props.name}
            </Text>
            <Text
              style={{ color: colors.muted, marginTop: 2 }}
              numberOfLines={1}
            >
              {props.subtitle}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 8 }}>
            {props.rightSlot ?? null}

            <View style={{ flexDirection: "row", gap: 8 }}>
              {/* {props.onPressAccount ? (
                <PressScale
                  onPress={() => {
                    Haptics.selectionAsync();
                    props.onPressAccount?.();
                  }}
                  accessibilityLabel="Open account"
                >
                  <View
                    style={[
                      styles.iconBtn,
                      {
                        backgroundColor: withAlpha(
                          colors.card,
                          isDark ? 0.2 : 0.55
                        ),
                        borderColor: withAlpha(colors.border, 0.65),
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={16}
                      color={colors.text}
                    />
                  </View>
                </PressScale>
              ) : null} */}
              <PressScale
                onPress={() => {
                  Haptics.selectionAsync();
                  props.onPressSettings();
                }}
                accessibilityLabel="Open settings"
              >
                <View
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor: withAlpha(
                        colors.card,
                        isDark ? 0.2 : 0.55
                      ),
                      borderColor: withAlpha(colors.border, 0.65),
                    },
                  ]}
                >
                  <Ionicons
                    name="settings-outline"
                    size={16}
                    color={colors.text}
                  />
                </View>
              </PressScale>

              {!props.isPro && (
                <PressScale
                  onPress={() => {
                    Haptics.selectionAsync();
                    props.onPressGoPro();
                  }}
                  accessibilityLabel="Upgrade to Pro"
                >
                  <View
                    style={[
                      styles.proPill,
                      {
                        borderColor: withAlpha(colors.primary, 0.35),
                        backgroundColor: withAlpha(colors.primary, 0.14),
                      },
                    ]}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={14}
                      color={colors.text}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "900",
                        fontSize: 12,
                      }}
                    >
                      Pro
                    </Text>
                  </View>
                </PressScale>
              )}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View
            style={[
              styles.stat,
              { borderColor: withAlpha(colors.border, 0.6) },
            ]}
          >
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>Today weight</Text>
              <Text
              style={{ color: colors.text, fontWeight: "900", marginTop: 6, fontSize: 15 }}
            >
              {unitWeight}
            </Text>
          </View>

          <View
            style={[
              styles.stat,
              { borderColor: withAlpha(colors.border, 0.6) },
            ]}
          >
            <Text style={{ color: colors.muted, fontSize: 12 }}>Focus</Text>
            <Text
              style={{ color: colors.text, fontWeight: "900", marginTop: 4 }}
            >
              {goalLabel}
            </Text>
          </View>

          <PressScale
            onPress={() => {
              Haptics.selectionAsync();
              props.onToggleUnit();
            }}
            accessibilityLabel="Toggle weight unit"
          >
            <View
              style={[
                styles.stat,
                { borderColor: withAlpha(colors.border, 0.6) },
              ]}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>Unit</Text>
              <Text
                style={{ color: colors.text, fontWeight: "900", marginTop: 4 }}
              >
                {props.unit.toUpperCase()}
              </Text>
            </View>
          </PressScale>
        </View>

        {/* calm progress line */}
        <View style={{ gap: 8 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>
              Momentum · {progressPct}%
            </Text>
            <Text style={{ color: momentumColor, fontSize: 12, fontWeight: "900" }}>
              {progressPct >= 70 ? "Strong" : progressPct >= 40 ? "Building" : "Needs attention"}
            </Text>
          </View>
          <View
            style={[
              styles.track,
              {
                backgroundColor: withAlpha(colors.border, isDark ? 0.18 : 0.35),
              },
            ]}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: withAlpha(momentumColor, isDark ? 0.72 : 0.82),
                  borderColor: withAlpha(momentumColor, 0.38),
                },
              ]}
            />
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: "700" }}>
            Consistency score based on your last 7 days.
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  heroBg: { position: "absolute", inset: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    overflow: "visible",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  cameraBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  proPill: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  stat: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  track: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
});
