import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";

import { useTheme } from "@/content/ThemeProvider";

const withAlpha = (hex: string, a: number) => {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
};

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

function fmtCompact(n: number) {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`;
  if (abs >= 1_000) return `${Math.round((n / 1_000) * 10) / 10}k`;
  return String(Math.round(n));
}

function relTime(msAgo: number) {
  const m = Math.max(1, Math.round(msAgo / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

type ActiveSessionVM = {
  title: string;
  elapsedMin: number;
  setsLogged?: number;
  exercisesCount?: number;
  volumeKg?: number;
  lastActiveAtMs?: number;
  startedAtMs?: number;
};

type RecentlyFinishedVM = {
  title: string;
  finishedAtMs: number;
  setsLogged?: number;
  exercisesCount?: number;
  volumeKg?: number;
};

type Props = {
  hasDraftSession: boolean;
  activeSession: ActiveSessionVM | null;
  recentlyFinished?: RecentlyFinishedVM | null;

  onPrimaryPress: () => void; // card press anywhere: resume if exists else start new
  onSecondaryPress?: () => void; // Finish / Options

  // optional: open start options sheet on empty state
  onOptionsPress?: () => void;
};

export function WorkoutSessionHeroCard({
  hasDraftSession,
  activeSession,
  recentlyFinished,
  onPrimaryPress,
  onSecondaryPress,
  onOptionsPress,
}: Props) {
  const { colors, isDark } = useTheme();
  const accent = colors.primary ?? "#68D7FF";
  const accent2 = "#8B7CFF";

  const now = Date.now();

  const mode = useMemo<"none" | "draft" | "active" | "paused" | "recent">(
    () => {
      if (activeSession) {
        const hasAny =
          Number(activeSession.setsLogged || 0) > 0 ||
          Number(activeSession.exercisesCount || 0) > 0;
        if (!hasAny) return "draft";
        const last = activeSession.lastActiveAtMs ?? now;
        const paused = now - last > 10 * 60 * 1000; // 10min
        return paused ? "paused" : "active";
      }
      if (recentlyFinished) return "recent";
      return hasDraftSession ? "draft" : "none";
    },
    [
      activeSession,
      hasDraftSession,
      recentlyFinished,
      now,
      activeSession?.setsLogged,
      activeSession?.exercisesCount,
      activeSession?.lastActiveAtMs,
    ]
  );

  const title = useMemo(() => {
    if (mode === "none") return "Start a workout";
    if (mode === "recent")
      return (recentlyFinished?.title || "Workout").trim() || "Workout";
    return (activeSession?.title || "Workout").trim() || "Workout";
  }, [mode, activeSession?.title, recentlyFinished?.title]);

  const status = useMemo(() => {
    if (mode === "none") return "Ready when you are";
    if (mode === "draft") return "Draft restored";
    if (mode === "recent") {
      const last = recentlyFinished?.finishedAtMs ?? now;
      return `Just finished • ${relTime(now - last)}`;
    }
    if (mode === "paused") {
      const last = activeSession?.lastActiveAtMs ?? now;
      return `Paused • ${relTime(now - last)}`;
    }
    return "Active • Logging";
  }, [mode, activeSession?.lastActiveAtMs, now]);

  const showMetrics =
    mode === "active" || mode === "paused" || mode === "draft" || mode === "recent";

  const metrics = useMemo(() => {
    const source = activeSession ?? recentlyFinished;
    const dur = Math.max(0, Number((activeSession?.elapsedMin ?? 0) || 0));
    const sets = Math.max(0, Number(source?.setsLogged ?? 0));
    const ex = Math.max(0, Number(source?.exercisesCount ?? 0));
    const vol = Math.max(0, Number(source?.volumeKg ?? 0));
    return {
      durLabel: `${dur}m`,
      setsLabel: `${sets} sets`,
      exLabel: `${ex} ex`,
      volLabel: `${fmtCompact(vol)} kg`,
      hasAny: dur > 0 || sets > 0 || ex > 0 || vol > 0,
    };
  }, [activeSession, recentlyFinished]);

  // Primary CTA label
  const cta = mode === "none" || mode === "recent" ? "Start" : "Resume";

  // Glass tokens
  const cardBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.9);
  const cardBorder = isDark
    ? withAlpha("#FFFFFF", 0.16)
    : withAlpha(colors.text, 0.12);

  const t1 = isDark ? withAlpha("#FFFFFF", 0.94) : withAlpha(colors.text, 0.94);
  const t2 = isDark ? withAlpha("#FFFFFF", 0.68) : withAlpha(colors.text, 0.68);

  const pillBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.78);
  const pillBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.12);

  // Press scale
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Pulse orb (alive indicator)
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    const speed = mode === "paused" ? 2400 : 1800;
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: speed, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [mode, pulse]);

  const orbStyle = useAnimatedStyle(() => {
    const s = 1 + 0.06 * pulse.value;
    const o = mode === "paused" ? 0.55 : 0.9;
    return { transform: [{ scale: s }], opacity: o };
  });

  const secondaryLabel =
    mode === "none" || mode === "recent" ? "Options" : "Finish";
  const showSecondary =
    (mode === "none" || mode === "recent")
      ? !!onOptionsPress
      : !!onSecondaryPress;

  return (
    <Animated.View style={[pressStyle, { marginBottom: 14 }]}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web")
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {}
            );
          onPrimaryPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.985, { damping: 18, stiffness: 260 });
          if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${status}.`}
        accessibilityHint={
          mode === "none"
            ? "Starts a new workout session"
            : "Resumes your workout session"
        }
        style={({ pressed }) => [
          styles.wrap,
          { backgroundColor: cardBg, borderColor: cardBorder },
          pressed && { opacity: 0.94 },
        ]}
      >
        <BlurView
          intensity={isDark ? 28 : 18}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />

        {/* Premium sheen */}
        <LinearGradient
          colors={
            isDark
              ? [
                  withAlpha("#FFFFFF", 0.12),
                  withAlpha("#FFFFFF", 0.05),
                  withAlpha("#000000", 0.12),
                ]
              : [
                  withAlpha(accent, 0.14),
                  withAlpha("#FFFFFF", 0.92),
                  withAlpha("#FFFFFF", 0.86),
                ]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative glow */}
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              backgroundColor: withAlpha(
                mode === "none" ? accent2 : accent,
                isDark ? 0.16 : 0.1
              ),
            },
          ]}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.title, { color: t1 }]} numberOfLines={1}>
              {title}
            </Text>

            <View
              style={[
                styles.statusPill,
                { backgroundColor: pillBg, borderColor: pillBorder },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: withAlpha(accent, 0.92),
                    shadowColor: accent,
                  },
                ]}
              />
              <Text
                style={[styles.statusText, { color: t2 }]}
                numberOfLines={1}
              >
                {status}
              </Text>

              {mode === "draft" ? (
                <View
                  style={[
                    styles.softTag,
                    {
                      backgroundColor: withAlpha(accent2, 0.16),
                      borderColor: withAlpha(accent2, 0.26),
                    },
                  ]}
                >
                  <Text
                    style={[styles.softTagText, { color: withAlpha(t1, 0.86) }]}
                  >
                    RESTORED
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Metrics */}
            {showMetrics ? (
              <View style={styles.metricsRow}>
                <MetricChip
                  icon="time-outline"
                  label={metrics.durLabel}
                  bg={pillBg}
                  border={pillBorder}
                  text={t1}
                />
                <MetricChip
                  icon="layers-outline"
                  label={metrics.setsLabel}
                  bg={pillBg}
                  border={pillBorder}
                  text={t1}
                />
                <MetricChip
                  icon="pulse-outline"
                  label={metrics.volLabel}
                  bg={pillBg}
                  border={pillBorder}
                  text={t1}
                />
              </View>
            ) : (
              <Text style={[styles.invite, { color: t2 }]} numberOfLines={2}>
                Tap to start. Add exercises as you go.
              </Text>
            )}
          </View>

          {/* Alive orb */}
          <View style={styles.right}>
            <Animated.View
              style={[
                styles.orb,
                { backgroundColor: withAlpha(accent, isDark ? 0.22 : 0.18) },
                orbStyle,
              ]}
            />
            <View
              style={[
                styles.orbRing,
                { borderColor: withAlpha("#FFFFFF", isDark ? 0.16 : 0.18) },
              ]}
            />

            {/* Primary CTA */}
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web")
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                    () => {}
                  );
                onPrimaryPress();
              }}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: isDark
                    ? withAlpha("#FFFFFF", 0.92)
                    : withAlpha(colors.primary, 0.92),
                  borderColor: isDark
                    ? withAlpha("#FFFFFF", 0.18)
                    : withAlpha(colors.primary, 0.35),
                },
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={cta}
            >
              <Ionicons
                name={mode === "none" ? "add" : "arrow-forward"}
                size={16}
                color={isDark ? withAlpha("#111", 0.92) : "#fff"}
              />
              <Text
                style={[
                  styles.ctaText,
                  { color: isDark ? withAlpha("#111", 0.92) : "#fff" },
                ]}
              >
                {cta}
              </Text>
            </Pressable>

            {/* Secondary (quiet) */}
            {showSecondary ? (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web")
                    Haptics.selectionAsync().catch(() => {});
                  if (mode === "none" || mode === "recent")
                    onOptionsPress?.();
                  else onSecondaryPress?.();
                }}
                style={({ pressed }) => [
                  styles.secondary,
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={secondaryLabel}
              >
                <Text
                  style={[styles.secondaryText, { color: withAlpha(t2, 0.95) }]}
                >
                  {secondaryLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function MetricChip({
  icon,
  label,
  bg,
  border,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  bg: string;
  border: string;
  text: string;
}) {
  return (
    <View
      style={[styles.metricChip, { backgroundColor: bg, borderColor: border }]}
    >
      <Ionicons name={icon} size={13} color={withAlpha(text, 0.9)} />
      <Text style={[styles.metricText, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    padding: 14,
  },

  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 280,
    right: -120,
    top: -140,
  },

  row: { flexDirection: "row", alignItems: "center" },

  title: {
    fontSize: 18,
    fontWeight: "950" as any,
    letterSpacing: -0.3,
  },

  statusPill: {
    marginTop: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  statusText: { fontSize: 12, fontWeight: "850" as any },

  softTag: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  softTagText: { fontSize: 10, fontWeight: "950" as any, letterSpacing: 0.6 },

  invite: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700" as any,
    lineHeight: 16,
  },

  metricsRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metricText: { fontSize: 12, fontWeight: "900" as any, letterSpacing: -0.1 },

  right: { alignItems: "center", justifyContent: "center", gap: 10 },
  orb: {
    width: 52,
    height: 52,
    borderRadius: 52,
  },
  orbRing: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 62,
    borderWidth: StyleSheet.hairlineWidth,
    top: -5,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 92,
    justifyContent: "center",
  },
  ctaText: { fontSize: 13, fontWeight: "950" as any, letterSpacing: -0.1 },

  secondary: { paddingVertical: 4, paddingHorizontal: 6 },
  secondaryText: { fontSize: 12, fontWeight: "900" as any },
});
