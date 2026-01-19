// components/workouts/premium/WorkoutEntryCardPremium.tsx
// Drop-in ✅ Premium Workout Entry Card
//
// Depends on: expo-blur, expo-linear-gradient, expo-haptics, react-native-reanimated, @expo/vector-icons
// Uses your theme: useTheme() -> { colors, isDark }
//
// Props are pure: pass precomputed summary OR pass rows for a session.
// This component includes: intensity calc + highlight selection logic.
//
// Usage (history list):
// <WorkoutEntryCardPremium
//   summary={summary}
//   onPress={() => goRecap(summary.sessionKey)}
//   onDuplicate={() => ...}
//   onSaveTemplate={() => ...}
//   onDelete={() => ...}
// />

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  ActivityIndicator,
  Alert as RNAlert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
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

export type WorkoutEntrySummary = {
  id: string;
  sessionKey: string;

  title: string;
  dateISO: string; // YYYY-MM-DD
  timeLabel?: string; // e.g. 6:40 PM

  durationMin: number;
  exercisesCount: number;
  sets: number;
  volumeKg: number;

  // optional curated highlight (you can pass, or let component compute if you provide rows)
  highlight?: {
    label: "Best set" | "PR moment";
    text: string; // "Bench • 4×6 @ 100kg"
    isPR?: boolean;
  };

  // optional PR count for tiny badge
  prCount?: number;
};

type Props = {
  summary: WorkoutEntrySummary;

  onPress?: () => void;
  onDuplicate?: () => void;
  onSaveTemplate?: () => void;
  onDelete?: () => void | Promise<void>;

  index?: number; // for entering delay
};

const HAPTIC_LIGHT = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
const HAPTIC_SELECT = () => {
  Haptics.selectionAsync().catch(() => {});
};
const HAPTIC_MED = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

function usePressScale() {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
  }));
  return {
    style,
    pressIn: () =>
      (s.value = withSpring(0.985, { damping: 18, stiffness: 260 })),
    pressOut: () => (s.value = withSpring(1, { damping: 18, stiffness: 260 })),
  };
}

/**
 * Intensity score (0..1)
 * - density: volume per minute
 * - set rate: sets per minute
 * Tuned to feel "Apple calm": only extreme sessions hit >0.8
 */
function computeIntensity(volumeKg: number, durationMin: number, sets: number) {
  const dur = Math.max(1, durationMin || 0);
  const density = volumeKg / dur; // kg/min
  const setRate = sets / dur; // sets/min

  // Normalize against realistic upper ranges
  const densityN = clamp(density / 420, 0, 1); // 420 kg/min is very dense
  const setRateN = clamp(setRate / 0.55, 0, 1); // 0.55 sets/min ~ 33 sets/hr

  // Slightly favor density (work) but keep balanced
  const score = 0.58 * densityN + 0.42 * setRateN;

  // Gentle curve so mid sessions look distinct
  return clamp(Math.pow(score, 0.92), 0, 1);
}

function signalFromIntensity(
  intensity: number,
  durationMin: number,
  sets: number
) {
  const dur = Math.max(1, durationMin);
  const setRate = sets / dur;

  if (intensity < 0.35) return { label: "Clean", tone: "cool" as const };
  if (intensity < 0.6) return { label: "Building", tone: "mint" as const };
  if (intensity < 0.8) return { label: "Peaking", tone: "gold" as const };

  // Only call "Fatigued" when it’s truly long/high pace
  if (dur >= 55 || setRate > 0.55)
    return { label: "Fatigued", tone: "hot" as const };
  return { label: "Peaking", tone: "gold" as const };
}

function mixHex(a: string, b: string, t: number) {
  const h1 = (a || "").replace("#", "");
  const h2 = (b || "").replace("#", "");
  if (h1.length !== 6 || h2.length !== 6) return a;
  const toRgb = (h: string) => ({
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  });
  const c1 = toRgb(h1);
  const c2 = toRgb(h2);
  const mix = (x: number, y: number) =>
    Math.round(x + (y - x) * Math.max(0, Math.min(1, t)));
  const r = mix(c1.r, c2.r).toString(16).padStart(2, "0");
  const g = mix(c1.g, c2.g).toString(16).padStart(2, "0");
  const b2 = mix(c1.b, c2.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b2}`;
}

function toneColorFromTheme(
  tone: "cool" | "mint" | "gold" | "hot",
  primary: string,
  accent: string
) {
  if (tone === "cool") return primary;
  if (tone === "mint") return accent || primary;
  if (tone === "gold") return mixHex(primary, accent || primary, 0.5);
  return mixHex(accent || primary, primary, 0.75);
}

function formatDateNice(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkoutEntryCardPremium({
  summary,
  onPress,
  onDuplicate,
  onSaveTemplate,
  onDelete,
  index = 0,
}: Props) {
  const { colors, isDark } = useTheme();

  const accent = colors.primary ?? "#68D7FF";
  const accent2 = colors.accent ?? "#8B7CFF";

  const press = usePressScale();
  const shimmer = useSharedValue(0);

  const intensity = useMemo(
    () => computeIntensity(summary.volumeKg, summary.durationMin, summary.sets),
    [summary.volumeKg, summary.durationMin, summary.sets]
  );

  const signal = useMemo(
    () => signalFromIntensity(intensity, summary.durationMin, summary.sets),
    [intensity, summary.durationMin, summary.sets]
  );

  const tone = toneColorFromTheme(signal.tone, accent, accent2);

  const bars = Math.max(1, Math.min(5, Math.round(intensity * 5)));

  // Glass tokens
  const cardBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.88);
  const cardBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.1);
  const pillBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.86);
  const pillBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.1);

  const textStrong = isDark ? withAlpha("#FFFFFF", 0.94) : colors.text;
  const textMid = withAlpha(colors.text, isDark ? 0.72 : 0.78);
  const textMuted = withAlpha(colors.text, isDark ? 0.58 : 0.62);

  // Uncluttered actions menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  const requestDelete = () => {
    RNAlert.alert(
      "Delete workout?",
      "This removes the workout from recents and history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!onDelete) return;
            setIsDeleting(true);
            try {
              await onDelete();
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const arc = useMemo(() => {
    // faux-arc: we approximate with a segmented ring using 12 ticks
    const ticks = 12;
    const on = Math.max(1, Math.round(intensity * ticks));
    return { ticks, on };
  }, [intensity]);

  const highlight = summary.highlight;

  const accessibility = `${summary.title}. ${formatDateNice(summary.dateISO)} ${
    summary.timeLabel || ""
  }. ${summary.durationMin} minutes. ${summary.exercisesCount} exercises. ${
    summary.sets
  } sets.`;

  return (
    <Animated.View
      entering={FadeInDown.duration(380)
        .delay(Math.min(140, index * 18))
        .springify()
        .damping(18)
        .stiffness(160)}
      layout={LinearTransition.springify().damping(18).stiffness(220)}
      style={{ marginBottom: 12 }}
    >
      <Animated.View style={press.style}>
        <Pressable
          onPress={() => {
            HAPTIC_LIGHT();
            shimmer.value = withTiming(1, { duration: 90 }, () => {
              shimmer.value = withTiming(0, { duration: 260 });
            });
            onPress?.();
          }}
          onPressIn={() => {
            press.pressIn();
            HAPTIC_LIGHT();
          }}
          onPressOut={press.pressOut}
          accessibilityRole="button"
          accessibilityLabel={accessibility}
          accessibilityHint="Opens workout recap"
          style={({ pressed }) => [
            styles.cardWrap,
            { backgroundColor: cardBg, borderColor: cardBorder },
            pressed && { opacity: 0.93 },
          ]}
        >
          {/* Luxury gradient sheen */}
          <LinearGradient
            colors={
              isDark
                ? [
                    withAlpha("#FFFFFF", 0.1),
                    withAlpha("#FFFFFF", 0.04),
                    withAlpha("#000000", 0.08),
                  ]
                : [
                    withAlpha(accent, 0.1),
                    withAlpha("#FFFFFF", 0.92),
                    withAlpha("#FFFFFF", 0.88),
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Shimmer pulse */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmerBlob,
              { backgroundColor: withAlpha(tone, isDark ? 0.16 : 0.12) },
              shimmerStyle,
            ]}
          />

          {/* Header */}
          <View style={styles.topRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={[styles.title, { color: textStrong }]}
                numberOfLines={1}
              >
                {summary.title || "Workout"}
              </Text>
              <Text
                style={[styles.meta, { color: textMuted }]}
                numberOfLines={1}
              >
                {formatDateNice(summary.dateISO)}
                {summary.timeLabel ? ` • ${summary.timeLabel}` : ""}
              </Text>
            </View>

            {!!summary.prCount && summary.prCount > 0 ? (
              <View
                style={[
                  styles.prPill,
                  {
                    backgroundColor: withAlpha(tone, isDark ? 0.14 : 0.1),
                    borderColor: withAlpha(tone, isDark ? 0.28 : 0.18),
                  },
                ]}
              >
                <Ionicons
                  name="trophy-outline"
                  size={14}
                  color={withAlpha(tone, 0.95)}
                />
                <Text
                  style={[
                    styles.prText,
                    { color: withAlpha(textStrong, isDark ? 0.88 : 0.84) },
                  ]}
                >
                  {summary.prCount}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                HAPTIC_SELECT();
                setMenuOpen(true);
              }}
              style={({ pressed }) => [
                styles.moreBtn,
                { backgroundColor: pillBg, borderColor: pillBorder },
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="More actions"
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={16}
                color={withAlpha(textMid, 0.95)}
              />
            </Pressable>
          </View>

          {/* Stats + Intensity */}
          <View style={styles.middleRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.chipsRow}>
                <Chip
                  icon="barbell-outline"
                  label={`${summary.exercisesCount} ex`}
                  bg={pillBg}
                  border={pillBorder}
                  text={textMid}
                />
                <Chip
                  icon="layers-outline"
                  label={`${summary.sets} sets`}
                  bg={pillBg}
                  border={pillBorder}
                  text={textMid}
                />
                <Chip
                  icon="pulse-outline"
                  label={`${fmtCompact(summary.volumeKg)} kg`}
                  bg={pillBg}
                  border={pillBorder}
                  text={textMid}
                />
                <Chip
                  icon="time-outline"
                  label={`${summary.durationMin}m`}
                  bg={pillBg}
                  border={pillBorder}
                  text={textMid}
                />
              </View>

              {/* micro bars (texture) */}
              <View style={styles.intensityMiniRow}>
                <Text style={[styles.intensityLabel, { color: textMuted }]}>
                  Intensity
                </Text>
                <View style={styles.bars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <View
                      key={`bar-${summary.id}-${i}`}
                      style={[
                        styles.bar,
                        {
                          backgroundColor:
                            i < bars
                              ? withAlpha(tone, 0.92)
                              : withAlpha(textStrong, isDark ? 0.14 : 0.1),
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Arc meter (12 ticks) */}
            <View
              style={styles.arcWrap}
              accessibilityLabel={`Intensity ${Math.round(
                intensity * 100
              )} percent`}
            >
              <View
                style={[
                  styles.arcOuter,
                  { borderColor: withAlpha(textStrong, isDark ? 0.22 : 0.14) }, // a bit crisper
                ]}
              >
                <View
                  style={[
                    styles.arcInner,
                    {
                      // darker "glass well" so pink ticks pop
                      backgroundColor: isDark
                        ? withAlpha("#050814", 0.72)
                        : withAlpha("#FFFFFF", 0.55),
                    },
                  ]}
                >
                  {/* Track ring (behind ticks) */}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.arcTrackRing,
                      {
                        borderColor: isDark
                          ? withAlpha("#FFFFFF", 0.1)
                          : withAlpha("#000000", 0.08),
                      },
                    ]}
                  />

                  {/* Inner crisp stroke (separates meter from itself) */}
                  <View
                    pointerEvents="none"
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: isDark
                          ? withAlpha("#FFFFFF", 0.16)
                          : withAlpha("#000000", 0.1),
                      },
                    ]}
                  />

                  <View style={styles.arcTicks}>
                    {Array.from({ length: arc.ticks }).map((_, i) => {
                      const on = i < arc.on;
                      return (
                        <View
                          key={`tick-${summary.id}-${i}`}
                          style={[
                            styles.arcTick,
                            {
                              backgroundColor: on
                                ? withAlpha(tone, 0.92)
                                : withAlpha(textStrong, isDark ? 0.08 : 0.06),
                              transform: [
                                { rotate: `${i * (360 / arc.ticks)}deg` },
                                { translateY: -18 },
                              ],
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  <Text style={[styles.arcPct, { color: textStrong }]}>
                    {Math.round(intensity * 100)}
                  </Text>
                  {/* <Text style={[styles.arcPctLabel, { color: textMuted }]}>
                    score
                  </Text> */}
                </View>
              </View>
            </View>
          </View>

          {/* Highlight + Signal */}
          <View style={styles.bottomRow}>
            <View
              style={[
                styles.highlightCapsule,
                { backgroundColor: pillBg, borderColor: pillBorder },
              ]}
            >
              <View style={styles.highlightBadge}>
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={withAlpha(tone, 0.95)}
                />
                <Text
                  style={[styles.highlightBadgeText, { color: textStrong }]}
                >
                  {highlight?.label || "Best set"}
                </Text>
              </View>

              {!!highlight?.isPR && (
                <View
                  style={[
                    styles.smallTag,
                    {
                      backgroundColor: withAlpha(tone, 0.16),
                      borderColor: withAlpha(tone, 0.28),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.smallTagText,
                      { color: withAlpha(textStrong, 0.88) },
                    ]}
                  >
                    PR
                  </Text>
                </View>
              )}

              <Text
                style={[styles.highlightText, { color: textMid }]}
                numberOfLines={1}
              >
                {highlight?.text || "—"}
              </Text>
            </View>

            <View
              style={[
                styles.signalPill,
                {
                  backgroundColor: withAlpha(tone, isDark ? 0.12 : 0.1),
                  borderColor: withAlpha(tone, isDark ? 0.26 : 0.18),
                },
              ]}
            >
              <View
                style={[
                  styles.signalDot,
                  { backgroundColor: withAlpha(tone, 0.92), shadowColor: tone },
                ]}
              />
              <Text
                style={[
                  styles.signalText,
                  { color: withAlpha(textStrong, isDark ? 0.9 : 0.86) },
                ]}
              >
                {signal.label}
              </Text>
            </View>
          </View>

          {/* Actions menu (uncluttered) */}
          <ActionMenu
            visible={menuOpen}
            onClose={() => setMenuOpen(false)}
            isDark={isDark}
            textStrong={textStrong}
            textMuted={textMuted}
            accent={accent}
            border={cardBorder}
            onDuplicate={onDuplicate}
            onSaveTemplate={onSaveTemplate}
            onDelete={requestDelete}
          />

          {isDeleting ? (
            <View style={styles.deleteOverlay}>
              <View style={styles.deleteCard}>
                <ActivityIndicator
                  size="small"
                  color={withAlpha(textStrong, 0.9)}
                />
                <Text style={[styles.deleteText, { color: textStrong }]}>
                  Deleting…
                </Text>
              </View>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function Chip({
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
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={icon} size={13} color={withAlpha(text, 0.95)} />
      <Text style={[styles.chipText, { color: text }]}>{label}</Text>
    </View>
  );
}

function ActionMenu({
  visible,
  onClose,
  isDark,
  textStrong,
  textMuted,
  accent,
  border,
  onDuplicate,
  onSaveTemplate,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  textStrong: string;
  textMuted: string;
  accent: string;
  border: string;
  onDuplicate?: () => void;
  onSaveTemplate?: () => void;
  onDelete?: () => void;
}) {
  if (!visible) return null;

  const tint = isDark ? "dark" : "light";
  const bg = isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)";

  const menuBg = isDark
    ? withAlpha("#FFFFFF", 0.08)
    : withAlpha("#FFFFFF", 0.86);
  const menuBorder = isDark ? withAlpha("#FFFFFF", 0.14) : border;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={[styles.menuBackdrop, { backgroundColor: bg }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(160)}
          style={styles.menuWrap}
        >
          <BlurView
            intensity={isDark ? 34 : 24}
            tint={tint}
            style={[
              styles.menuCard,
              { backgroundColor: menuBg, borderColor: menuBorder },
            ]}
          >
            <Text style={[styles.menuTitle, { color: textStrong }]}>
              Actions
            </Text>
            <Text style={[styles.menuSub, { color: textMuted }]}>
              Quick, uncluttered controls.
            </Text>

            <MenuRow
              icon="copy-outline"
              title="Duplicate"
              tone={accent}
              onPress={() => {
                HAPTIC_SELECT();
                onClose();
                onDuplicate?.();
              }}
            />
            <MenuRow
              icon="bookmark-outline"
              title="Save as template"
              tone="#8B7CFF"
              onPress={() => {
                HAPTIC_SELECT();
                onClose();
                onSaveTemplate?.();
              }}
            />

            <View style={styles.menuDivider} />

            <MenuRow
              icon="trash-outline"
              title="Delete"
              tone="#FF5A5F"
              onPress={() => {
                HAPTIC_MED();
                onClose();
                onDelete?.();
              }}
              destructive
            />
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MenuRow({
  icon,
  title,
  tone,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  tone: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.9 }]}
    >
      <View
        style={[
          styles.menuIcon,
          {
            backgroundColor: withAlpha(tone, 0.16),
            borderColor: withAlpha(tone, 0.28),
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={withAlpha(tone, 0.95)} />
      </View>
      <Text
        style={[
          styles.menuRowText,
          {
            color: destructive
              ? withAlpha("#FF5A5F", 0.95)
              : withAlpha("#FFFFFF", 0.92),
          },
        ]}
      >
        {title}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={withAlpha("#FFFFFF", 0.4)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    overflow: "hidden",
  },
  shimmerBlob: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 180,
    right: -60,
    top: -60,
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 22,
  },
  deleteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(15,18,28,0.85)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  deleteText: {
    fontSize: 12,
    fontWeight: "800",
  },

  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  title: { fontSize: 16, fontWeight: "950" as any, letterSpacing: -0.3 },
  meta: { marginTop: 4, fontSize: 12, fontWeight: "750" as any },

  prPill: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
  },
  prText: {
    fontSize: 12,
    fontWeight: "950" as any,
    fontVariant: ["tabular-nums"],
  },

  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  middleRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 12, fontWeight: "850" as any, letterSpacing: -0.1 },

  intensityMiniRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  intensityLabel: { fontSize: 12, fontWeight: "850" as any },
  bars: { flexDirection: "row", gap: 6 },
  bar: { width: 16, height: 6, borderRadius: 6 },

  arcWrap: { width: 86, height: 86 },
  arcOuter: {
    width: 86,
    height: 86,
    borderRadius: 86,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  arcInner: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  arcTicks: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  arcTick: {
    position: "absolute",
    width: 4,
    height: 10,
    borderRadius: 4,
  },
  arcPct: {
    fontSize: 16,
    marginTop: 2,
    fontWeight: "950" as any,
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  arcPctLabel: { marginTop: 2, fontSize: 10, fontWeight: "850" as any },
  arcTrackRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 2,
  },

  bottomRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  highlightCapsule: {
    flex: 1,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  highlightBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  highlightBadgeText: {
    fontSize: 12,
    fontWeight: "950" as any,
    letterSpacing: -0.2,
  },
  highlightText: { flex: 1, fontSize: 12, fontWeight: "750" as any },

  smallTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  smallTagText: { fontSize: 11, fontWeight: "950" as any, letterSpacing: -0.1 },

  signalPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  signalText: { fontSize: 12, fontWeight: "950" as any, letterSpacing: -0.2 },

  // Menu
  menuBackdrop: { flex: 1, justifyContent: "flex-end" },
  menuWrap: { padding: 14, paddingBottom: 16 },
  menuCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    overflow: "hidden",
  },
  menuTitle: { fontSize: 16, fontWeight: "950" as any, letterSpacing: -0.2 },
  menuSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700" as any,
    lineHeight: 16,
  },

  menuRow: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  menuRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "950" as any,
    letterSpacing: -0.2,
  },

  menuDivider: {
    marginTop: 10,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
});
