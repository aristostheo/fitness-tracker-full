// components/profile/bodyTwin/BodyTwinCard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

import type {
  BodyMetrics,
  FutureSelfTarget,
  ShapeParams,
} from "@/services/profile/bodyTwin/types";
import { BodyTwinAvatar } from "./BodyTwinAvatar";
import { BodyTwinCustomizeSheet } from "./BodyTwinCustomizeSheet";
import { FutureSelfSheet } from "./FutureSelfSheet";
import { AchievementToast } from "./AchievementToast";
import { getAchievement } from "@/services/profile/bodyTwin/achievements";
import {
  applyFutureTarget,
  metricsToShape,
} from "@/services/profile/bodyTwin/shape";

// ✅ IMPORTANT: use the singular hook (your earlier provided hook file was useBodyTwin.ts)
import { useBodyTwin } from "@/hooks/useBodyTwins";

export function BodyTwinCard(props: {
  currentMetrics?: BodyMetrics;
  metricsHistory?: BodyMetrics[];
}) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  const { state, setBase, setConsent, resetAll } = useBodyTwin({
    currentMetrics: props.currentMetrics,
    metricsHistory: props.metricsHistory,
  });

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [futureOpen, setFutureOpen] = useState(false);
  const [futureTarget, setFutureTarget] = useState<FutureSelfTarget>({});

  // ✅ local toast visibility so it never “sticks”
  const [showReward, setShowReward] = useState(false);

  const enabled = state.consent.enabled;

  const displayedShape: ShapeParams = useMemo(() => {
    return state.smoothedShape ?? metricsToShape(state.latestMetrics);
  }, [state.smoothedShape, state.latestMetrics]);

  const futureShape = useMemo(() => {
    if (!enabled) return undefined;
    if (!state.consent.allowFutureSelf) return undefined;

    const hasAny = Object.keys(futureTarget).length > 0;
    if (!hasAny) return undefined;

    const futureMetrics = applyFutureTarget(state.latestMetrics, futureTarget);
    return metricsToShape(futureMetrics);
  }, [
    enabled,
    state.consent.allowFutureSelf,
    futureTarget,
    state.latestMetrics,
  ]);

  const lastReward = useMemo(() => {
    const id = state.unlocked[state.unlocked.length - 1];
    return id ? getAchievement(id) : null;
  }, [state.unlocked]);

  // ✅ show toast for 2.4s after unlock
  useEffect(() => {
    if (!state.lastRewardAt) return;
    if (!state.consent.allowAchievements) return;

    setShowReward(true);
    const t = setTimeout(() => setShowReward(false), 2400);
    return () => clearTimeout(t);
  }, [state.lastRewardAt, state.consent.allowAchievements]);

  // Card micro-interactions (keep your existing)
  const press = useSharedValue(0);
  const cardAnim = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(press.value ? 0.985 : 1, {
          damping: 16,
          stiffness: 220,
        }),
      },
    ],
  }));

  const glow = useSharedValue(0);
  useEffect(() => {
    if (state.lastRewardAt && state.consent.allowAchievements) {
      glow.value = 1;
      glow.value = withTiming(0, {
        duration: 900,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [state.lastRewardAt, state.consent.allowAchievements]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const surface = isDark
    ? withAlpha("#0B0B0F", 0.62)
    : withAlpha("#FFFFFF", 0.72);
  const border = withAlpha(colors.text, isDark ? 0.1 : 0.08);

  const stacked = width < 380;

  const title = "Body Twin";
  const subtitle = enabled
    ? "Your progress, visualized gently."
    : "Off. Turn it on anytime.";

  return (
    <View style={{ marginTop: 14 }}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: surface, borderColor: border },
          cardAnim,
        ]}
      >
        {/* Reward glow */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              backgroundColor: withAlpha(
                colors.primary ?? "#4B8DFF",
                isDark ? 0.18 : 0.12
              ),
              borderColor: withAlpha(
                colors.primary ?? "#4B8DFF",
                isDark ? 0.32 : 0.22
              ),
            },
            glowStyle,
          ]}
        />

        {/* ✅ Inline achievement banner (prevents overlap) */}
        <AchievementToast
          visible={
            !!(showReward && lastReward && state.consent.allowAchievements)
          }
          title={lastReward?.title ?? ""}
          subtitle={lastReward?.subtitle ?? ""}
        />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text
              style={[
                styles.sub,
                { color: withAlpha(colors.text, isDark ? 0.66 : 0.58) },
              ]}
            >
              {subtitle}
            </Text>
          </View>

          <Pressable
            onPressIn={() => (press.value = 1)}
            onPressOut={() => (press.value = 0)}
            onPress={() => {
              Haptics.selectionAsync();
              setCustomizeOpen(true);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: withAlpha(colors.text, 0.07),
                borderColor: withAlpha(colors.text, 0.1),
              },
            ]}
          >
            <Text
              style={[styles.chipText, { color: withAlpha(colors.text, 0.88) }]}
            >
              Customize
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.content,
            stacked && { flexDirection: "column", alignItems: "stretch" },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
            }}
            style={[styles.avatarArea, stacked && { alignItems: "center" }]}
          >
            <BodyTwinAvatar
              base={state.base}
              shape={displayedShape}
              futureShape={futureShape}
              size={stacked ? 156 : 168}
              showAura={enabled}
            />
          </Pressable>

          <View style={[styles.right, stacked && { width: "100%" }]}>
            <View
              style={[
                styles.kpi,
                { backgroundColor: withAlpha(colors.text, 0.06) },
              ]}
            >
              <Text
                style={[
                  styles.kpiTitle,
                  { color: withAlpha(colors.text, 0.72) },
                ]}
              >
                Status
              </Text>
              <Text style={[styles.kpiValue, { color: colors.text }]}>
                {enabled ? "Evolving" : "Off"}
              </Text>
              <Text
                style={[
                  styles.kpiHint,
                  { color: withAlpha(colors.text, 0.55) },
                ]}
              >
                {enabled
                  ? "Updates are smoothed to feel calm."
                  : "Enable to see a supportive visual companion."}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setConsent({ enabled: !enabled });
              }}
              style={[
                styles.primary,
                {
                  backgroundColor: enabled
                    ? withAlpha(colors.text, isDark ? 0.1 : 0.08)
                    : withAlpha(
                        colors.primary ?? "#4B8DFF",
                        isDark ? 0.92 : 0.9
                      ),
                  borderColor: enabled
                    ? withAlpha(colors.text, 0.14)
                    : withAlpha(colors.primary ?? "#4B8DFF", 0.22),
                },
              ]}
            >
              <Text
                style={[
                  styles.primaryText,
                  { color: enabled ? colors.text : "#FFFFFF" },
                ]}
              >
                {enabled ? "Pause" : "Enable"}
              </Text>
            </Pressable>

            <Pressable
              disabled={!enabled || !state.consent.allowFutureSelf}
              onPress={() => {
                Haptics.selectionAsync();
                setFutureOpen(true);
              }}
              style={[
                styles.secondary,
                {
                  opacity: !enabled || !state.consent.allowFutureSelf ? 0.5 : 1,
                  backgroundColor: withAlpha(colors.text, 0.06),
                  borderColor: withAlpha(colors.text, 0.1),
                },
              ]}
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>
                Future Self
              </Text>
              <Text
                style={[
                  styles.secondaryHint,
                  { color: withAlpha(colors.text, 0.55) },
                ]}
              >
                Preview an overlay
              </Text>
            </Pressable>
          </View>
        </View>

        <BodyTwinCustomizeSheet
          visible={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
          base={state.base}
          consent={state.consent}
          onChangeBase={setBase}
          onChangeConsent={setConsent}
          onReset={() => {
            setCustomizeOpen(false);
            resetAll();
          }}
        />

        <FutureSelfSheet
          visible={futureOpen}
          onClose={() => setFutureOpen(false)}
          current={state.latestMetrics}
          hideNumbers={state.consent.hideNumbers}
          onChangeTarget={(t) => setFutureTarget(t)}
        />
      </Animated.View>

      {/* Emotional safety footer copy */}
      <Text
        style={[
          styles.footer,
          { color: withAlpha(colors.text, isDark ? 0.52 : 0.48) },
        ]}
      >
        Your Body Twin changes slowly on purpose. It’s here to motivate — never
        to judge.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    inset: -20,
    borderRadius: 36,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  content: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    alignItems: "center",
  },
  avatarArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    flex: 1,
    gap: 10,
  },
  kpi: {
    borderRadius: 18,
    padding: 12,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  kpiValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  kpiHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  primary: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: {
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  secondary: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  secondaryHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    paddingHorizontal: 6,
  },
});
