// app/(tabs)/workouts.tsx
// Drop-in replacement ✅
// Theme-adjusted: light mode is glossy + readable (no “washed out” text), dark mode unchanged vibe.
// Notes:
// - Uses your ThemeProvider: { colors, isDark }
// - Keeps your Coach Spark + template routes as-is

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  Platform,
  StatusBar,
  AccessibilityInfo,
  useWindowDimensions,
  Modal,
  ActivityIndicator,
  Alert as RNAlert,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useAnimatedScrollHandler,
  withSpring,
} from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import * as Haptics from "expo-haptics";
import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import {
  subscribeWorkouts,
  deleteWorkout,
  type Workout,
} from "@/services/workouts";

import {
  subscribeWorkoutTemplates,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
  type WorkoutTemplate as DbWorkoutTemplate,
} from "@/services/templates";
import ActivityCard from "@/components/activity/ActivityCard";
import {
  WorkoutEntryCardPremium,
  type WorkoutEntrySummary,
} from "@/components/workouts/ui/WorkoutEntryCard";

import {
  subscribeActivityBetween,
  addActivity,
  updateActivity,
  deleteActivity,
  type ActivityEntry as CardioEntry,
} from "@/services/activity";
import {
  loadSessionDraft,
  type WorkoutSessionDraft,
} from "@/components/workouts/sessionDraft";
import { WorkoutSessionHeroCard } from "@/components/workouts/ui/WorkoutSessionHeroCard";
import { TemplatesSectionPremium } from "@/components/workouts/ui/TemplatesSectionPremium";
import { CoachSparkCardPremium } from "@/components/workouts/ui/CoachSparkCardPremium";

const withAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const pad2 = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

type WorkoutSummary = {
  id: string;
  title: string;
  subtitle?: string;
  dateLabel: string;
  durationMin: number;
  sets: number;
  volumeKg: number;
  pr?: { label: string; value?: string };
  highlight?: string;
};

type TemplateSource = "user" | "auto";

type TemplateItem = {
  exercise: string;
  sets: number;
  reps: number;
  weight?: number;
  weightKg?: number;
  notes?: string;
};

type TemplateVM = {
  id: string;
  name: string;
  emoji?: string;
  tag?: string;
  tags?: string[];
  source: TemplateSource;
  items: TemplateItem[];
  createdAt?: any;
  updatedAt?: any;
  lastUsedAt?: any;
  pinned?: boolean;
};

type ActiveSession = {
  title: string;
  elapsedMin: number;
  setsLogged?: number;
  exercisesCount?: number;
  volumeKg?: number;
  lastActiveAtMs?: number;
  startedAtMs?: number;
  lastAction?: string;
};

const AUTO_TEMPLATES: TemplateVM[] = [
  {
    id: "auto-push",
    name: "Push (Strength)",
    emoji: "🔥",
    tag: "Upper • Strength",
    source: "auto",
    items: [
      { exercise: "Bench Press", sets: 4, reps: 6, weightKg: 0 },
      { exercise: "Incline DB Press", sets: 3, reps: 8, weightKg: 0 },
      { exercise: "Overhead Press", sets: 3, reps: 8, weightKg: 0 },
      { exercise: "Lateral Raise", sets: 3, reps: 12, weightKg: 0 },
      { exercise: "Triceps Pushdown", sets: 3, reps: 12, weightKg: 0 },
    ],
  },
  {
    id: "auto-pull",
    name: "Pull (Strength)",
    emoji: "🧲",
    tag: "Upper • Strength",
    source: "auto",
    items: [
      { exercise: "Lat Pulldown", sets: 4, reps: 8, weightKg: 0 },
      { exercise: "Chest-Supported Row", sets: 3, reps: 10, weightKg: 0 },
      { exercise: "Seated Cable Row", sets: 3, reps: 10, weightKg: 0 },
      { exercise: "Face Pull", sets: 3, reps: 12, weightKg: 0 },
      { exercise: "DB Curl", sets: 3, reps: 12, weightKg: 0 },
    ],
  },
  {
    id: "auto-legs",
    name: "Legs (Strength)",
    emoji: "🦵",
    tag: "Lower • Strength",
    source: "auto",
    items: [
      { exercise: "Squat", sets: 4, reps: 6, weightKg: 0 },
      { exercise: "RDL", sets: 3, reps: 8, weightKg: 0 },
      { exercise: "Leg Press", sets: 3, reps: 10, weightKg: 0 },
      { exercise: "Leg Curl", sets: 3, reps: 12, weightKg: 0 },
      { exercise: "Calf Raise", sets: 4, reps: 12, weightKg: 0 },
    ],
  },
  {
    id: "auto-upper",
    name: "Upper (Balanced)",
    emoji: "⚡️",
    tag: "Upper • Balanced",
    source: "auto",
    items: [
      { exercise: "Bench Press", sets: 3, reps: 8, weightKg: 0 },
      { exercise: "Lat Pulldown", sets: 3, reps: 10, weightKg: 0 },
      { exercise: "Incline DB Press", sets: 2, reps: 10, weightKg: 0 },
      { exercise: "Row (Machine)", sets: 2, reps: 10, weightKg: 0 },
      { exercise: "Lateral Raise", sets: 2, reps: 15, weightKg: 0 },
    ],
  },
  {
    id: "auto-zone2",
    name: "Zone 2 Cardio",
    emoji: "🫀",
    tag: "Cardio • Conditioning",
    source: "auto",
    items: [
      {
        exercise: "Treadmill / Run",
        sets: 1,
        reps: 1,
        notes: "20–40 min Zone 2",
      },
    ],
  },
  {
    id: "auto-mobility",
    name: "Mobility (10–15 min)",
    emoji: "🧘",
    tag: "Recovery • Mobility",
    source: "auto",
    items: [
      { exercise: "Hip Opener Flow", sets: 1, reps: 1 },
      { exercise: "Thoracic Rotation", sets: 2, reps: 8 },
      { exercise: "Hamstring Stretch", sets: 2, reps: 1, notes: "45–60s hold" },
    ],
  },
];

function createdAtMs(r: any) {
  const c = r?.createdAt;
  if (!c) return 0;
  if (typeof c === "number") return c;
  if (typeof c?.toMillis === "function") return c.toMillis();
  if (typeof c?.seconds === "number") return c.seconds * 1000;
  return 0;
}

function ScalePressable({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  style,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const down = useSharedValue(0);

  const aStyle = useAnimatedStyle(() => {
    const s = interpolate(down.value, [0, 1], [1, 0.985]);
    return { transform: [{ scale: s }] };
  });

  return (
    <Animated.View style={[aStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          onPressIn?.();
          down.value = withTiming(1, {
            duration: 90,
            easing: Easing.out(Easing.quad),
          });
        }}
        onPressOut={() => {
          onPressOut?.();
          down.value = withTiming(0, {
            duration: 140,
            easing: Easing.out(Easing.quad),
          });
        }}
        style={({ pressed }) => [pressed && { opacity: 0.98 }]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/**
 * THEME MODEL (local to this file)
 * Goal: keep the exact same components, but drive every “white-on-dark” style
 * from theme tokens so light mode is glossy + high-contrast.
 */
function useSurfaceTokens() {
  const { colors, isDark } = useTheme();

  // Background gradient
  const bgGradient = isDark
    ? ["#070A12", "#050711", "#03040A"]
    : [
        withAlpha(colors.primary, 0.12),
        withAlpha("#FFFFFF", 0.92),
        withAlpha(colors.card, 0.55),
      ];

  // Text
  const t1 = isDark ? withAlpha("#FFFFFF", 0.94) : withAlpha(colors.text, 0.94);
  const t2 = isDark ? withAlpha("#FFFFFF", 0.62) : withAlpha(colors.text, 0.64);
  const t3 = isDark ? withAlpha("#FFFFFF", 0.78) : withAlpha(colors.text, 0.78);

  // Surfaces
  const cardBorder = isDark
    ? withAlpha("#FFFFFF", 0.2)
    : withAlpha(colors.text, 0.12);

  const cardFill = isDark
    ? withAlpha("#FFFFFF", 0.04)
    : withAlpha("#FFFFFF", 0.78);

  const chipFill = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.7);

  const chipBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.12);

  const hairline = isDark
    ? withAlpha("#FFFFFF", 0.12)
    : withAlpha(colors.text, 0.1);

  // Icons + chevrons
  const icon = isDark
    ? withAlpha("#FFFFFF", 0.9)
    : withAlpha(colors.text, 0.86);
  const iconBright = isDark
    ? withAlpha("#FFFFFF", 0.98)
    : withAlpha(colors.text, 0.92);
  const chevron = isDark
    ? withAlpha("#FFFFFF", 0.35)
    : withAlpha(colors.text, 0.35);

  // optional helpers for hierarchy
  const tTitleSoft = isDark
    ? withAlpha("#FFFFFF", 0.78)
    : withAlpha(colors.text, 0.78);
  const tMetaStrong = isDark
    ? withAlpha("#FFFFFF", 0.72)
    : withAlpha(colors.text, 0.72);

  // “Ghost button” look
  const ghostFill = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.72);
  const ghostBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.14);

  return {
    colors,
    isDark,
    bgGradient,
    t1,
    t2,
    t3,
    tTitleSoft,
    tMetaStrong,
    icon,
    iconBright,
    chevron,
    cardBorder,
    cardFill,
    chipFill,
    chipBorder,
    hairline,
    ghostFill,
    ghostBorder,
  };
}

function GlassCard({
  children,
  style,
  intensity = 24,
}: {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
}) {
  const s = useSurfaceTokens();

  const gradColors = s.isDark
    ? [
        withAlpha("#FFFFFF", 0.14),
        withAlpha("#FFFFFF", 0.06),
        withAlpha("#000000", 0.02),
      ]
    : [
        withAlpha("#FFFFFF", 0.94),
        withAlpha(s.colors.primary, 0.1),
        withAlpha("#FFFFFF", 0.78),
      ];

  return (
    <View
      style={[
        styles.cardWrap,
        { backgroundColor: s.cardFill, borderColor: s.cardBorder },
        style,
      ]}
    >
      <View
        style={[styles.cardBorder, { borderColor: s.cardBorder }]}
        pointerEvents="none"
      />
      <BlurView
        intensity={intensity}
        tint={s.isDark ? "dark" : "light"}
        style={styles.cardBlur}
      >
        <LinearGradient
          colors={gradColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardInner}
        >
          {/* subtle sheen */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 18,
                backgroundColor: s.isDark
                  ? withAlpha("#FFFFFF", 0.09)
                  : withAlpha("#FFFFFF", 0.4),
              },
            ]}
          />
          {children}
        </LinearGradient>
      </BlurView>
    </View>
  );
}

function Pill({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  const s = useSurfaceTokens();
  const iconScale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  const stroke = s.isDark
    ? [withAlpha("#FFFFFF", 0.28), withAlpha("#FFFFFF", 0.08)]
    : [withAlpha(s.colors.primary, 0.38), withAlpha("#FFFFFF", 0.35)];
  return (
    <ScalePressable
      onPress={onPress}
      onPressIn={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        iconScale.value = withSpring(1.12, { damping: 12, stiffness: 260 });
      }}
      onPressOut={() => {
        iconScale.value = withSpring(1, { damping: 14, stiffness: 220 });
      }}
      accessibilityLabel={label}
      accessibilityHint="Activates quick workout action"
      style={{ marginRight: 10 }}
    >
      <LinearGradient colors={stroke as any} style={styles.pillStroke}>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: s.chipFill,
              borderColor: s.chipBorder,
            },
          ]}
        >
          <Animated.View style={iconStyle}>
            <Ionicons name={icon} size={15} color={s.iconBright} />
          </Animated.View>
          <Text style={[styles.pillText, { color: s.t1 }]}>{label}</Text>
        </View>
      </LinearGradient>
    </ScalePressable>
  );
}

function Ring({
  label,
  value,
  sub,
  accent = "#68D7FF",
  onPress,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
  onPress?: () => void;
}) {
  const s = useSurfaceTokens();
  return (
    <ScalePressable
      onPress={onPress}
      accessibilityLabel={`${label}. ${value}. ${sub}.`}
      accessibilityHint="Opens weekly summary"
      style={{ flex: 1 }}
    >
      <GlassCard style={styles.ringCard} intensity={26}>
        <View style={styles.ringTop}>
          <View
            style={[
              styles.ringDot,
              { backgroundColor: withAlpha(accent, 0.9) },
            ]}
          />
          <Text style={[styles.ringLabel, { color: s.t2 }]}>{label}</Text>
        </View>
        <Text style={[styles.ringValue, { color: s.t1 }]}>{value}</Text>
        <Text style={[styles.ringSub, { color: s.t2 }]}>{sub}</Text>
      </GlassCard>
    </ScalePressable>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const s = useSurfaceTokens();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: s.t1 }]}>{title}</Text>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [
            styles.sectionAction,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={[styles.sectionActionText, { color: s.t3 }]}>
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={s.chevron} />
        </Pressable>
      ) : null}
    </View>
  );
}

function StatChip({
  icon,
  label,
  dense = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  dense?: boolean;
}) {
  const s = useSurfaceTokens();
  const bg = s.isDark
    ? [withAlpha("#FFFFFF", 0.08), withAlpha("#FFFFFF", 0.04)]
    : [withAlpha("#FFFFFF", 0.9), withAlpha("#FFFFFF", 0.6)];
  return (
    <LinearGradient
      colors={bg as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.statChip,
        dense && styles.statChipDense,
        { borderColor: withAlpha(s.colors.text, s.isDark ? 0.18 : 0.12) },
      ]}
    >
      <Ionicons name={icon} size={dense ? 13 : 14} color={s.iconBright} />
      <Text
        style={[
          styles.statChipText,
          dense && styles.statChipTextDense,
          { color: s.t1 },
        ]}
      >
        {label}
      </Text>
    </LinearGradient>
  );
}

function WorkoutCard({
  w,
  index = 0,
  onPress,
  onDuplicate,
  onDelete,
  onSaveTemplate,
}: {
  w: WorkoutSummary;
  index?: number;
  onPress?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSaveTemplate?: () => void;
}) {
  const s = useSurfaceTokens();

  const isHero = index === 0;
  const highlight = w.highlight
    ? w.highlight.replace(/^best set:\s*/i, "")
    : "";
  const intensity = useMemo(() => {
    const density = w.volumeKg / Math.max(1, w.durationMin);
    const score = 0.6 * (density / 420) + 0.4 * (w.sets / 32);
    return clamp(score, 0, 1);
  }, [w.volumeKg, w.durationMin, w.sets]);
  const bars = Math.max(1, Math.min(5, Math.round(intensity * 5)));

  // subtle depth stack
  const stackStyle = isHero ? styles.heroCardWrap : styles.stackCardWrap;
  const isGeneric = (w.title || "").trim().toLowerCase() === "workout";

  return (
    <Animated.View
      entering={FadeInDown.duration(380).springify().damping(18).stiffness(160)}
    >
      <ScalePressable
        onPress={onPress}
        accessibilityLabel={`${w.title}. ${w.dateLabel}. ${w.durationMin} minutes. ${w.sets} sets.`}
        accessibilityHint="Opens workout details"
        style={[{ marginBottom: 12 }, stackStyle]}
      >
        <GlassCard
          intensity={22}
          style={[styles.workoutCard, !isHero && styles.workoutCardCompact]}
        >
          <View style={styles.workoutHeaderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={[
                  styles.workoutTitle,
                  { color: isGeneric ? s.tTitleSoft : s.t1 },
                ]}
                numberOfLines={1}
              >
                {w.title}
              </Text>

              <Text
                style={[styles.workoutMeta, { color: s.tMetaStrong }]}
                numberOfLines={1}
              >
                {w.subtitle ? `${w.subtitle} • ` : ""}
                {w.dateLabel}
              </Text>
            </View>

            {w.pr ? (
              <View style={styles.prBadge} accessibilityLabel="Personal record">
                <Ionicons
                  name="trophy"
                  size={14}
                  color={withAlpha("#111", 0.9)}
                />
                <Text style={styles.prText}>PR</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={s.chevron} />
            )}
          </View>

          <View style={[styles.statsRow, !isHero && styles.statsRowCompact]}>
            <StatChip
              icon="time-outline"
              label={`${w.durationMin}m`}
              dense={!isHero}
            />
            <StatChip
              icon="layers-outline"
              label={`${w.sets} sets`}
              dense={!isHero}
            />
            <StatChip
              icon="barbell-outline"
              label={`${Math.round(w.volumeKg)} kg`}
              dense={!isHero}
            />
          </View>

          <View
            style={[styles.intensityRow, !isHero && styles.intensityRowCompact]}
          >
            <Text style={[styles.intensityLabel, { color: s.t2 }]}>
              Intensity
            </Text>
            <View style={styles.intensityBars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={`intensity-${w.id}-${i}`}
                  style={[
                    styles.intensityBar,
                    {
                      backgroundColor:
                        i < bars
                          ? withAlpha(s.colors.primary, 0.9)
                          : withAlpha(s.colors.text, s.isDark ? 0.18 : 0.12),
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {w.highlight ? (
            <View
              style={[
                styles.bestSetPill,
                {
                  backgroundColor: s.isDark
                    ? withAlpha("#FFFFFF", 0.06)
                    : withAlpha("#FFFFFF", 0.72),
                  borderColor: s.hairline,
                },
              ]}
            >
              <View style={styles.bestSetBadge}>
                <Ionicons name="sparkles-outline" size={13} color={s.icon} />
                <Text style={[styles.bestSetBadgeText, { color: s.t1 }]}>
                  Best set
                </Text>
              </View>
              {w.pr ? (
                <View style={styles.bestSetTag}>
                  <Text style={styles.bestSetTagText}>PR</Text>
                </View>
              ) : null}
              <Text
                style={[styles.bestSetText, { color: s.t2 }]}
                numberOfLines={1}
              >
                {highlight}
              </Text>
            </View>
          ) : null}

          {w.pr ? (
            <Text style={[styles.prLine, { color: s.t3 }]} numberOfLines={1}>
              {w.pr.label}
              {w.pr.value ? ` • ${w.pr.value}` : ""}
            </Text>
          ) : null}

          {isHero ? (
            <View style={styles.cardActions}>
              {/* Primary: Duplicate */}
              <Pressable
                onPress={onDuplicate}
                accessibilityRole="button"
                accessibilityLabel="Duplicate workout"
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  {
                    backgroundColor: s.isDark
                      ? withAlpha("#FFFFFF", 0.08)
                      : withAlpha("#FFFFFF", 0.82),
                    borderColor: s.isDark
                      ? withAlpha("#FFFFFF", 0.16)
                      : withAlpha(s.colors.text, 0.14),
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons name="copy-outline" size={16} color={s.icon} />
                <Text style={[styles.actionBtnText, { color: s.t1 }]}>
                  Duplicate
                </Text>
              </Pressable>

              {/* Neutral: Save template */}
              <Pressable
                onPress={onSaveTemplate}
                accessibilityRole="button"
                accessibilityLabel="Save workout as template"
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: s.isDark
                      ? withAlpha("#FFFFFF", 0.05)
                      : withAlpha("#FFFFFF", 0.74),
                    borderColor: s.hairline,
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons name="bookmark-outline" size={16} color={s.icon} />
                <Text style={[styles.actionBtnText, { color: s.t1 }]}>
                  Save template
                </Text>
              </Pressable>

              {/* Quiet destructive: icon only */}
              <Pressable
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete workout"
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnIconOnly,
                  {
                    backgroundColor: "transparent",
                    borderColor: s.hairline,
                    opacity: pressed ? 0.45 : 0.55,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color={s.chevron} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.cardActionsCompact}>
              <Pressable
                onPress={onDuplicate}
                accessibilityRole="button"
                accessibilityLabel="Duplicate workout"
                style={({ pressed }) => [
                  styles.actionBtnCompact,
                  { borderColor: s.hairline },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons name="copy-outline" size={15} color={s.icon} />
              </Pressable>
              <Pressable
                onPress={onSaveTemplate}
                accessibilityRole="button"
                accessibilityLabel="Save workout as template"
                style={({ pressed }) => [
                  styles.actionBtnCompact,
                  { borderColor: s.hairline },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons name="bookmark-outline" size={15} color={s.icon} />
              </Pressable>
              <Pressable
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete workout"
                style={({ pressed }) => [
                  styles.actionBtnCompact,
                  { borderColor: s.hairline, opacity: pressed ? 0.5 : 0.6 },
                ]}
              >
                <Ionicons name="trash-outline" size={15} color={s.chevron} />
              </Pressable>
            </View>
          )}
        </GlassCard>
      </ScalePressable>
    </Animated.View>
  );
}

function TemplateChip({ t, onPress }: { t: TemplateVM; onPress?: () => void }) {
  const s = useSurfaceTokens();
  const isUser = t.source === "user";
  return (
    <ScalePressable onPress={onPress} style={{ marginRight: 10 }}>
      <GlassCard intensity={20} style={styles.templateCard}>
        <View
          style={[
            styles.templateChip,
            {
              backgroundColor: s.cardFill,
              borderColor: s.cardBorder,
            },
          ]}
        >
          <Text style={styles.templateEmoji}>{t.emoji ?? "🏋️"}</Text>

          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                style={[styles.templateName, { color: s.t1 }]}
                numberOfLines={1}
              >
                {t.name}
              </Text>

              <View
                style={[
                  styles.templateBadge,
                  isUser
                    ? styles.templateBadgeUser
                    : [
                        styles.templateBadgeAuto,
                        {
                          backgroundColor: s.isDark
                            ? withAlpha("#FFFFFF", 0.07)
                            : withAlpha("#FFFFFF", 0.8),
                          borderColor: s.isDark
                            ? withAlpha("#FFFFFF", 0.14)
                            : withAlpha(s.colors.text, 0.14),
                        },
                      ],
                ]}
              >
                <Text
                  style={[
                    styles.templateBadgeText,
                    {
                      color: isUser ? styles.templateBadgeTextUser.color : s.t2,
                    },
                  ]}
                >
                  {isUser ? "SAVED" : "SUGGESTED"}
                </Text>
              </View>
            </View>

            {t.tag ? (
              <Text style={[styles.templateTag, { color: s.t2 }]}>{t.tag}</Text>
            ) : null}
          </View>

          <Ionicons name="play" size={16} color={s.chevron} />
        </View>
      </GlassCard>
    </ScalePressable>
  );
}

/* ───────────────────────────── */
/* Sheets: Start + Templates      */
/* ───────────────────────────── */
function SheetShell({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const s = useSurfaceTokens();
  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.sheetBackdrop,
          {
            backgroundColor: s.isDark
              ? "rgba(0,0,0,0.35)"
              : "rgba(10,14,28,0.12)",
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetWrap}>
          <GlassCard intensity={38} style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: s.t1 }]}>
                  {title}
                </Text>
                {!!subtitle && (
                  <Text style={[styles.sheetSubtitle, { color: s.t2 }]}>
                    {subtitle}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [
                  styles.sheetClose,
                  {
                    backgroundColor: s.ghostFill,
                    borderColor: s.ghostBorder,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="close" size={18} color={s.icon} />
              </Pressable>
            </View>
            {children}
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
}

function SheetRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const s = useSurfaceTokens();
  return (
    <ScalePressable onPress={onPress} style={{ marginBottom: 10 }}>
      <View
        style={[
          styles.sheetRow,
          {
            backgroundColor: s.isDark
              ? withAlpha("#FFFFFF", 0.05)
              : withAlpha("#FFFFFF", 0.78),
            borderColor: s.hairline,
          },
        ]}
      >
        <View
          style={[
            styles.sheetIcon,
            { backgroundColor: s.ghostFill, borderColor: s.ghostBorder },
          ]}
        >
          <Ionicons name={icon} size={18} color={s.icon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sheetRowTitle, { color: s.t1 }]}>{title}</Text>
          {!!subtitle && (
            <Text
              style={[styles.sheetRowSubtitle, { color: s.t2 }]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {right ?? (
          <Ionicons name="chevron-forward" size={16} color={s.chevron} />
        )}
      </View>
    </ScalePressable>
  );
}

function Toast({
  text,
  actionLabel,
  onAction,
  onHide,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  onHide?: () => void;
}) {
  const s = useSurfaceTokens();
  if (!text) return null;
  return (
    <View style={styles.toastWrap} pointerEvents="box-none">
      <GlassCard intensity={40} style={styles.toastCard}>
        <Text style={[styles.toastText, { color: s.t1 }]} numberOfLines={2}>
          {text}
        </Text>
        {!!actionLabel && !!onAction && (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [
              styles.toastBtn,
              {
                backgroundColor: s.ghostFill,
                borderColor: s.ghostBorder,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.toastBtnText, { color: s.t1 }]}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onHide}
          hitSlop={10}
          style={{ padding: 6, marginLeft: 4 }}
        >
          <Ionicons name="close" size={16} color={s.chevron} />
        </Pressable>
      </GlassCard>
    </View>
  );
}

/* ───────────────────────────── */
/* Screen                        */
/* ───────────────────────────── */
export default function WorkoutsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const uid = user?.uid;

  const s = useSurfaceTokens();

  const TEMPLATE_PREVIEW_COUNT = 7;
  const [dbTemplates, setDbTemplates] = useState<DbWorkoutTemplate[]>([]);
  const [activityEntries, setActivityEntries] = useState<CardioEntry[]>([]);

  const accent = "#68D7FF";
  const accent2 = "#8B7CFF";
  const scrollY = useSharedValue(0);
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeWorkoutTemplates(user.uid, setDbTemplates);
  }, [user?.uid]);

  const templatesMerged: TemplateVM[] = useMemo<TemplateVM[]>(() => {
    const userMapped: TemplateVM[] = (dbTemplates ?? [])
      .map((t: any) => ({
        id: t.id,
        name: t.name ?? t.title ?? "Template",
        emoji: t.emoji ?? "⭐️",
        tags: t.tags ?? t.tag ?? [],
        tag:
          (Array.isArray(t.tags) ? t.tags : Array.isArray(t.tag) ? t.tag : [])
            .slice(0, 2)
            .join(" • ") || "Saved template",
        source: "user" as TemplateSource,
        items: (t.items ?? t.exercises ?? []).map((it: any) => ({
          exercise: it.exercise ?? it.name ?? "",
          sets: Number(it.sets || 0),
          reps: Number(it.reps || 0),
          weightKg: Number(it.weightKg ?? it.weight ?? 0),
          notes: it.notes || "",
        })),
        createdAt: t.createdAt ?? null,
        updatedAt: t.updatedAt ?? null,
        lastUsedAt: t.lastUsedAt ?? null,
        pinned: !!t.pinned,
      }))
      .filter((t) => t.name && t.items?.length);

    const usedIds = new Set(userMapped.map((x) => x.id));
    const usedNames = new Set(userMapped.map((x) => x.name.toLowerCase()));
    const autos = AUTO_TEMPLATES.filter(
      (a) => !usedIds.has(a.id) && !usedNames.has(a.name.toLowerCase())
    );

    return [...userMapped, ...autos];
  }, [dbTemplates]);

  const userTemplatesPreview = useMemo(
    () =>
      templatesMerged
        .filter((t) => t.source === "user")
        .slice(0, TEMPLATE_PREVIEW_COUNT),
    [templatesMerged]
  );

  const templateSeedKey = (u: string) => `workout:templateSeed:${u}`;

  const [templateActionsOpen, setTemplateActionsOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TemplateVM | null>(null);

  function openTemplateActions(t: TemplateVM) {
    setActiveTemplate(t);
    setTemplateActionsOpen(true);
  }

  const haptic = async (kind: "light" | "select" = "select") => {
    try {
      if (kind === "light")
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else await Haptics.selectionAsync();
    } catch {}
  };

  const openSession = async (params?: Record<string, any>) => {
    await haptic("select");
    router.push({ pathname: "/workouts/session", params } as any);
  };

  async function startFromTemplate(t: TemplateVM) {
    if (!uid) return;
    const seed = {
      title: t.name,
      exercises: (t.items || []).map((it) => ({
        name: it.exercise,
        sets: Math.max(1, Number(it.sets || 1)),
        reps: Number(it.reps || 10),
        weightKg: Number(it.weightKg ?? it.weight ?? 0),
        note: (it.notes || "").trim(),
      })),
    };
    await AsyncStorage.setItem(templateSeedKey(uid), JSON.stringify(seed));
    if (t.source === "user") {
      updateWorkoutTemplate(uid, t.id, { lastUsedAt: Date.now() } as any).catch(
        () => {}
      );
    }
    await openSession({ templateId: t.id, templateName: t.name });
  }

  function volumeKg(sets: number, reps: number, weightKg: number) {
    return (
      Math.max(0, Number(sets || 0)) *
      Math.max(0, Number(reps || 0)) *
      Math.max(0, Number(weightKg || 0))
    );
  }

  function timeAgoLabelFromISO(isoDate: string) {
    const today = new Date();
    const t0 = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();
    const d = isoDate.split("-").map((n) => Number(n));
    if (d.length !== 3) return isoDate;
    const t1 = new Date(d[0], d[1] - 1, d[2]).getTime();
    const days = Math.round((t0 - t1) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days > 1 && days < 7)
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        new Date(t1).getDay()
      ];
    return isoDate;
  }

  function fmtTime(ms: number) {
    if (!ms) return "";
    const d = new Date(ms);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  type WorkoutRow = Workout & {
    sessionId?: string;
    sessionTitle?: string;
    sessionStartedAt?: number;
  };

  type SessionBucket = {
    key: string;
    sessionId?: string;
    dateISO: string;
    title: string;
    startedAt?: number;
    latestAt?: number;
    rows: WorkoutRow[];
  };

  function buildSessionBuckets(all: WorkoutRow[]) {
    const rows = (all || []).slice();
    const gapMs = 1000 * 60 * 120; // 2h gap groups separate sessions if no sessionId

    const dateMsFromISO = (iso: string) => {
      if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 0;
      return new Date(`${iso}T00:00:00`).getTime();
    };

    const rowCreatedAtMs = (r: WorkoutRow) => {
      const raw =
        (r as any).setCreatedAt ??
        (r as any).createdAt ??
        (r as any).sessionStartedAt;
      if (!raw) return 0;
      if (typeof raw === "number") return raw;
      if (typeof raw?.toMillis === "function") return raw.toMillis();
      if (typeof raw?.seconds === "number") return raw.seconds * 1000;
      return 0;
    };

    rows.sort((a, b) => {
      const ad = (a as any).date || "";
      const bd = (b as any).date || "";
      if (ad !== bd) return bd.localeCompare(ad);
      return rowCreatedAtMs(b) - rowCreatedAtMs(a);
    });

    const buckets = new Map<string, SessionBucket & { latestAt?: number }>();
    const autoBucketsByDate = new Map<
      string,
      Array<SessionBucket & { latestAt?: number }>
    >();

    for (const r of rows) {
      const dateISO = ((r as any).date || "").trim() || "Unknown date";
      const sid =
        typeof (r as any).sessionId === "string" && (r as any).sessionId.trim()
          ? String((r as any).sessionId)
          : "";

      const title =
        typeof (r as any).sessionTitle === "string" &&
        (r as any).sessionTitle.trim()
          ? String((r as any).sessionTitle)
          : "Workout";

      const startedAt =
        Number((r as any).sessionStartedAt || 0) ||
        rowCreatedAtMs(r) ||
        dateMsFromISO(dateISO) ||
        undefined;
      const createdMs = rowCreatedAtMs(r) || startedAt || 0;

      if (sid) {
        const key = `session:${sid}`;
        const existing = buckets.get(key);
        if (!existing) {
          buckets.set(key, {
            key,
            sessionId: sid,
            dateISO,
            title,
            startedAt,
            latestAt: createdMs,
            rows: [r],
          });
        } else {
          existing.rows.push(r);
          existing.latestAt = Math.max(existing.latestAt || 0, createdMs || 0);
          if (existing.title === "Workout" && title !== "Workout")
            existing.title = title;
          if (!existing.startedAt && startedAt) existing.startedAt = startedAt;
          if (existing.dateISO === "Unknown date" && dateISO !== "Unknown date")
            existing.dateISO = dateISO;
        }
        continue;
      }

      const autoList = autoBucketsByDate.get(dateISO) || [];
      const last = autoList[autoList.length - 1];
      if (last && last.latestAt && last.latestAt - createdMs <= gapMs) {
        last.rows.push(r);
        last.latestAt = Math.max(last.latestAt || 0, createdMs || 0);
        if (last.title === "Workout" && title !== "Workout") last.title = title;
        if (!last.startedAt && startedAt) last.startedAt = startedAt;
      } else {
        const key = `auto:${dateISO}:${autoList.length}`;
        const bucket: SessionBucket & { latestAt?: number } = {
          key,
          sessionId: undefined,
          dateISO,
          title,
          startedAt,
          latestAt: createdMs,
          rows: [r],
        };
        autoList.push(bucket);
        autoBucketsByDate.set(dateISO, autoList);
        buckets.set(key, bucket);
      }
    }

    return {
      sessions: Array.from(buckets.values()).sort((a, b) => {
        const at = a.latestAt || a.startedAt || rowCreatedAtMs(a.rows[0]) || 0;
        const bt = b.latestAt || b.startedAt || rowCreatedAtMs(b.rows[0]) || 0;
        return bt - at;
      }),
      rowCreatedAtMs,
    };
  }

  function buildRecentsFromWorkoutRows(all: WorkoutRow[]): WorkoutSummary[] {
    const { sessions, rowCreatedAtMs } = buildSessionBuckets(all);

    return sessions.map((sess) => {
      const ordered = sess.rows
        .slice()
        .sort((a, b) => rowCreatedAtMs(a) - rowCreatedAtMs(b));

      const first = ordered[0];
      const last = ordered[ordered.length - 1];

      const totalSets = ordered.reduce(
        (acc, r) => acc + Number((r as any).sets || 0),
        0
      );
      const exerciseCount = new Set(
        ordered.map((r) =>
          String((r as any).exercise || "")
            .trim()
            .toLowerCase()
        )
      ).size;
      const totalVolume = ordered.reduce((acc, r) => {
        return (
          acc +
          volumeKg(
            Number((r as any).sets || 0),
            Number((r as any).reps || 0),
            Number((r as any).weight || 0)
          )
        );
      }, 0);

      const start = sess.startedAt || rowCreatedAtMs(first);
      const end = rowCreatedAtMs(last) || start;
      const durationMin =
        start && end && end >= start
          ? Math.max(1, Math.round((end - start) / 60000))
          : 0;

      let bestLine = "";
      let bestVol = -1;
      for (const r of ordered) {
        const v = volumeKg(
          Number((r as any).sets || 0),
          Number((r as any).reps || 0),
          Number((r as any).weight || 0)
        );
        if (v > bestVol) {
          bestVol = v;
          const ex = (r as any).exercise || "Exercise";
          const sets = Number((r as any).sets || 0);
          const reps = Number((r as any).reps || 0);
          const wt = Number((r as any).weight || 0);
          bestLine = `${ex} • ${sets}×${reps} @ ${Math.round(wt)}kg`;
        }
      }

      const dayLabel = timeAgoLabelFromISO(sess.dateISO);
      const timeLabel = start ? fmtTime(start) : "";
      const dateLabel = timeLabel ? `${dayLabel} • ${timeLabel}` : dayLabel;

      return {
        id: sess.key,
        title: sess.title || "Workout",
        subtitle: exerciseCount ? `${exerciseCount} exercises` : undefined,
        dateLabel,
        durationMin,
        sets: totalSets,
        volumeKg: Math.round(totalVolume),
        highlight: bestLine ? `Best set: ${bestLine}` : undefined,
      };
    });
  }

  const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
  const contentMax = Math.min(980, width);
  const sidePad = clamp((width - contentMax) / 2, 16, 28);

  const [draftSession, setDraftSession] = useState<WorkoutSessionDraft | null>(
    null
  );
  const [hideDraftHero, setHideDraftHero] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      if (!uid) {
        setDraftSession(null);
        return () => {};
      }
      (async () => {
        const draft = await loadSessionDraft(uid);
        if (mounted) setDraftSession(draft);
      })();
      return () => {
        mounted = false;
      };
    }, [uid])
  );

  const hasDraftSession = !!draftSession;
  const showDraftSession = hasDraftSession && !hideDraftHero;

  useEffect(() => {
    if (!draftSession) setHideDraftHero(false);
  }, [draftSession]);

  const activeSession = useMemo<ActiveSession | null>(() => {
    if (!draftSession) return null;
    const items = draftSession.items || [];
    const setsLogged = items.reduce(
      (sum, it) => sum + Math.max(1, Number(it.sets || 1)),
      0
    );
    const exercisesCount = new Set(
      items
        .map((it) =>
          String(it.exercise || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    ).size;
    const totalVolumeKg = items.reduce(
      (sum, it) =>
        sum +
        volumeKg(
          Number(it.sets || 1),
          Number(it.reps || 0),
          Number(it.weightKg || 0)
        ),
      0
    );
    const elapsedMin = Math.max(
      0,
      Math.round((Date.now() - draftSession.startedAt) / 60000)
    );
    return {
      title: (draftSession.title || "Workout").trim() || "Workout",
      elapsedMin,
      setsLogged,
      exercisesCount,
      volumeKg: Math.round(totalVolumeKg),
      lastActiveAtMs: draftSession.updatedAt,
      startedAtMs: draftSession.startedAt,
      lastAction: "Draft in progress",
    };
  }, [draftSession]);

  useEffect(() => {
    if (!uid) return;

    const end = ymd(new Date());
    const start = ymd(addDays(new Date(), -30));

    return subscribeActivityBetween(uid, start, end, (arr) =>
      setActivityEntries(arr || [])
    );
  }, [uid]);

  const [startOpen, setStartOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [toast, setToast] = useState<{
    text: string;
    undo?: () => void;
  } | null>(null);
  const toastTimer = useRef<any>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [deletingLabel, setDeletingLabel] = useState("");

  function showToast(text: string, undo?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, undo });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  const onStart = async () => {
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(
      () => false
    );
    if (!reduceMotion) await haptic("light");
    setStartOpen(true);
  };

  const onContinue = () => openSession({});
  const AFlatList = Animated.createAnimatedComponent(FlatList);

  const [workoutRows, setWorkoutRows] = useState<WorkoutRow[]>([]);
  const [recents, setRecents] = useState<WorkoutSummary[]>([]);
  const recentLimit = 5;
  const recentlyFinished = useMemo(() => {
    if (draftSession) return null;
    if (!workoutRows.length) return null;
    const { sessions, rowCreatedAtMs } = buildSessionBuckets(workoutRows);
    const latest = sessions[0];
    if (!latest?.rows?.length) return null;
    const lastRow = latest.rows[latest.rows.length - 1];
    const finishedAt =
      latest.latestAt || latest.startedAt || rowCreatedAtMs(lastRow) || 0;
    if (!finishedAt) return null;
    const minutesAgo = (Date.now() - finishedAt) / 60000;
    if (minutesAgo > 90) return null;

    const totalSets = latest.rows.reduce(
      (sum, r) => sum + Number((r as any).sets || 0),
      0
    );
    const exercisesCount = new Set(
      latest.rows
        .map((r) =>
          String((r as any).exercise || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    ).size;
    const volume = latest.rows.reduce((sum, r) => {
      return (
        sum +
        volumeKg(
          Number((r as any).sets || 0),
          Number((r as any).reps || 0),
          Number((r as any).weight || 0)
        )
      );
    }, 0);

    return {
      title: (latest.title || "Workout").trim() || "Workout",
      finishedAtMs: finishedAt,
      setsLogged: totalSets,
      exercisesCount,
      volumeKg: Math.round(volume),
    };
  }, [draftSession, workoutRows]);

  useEffect(() => {
    if (!user?.uid) {
      setWorkoutRows([]);
      setRecents([]);
      return;
    }
    return subscribeWorkouts(
      user.uid,
      (rows: Workout[]) => {
        const typed = (rows || []) as WorkoutRow[];
        setWorkoutRows(typed);
        setRecents(buildRecentsFromWorkoutRows(typed));
      },
      { max: 300 }
    );
  }, [user?.uid]);

  const onFinish = async () => {
    await haptic("light");
    setHideDraftHero(true);
    showToast("Workout hidden (draft still in session).", () => {
      setHideDraftHero(false);
    });
  };

  const onFromTemplate = () => {
    setStartOpen(false);
    setTemplatesOpen(true);
  };

  const onCreateTemplate = () => {
    setStartOpen(false);
    router.push("/(modals)/create-template");
  };

  const onViewAllTemplates = () => setTemplatesOpen(true);
  const onSeeMoreHistory = () => router.push("/workouts/history");

  const deleteRecent = async (sum: WorkoutSummary) => {
    if (!user?.uid) return;

    const { sessions } = buildSessionBuckets(workoutRows);
    const session = sessions.find((s) => s.key === sum.id);

    if (!session?.rows?.length) return;
    setIsDeletingSession(true);
    setDeletingLabel(sum.title || "Workout");
    try {
      await Promise.all(
        session.rows.map((r) => deleteWorkout(user.uid, (r as any).id))
      );
      showToast("Workout deleted");
    } catch (e: any) {
      RNAlert.alert("Couldn't delete", e?.message || "Unknown error");
    } finally {
      setIsDeletingSession(false);
      setDeletingLabel("");
    }
  };

  const duplicateRecent = (w: WorkoutSummary) => {
    openSession({ repeatWorkoutId: w.id, repeatTitle: w.title });
  };
  async function handleCreateActivity(e: CardioEntry) {
    if (!uid) return;
    await addActivity(uid, e);
  }
  async function handleUpdateActivity(e: CardioEntry) {
    if (!uid) return;
    await updateActivity(uid, e);
  }
  async function handleDeleteActivity(id: string) {
    if (!uid) return;
    await deleteActivity(uid, id);
  }
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const headerAnimStyle = useAnimatedStyle(() => {
    // how much we collapse
    const y = Math.min(scrollY.value, 72);

    return {
      transform: [
        { translateY: -y }, // slides header up as you scroll
      ],
    };
  });
  const renderRecentItem = ({
    item,
    index,
  }: {
    item: unknown;
    index: number;
  }) => {
    const w = item as WorkoutSummary;

    const summary: WorkoutEntrySummary = {
      id: w.id,
      sessionKey: w.id,
      title: w.title || "Workout",
      dateISO: "", // not available in WorkoutSummary; keep blank for now
      timeLabel: "", // not available in WorkoutSummary; keep blank for now
      durationMin: Number(w.durationMin || 0),
      exercisesCount: Number((w.subtitle || "").match(/\d+/)?.[0] || 0),
      sets: Number(w.sets || 0),
      volumeKg: Number(w.volumeKg || 0),
      prCount: w.pr ? 1 : 0,
      highlight: w.highlight
        ? {
            label: w.pr ? "PR moment" : "Best set",
            text: w.highlight.replace(/^best set:\s*/i, ""),
            isPR: !!w.pr,
          }
        : undefined,
    };

    return (
      <WorkoutEntryCardPremium
        summary={summary}
        index={index}
        onPress={() =>
          router.push({
            pathname: "/workouts/recap",
            params: { sessionKey: w.id }, // ✅ opens recap
          } as any)
        }
        onDuplicate={() => duplicateRecent(w)}
        onDelete={() => deleteRecent(w)}
        onSaveTemplate={() =>
          router.push({
            pathname: "/(modals)/save-workout-as-templates",
            params: { sessionKey: w.id, defaultName: w.title },
          } as any)
        }
      />
    );
  };

  // make data a real variable so TS sees the type
  const recentData: WorkoutSummary[] = recents.slice(0, recentLimit);
  const headerBorderAnimStyle = useAnimatedStyle(() => {
    // fade border in after slight scroll
    const o = Math.min(Math.max(scrollY.value / 18, 0), 1);
    return { opacity: o };
  });
  return (
    <View style={[styles.root, { backgroundColor: s.colors.bg }]}>
      <LinearGradient
        colors={s.bgGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {isDeletingSession ? (
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteCard}>
            <ActivityIndicator size="small" color={withAlpha(s.t1, 0.9)} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.deleteTitle, { color: s.t1 }]}>
                Deleting workout…
              </Text>
              <Text style={[styles.deleteSub, { color: s.t2 }]}>
                {deletingLabel || "Hang tight"}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Glows: keep in light mode but softer */}
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            top: -120,
            left: -80,
            backgroundColor: withAlpha(accent, s.isDark ? 0.18 : 0.1),
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            top: 120,
            right: -90,
            backgroundColor: withAlpha(accent2, s.isDark ? 0.14 : 0.08),
          },
        ]}
      />

      {/* Sticky header */}
      <Animated.View
        style={[
          styles.headerContainer,
          { paddingTop: topInset },
          headerAnimStyle,
        ]}
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
        <BlurView
          intensity={s.isDark ? 28 : 18}
          tint={s.isDark ? "dark" : "light"}
          style={[
            styles.headerBlur,
            {
              backgroundColor: s.isDark
                ? undefined
                : withAlpha("#FFFFFF", 0.25),
            },
          ]}
        >
          {/* ✅ animated hairline */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.headerHairline,
              { backgroundColor: s.hairline },
              headerBorderAnimStyle,
            ]}
          />

          <View style={[styles.headerRow, { paddingHorizontal: sidePad }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: s.t1 }]}>Workouts</Text>
              <Text style={[styles.subtitle, { color: s.t2 }]}>
                This week: 3 workouts • 2h 18m • +1% volume
              </Text>
            </View>

            <ScalePressable
              onPress={onStart}
              accessibilityLabel="Start workout"
              accessibilityHint="Opens workout start options"
            >
              <LinearGradient
                colors={
                  s.isDark
                    ? [withAlpha(accent, 0.35), withAlpha("#FFFFFF", 0.1)]
                    : [
                        withAlpha(s.colors.primary, 0.95),
                        withAlpha(s.colors.primary, 0.78),
                      ]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.startBtn,
                  {
                    borderColor: s.isDark
                      ? withAlpha("#FFFFFF", 0.2)
                      : withAlpha(s.colors.primary, 0.65),
                  },
                ]}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={s.isDark ? withAlpha("#FFFFFF", 0.95) : "#fff"}
                />
                {/* <Text
                  style={[
                    styles.startBtnText,
                    { color: s.isDark ? withAlpha("#FFFFFF", 0.92) : "#fff" },
                  ]}
                >
                  Start
                </Text> */}
              </LinearGradient>
            </ScalePressable>
          </View>
        </BlurView>
      </Animated.View>

      <AFlatList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        data={recentData}
        keyExtractor={(item, index) =>
          (item as WorkoutSummary)?.id ?? String(index)
        }
        renderItem={renderRecentItem}
        contentContainerStyle={{
          paddingBottom: 28,
          paddingTop: headerH + 14,
          paddingHorizontal: sidePad,
        }}
        ListHeaderComponent={
          <View>
            <WorkoutSessionHeroCard
              hasDraftSession={showDraftSession}
              activeSession={
                showDraftSession && activeSession
                  ? {
                      title: activeSession.title,
                      elapsedMin: activeSession.elapsedMin,
                      setsLogged: activeSession.setsLogged,
                      exercisesCount: activeSession.exercisesCount,
                      volumeKg: activeSession.volumeKg,
                      // optional: if you have it, pass last active time
                      // lastActiveAtMs: Date.now() - 5 * 60 * 1000,
                      lastActiveAtMs: activeSession.lastActiveAtMs,
                      startedAtMs: activeSession.startedAtMs,
                    }
                  : null
              }
              recentlyFinished={recentlyFinished}
              onPrimaryPress={() => {
                // press anywhere: resume if exists else start new
                if (showDraftSession && (activeSession || hasDraftSession))
                  onContinue();
                else openSession({});
              }}
              onSecondaryPress={showDraftSession ? onFinish : undefined}
              onOptionsPress={onStart}
            />

            {/* Rings */}
            <View style={styles.ringsRow}>
              <Ring
                label="Workouts"
                value="3/4"
                sub="On track"
                accent={accent}
                onPress={onSeeMoreHistory}
              />
              <View style={{ width: 10 }} />
              <Ring
                label="Minutes"
                value="138"
                sub="+12 vs last week"
                accent={accent2}
                onPress={onSeeMoreHistory}
              />
              <View style={{ width: 10 }} />
              <Ring
                label="Strength"
                value="+1%"
                sub="Volume trend"
                accent={"#7CFFB5"}
                onPress={onSeeMoreHistory}
              />
            </View>

            {/* Coach Spark */}
            <View style={{ marginTop: 14 }}>
              <CoachSparkCardPremium
                onOpen={() => router.push("/(modals)/coach-spark")}
                onGenerate={async (sel) => {
                  // simplest: just open the existing modal and pass params
                  router.push({
                    pathname: "/(modals)/coach-spark",
                    params: {
                      focus: sel.focus,
                      duration: String(sel.duration),
                      style: sel.style,
                    },
                  } as any);
                }}
                hasHistorySignal={true}
              />
            </View>

            {/* Quick actions */}
            {/* <View style={{ marginTop: 16 }}>
              <SectionHeader title="Quick actions" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10 }}
              >
                <Pill
                  label="Quick Strength"
                  icon="barbell-outline"
                  onPress={() => router.push("/(modals)/quick-strength")}
                />
                <Pill
                  label="Quick Cardio"
                  icon="pulse-outline"
                  onPress={() => router.push("/(modals)/quick-cardio")}
                />
                <Pill
                  label="Quick Mobility"
                  icon="body-outline"
                  onPress={() => router.push("/(modals)/quick-mobility")}
                />
                <Pill
                  label="Quick Hydration"
                  icon="water-outline"
                  onPress={() => router.push("/(modals)/quick-hydration")}
                />
                <Pill
                  label="From Template"
                  icon="albums-outline"
                  onPress={onFromTemplate}
                />
                <Pill
                  label="Create Template"
                  icon="sparkles-outline"
                  onPress={onCreateTemplate}
                />
              </ScrollView>
            </View> */}

            {/* Templates */}
            {/* <View style={{ marginTop: 8 }}>
              <SectionHeader
                title="Templates"
                actionLabel="View all"
                onAction={onViewAllTemplates}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10 }}
              >
                {templatesPreview.map((t) => (
                  <TemplateChip
                    key={`${t.source}-${t.id}`}
                    t={t}
                    onPress={() => openTemplateActions(t)}
                  />
                ))}
              </ScrollView>
            </View> */}

            <TemplatesSectionPremium
              templates={userTemplatesPreview.map((t) => ({
                id: t.id,
                name: t.name,
                items: t.items,
                tags: t.tags,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                lastUsedAt: t.lastUsedAt,
                savedFrom: (t.tags || []).find((tag) => !!String(tag).trim()),
                pinned: t.pinned,
              }))}
              loading={false}
              onViewAll={onViewAllTemplates}
              onStartFromTemplate={(id) => {
                const t = templatesMerged.find((x) => x.id === id);
                if (t) startFromTemplate(t);
              }}
              onEdit={(id) => {
                // optional: route to an edit screen if you have one
                // router.push({ pathname: "/(modals)/edit-template", params: { templateId: id } } as any);
                openTemplateActions(templatesMerged.find((x) => x.id === id)!);
              }}
              onPinToggle={(id, next) => {
                // optional: store pin locally or in DB later
                // for now, just show a toast if you want
              }}
              onDelete={(id) => {
                const t = templatesMerged.find((x) => x.id === id);
                if (!t || t.source !== "user") return;
                RNAlert.alert("Delete template?", "This can’t be undone.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      await deleteWorkoutTemplate(uid!, id);
                    },
                  },
                ]);
              }}
              onCreateTemplate={onCreateTemplate}
            />

            {/* Recent header */}
            <View style={{ marginTop: 10 }}>
              <SectionHeader
                title="Recent"
                actionLabel="See more"
                onAction={onSeeMoreHistory}
              />
              <Text style={[styles.helperText, { color: s.t2 }]}>
                Tap a workout for details. Duplicate to repeat fast.
              </Text>
            </View>

            <View style={{ height: 10 }} />
          </View>
        }
        ListFooterComponent={
          <View style={{ paddingBottom: 62 }}>
            <View style={{ marginTop: 10 }}>
              <SectionHeader title="Activity" />
              <Text style={[styles.helperText, { color: s.t2 }]}>
                Optional cardio + movement logs — complements your lifts.
              </Text>
            </View>

            <View style={{ marginTop: 10 }}>
              <ActivityCard
                entries={activityEntries}
                goal={{ minutesPerDay: 30 }}
                onCreate={handleCreateActivity}
                onUpdate={handleUpdateActivity}
                onDelete={handleDeleteActivity}
                title="Movement"
                subtitle="Optional • gentle momentum"
                presets={[
                  {
                    type: "walk",
                    minutes: 10,
                    intensity: "easy",
                    label: "Walk 10",
                  },
                  {
                    type: "run",
                    minutes: 20,
                    intensity: "moderate",
                    label: "Run 20",
                  },
                  {
                    type: "bike",
                    minutes: 20,
                    intensity: "moderate",
                    label: "Bike 20",
                  },
                  {
                    type: "stretch",
                    minutes: 10,
                    intensity: "easy",
                    label: "Stretch 10",
                  },
                ]}
              />
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Start options sheet */}
      <SheetShell
        open={startOpen}
        onClose={() => setStartOpen(false)}
        title="Start workout"
        subtitle="Pick a flow that feels effortless."
      >
        <View style={{ marginTop: 6 }}>
          <SheetRow
            icon="flash-outline"
            title={hasDraftSession ? "Continue draft" : "Quick start"}
            subtitle={
              hasDraftSession
                ? "Jump back in where you left off."
                : "Start empty. Add exercises as you go."
            }
            onPress={() => {
              setStartOpen(false);
              openSession({});
            }}
          />
          <SheetRow
            icon="barbell-outline"
            title="Add exercise first"
            subtitle="Open the exercise picker, then drop into the session."
            onPress={() => {
              setStartOpen(false);
              router.push("/(modals)/add-exercise");
            }}
          />
          <SheetRow
            icon="albums-outline"
            title="From template"
            subtitle="Start structured. Save time. Stay consistent."
            onPress={onFromTemplate}
          />
          <SheetRow
            icon="copy-outline"
            title="Repeat last workout"
            subtitle="Clone your last session and adjust as needed."
            onPress={() => {
              setStartOpen(false);
              openSession({ repeatLast: "1" });
            }}
          />
        </View>
      </SheetShell>

      {/* Templates sheet */}
      <SheetShell
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title="Templates"
        subtitle="Tap a template for options."
      >
        <View style={{ marginTop: 6 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 420 }}
          >
            {templatesMerged.map((t) => (
              <SheetRow
                key={`${t.source}-${t.id}`}
                icon="albums-outline"
                title={`${t.emoji ?? "🏋️"}  ${t.name}  ${
                  t.source === "user" ? "• Saved" : "• Suggested"
                }`}
                subtitle={t.tag}
                onPress={() => {
                  setTemplatesOpen(false);
                  openTemplateActions(t);
                }}
              />
            ))}
            <View style={{ height: 6 }} />
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={() => {
                setTemplatesOpen(false);
                onCreateTemplate();
              }}
              style={({ pressed }) => [
                styles.sheetPrimaryBtn,
                {
                  backgroundColor: s.isDark
                    ? withAlpha("#FFFFFF", 0.92)
                    : withAlpha(s.colors.primary, 0.95),
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={16}
                color={s.isDark ? withAlpha("#111", 0.9) : "#fff"}
              />
              <Text
                style={[
                  styles.sheetPrimaryBtnText,
                  { color: s.isDark ? withAlpha("#111", 0.92) : "#fff" },
                ]}
              >
                Create template
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setTemplatesOpen(false);
                onSeeMoreHistory();
              }}
              style={({ pressed }) => [
                styles.sheetGhostBtn,
                { backgroundColor: s.ghostFill, borderColor: s.ghostBorder },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="time-outline" size={16} color={s.icon} />
              <Text style={[styles.sheetGhostBtnText, { color: s.t1 }]}>
                History
              </Text>
            </Pressable>
          </View>
        </View>
      </SheetShell>

      <Toast
        text={toast?.text ?? ""}
        actionLabel={toast?.undo ? "Undo" : undefined}
        onAction={toast?.undo}
        onHide={() => setToast(null)}
      />

      {/* Template actions modal */}
      <Modal visible={templateActionsOpen} transparent animationType="fade">
        <Pressable
          onPress={() => setTemplateActionsOpen(false)}
          style={[
            styles.modalBackdrop,
            {
              backgroundColor: s.isDark
                ? "rgba(0,0,0,0.55)"
                : "rgba(10,14,28,0.18)",
            },
          ]}
        >
          <Pressable
            onPress={() => {}}
            style={[
              styles.modalCard,
              {
                backgroundColor: s.isDark
                  ? withAlpha("#0B0F1A", 0.98)
                  : withAlpha("#FFFFFF", 0.9),
                borderColor: s.hairline,
              },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: s.t1 }]}
              numberOfLines={1}
            >
              {activeTemplate?.name || "Template"}
            </Text>
            <Text style={[styles.modalSub, { color: s.t2 }]}>
              Choose what you want to do.
            </Text>

            <Pressable
              onPress={async () => {
                if (!activeTemplate) return;
                setTemplateActionsOpen(false);
                await startFromTemplate(activeTemplate);
              }}
              style={[
                styles.modalPrimary,
                {
                  backgroundColor: s.isDark
                    ? withAlpha("#68D7FF", 0.22)
                    : withAlpha(s.colors.primary, 0.12),
                  borderColor: s.isDark
                    ? withAlpha("#68D7FF", 0.35)
                    : withAlpha(s.colors.primary, 0.25),
                },
              ]}
            >
              <Text style={[styles.modalPrimaryText, { color: s.t1 }]}>
                Use template
              </Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                if (!uid || !activeTemplate) return;

                if (activeTemplate.source !== "user") {
                  RNAlert.alert(
                    "Not editable",
                    "Suggested templates can’t be updated."
                  );
                  return;
                }

                const mapped = activeTemplate.items.map((it) => ({
                  exercise: it.exercise,
                  sets: Number(it.sets || 1),
                  reps: Number(it.reps || 10),
                  weightKg: Number(it.weightKg ?? it.weight ?? 0),
                  notes: it.notes || "",
                }));

                await updateWorkoutTemplate(uid, activeTemplate.id, {
                  name: activeTemplate.name,
                  title: activeTemplate.name,
                  items: mapped,
                  exercises: mapped,
                } as any);

                setTemplateActionsOpen(false);
              }}
              style={[
                styles.modalSecondary,
                {
                  borderColor: s.hairline,
                  backgroundColor: s.isDark
                    ? withAlpha("#FFFFFF", 0.04)
                    : withAlpha("#FFFFFF", 0.72),
                },
              ]}
            >
              <Text style={[styles.modalSecondaryText, { color: s.t1 }]}>
                Update template
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!uid || !activeTemplate) return;

                if (activeTemplate.source !== "user") {
                  RNAlert.alert(
                    "Not editable",
                    "Suggested templates can’t be deleted."
                  );
                  return;
                }

                RNAlert.alert("Delete template?", "This can’t be undone.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      await deleteWorkoutTemplate(uid, activeTemplate.id);
                      setTemplateActionsOpen(false);
                    },
                  },
                ]);
              }}
              style={[
                styles.modalSecondary,
                {
                  borderColor: "rgba(255,92,106,0.25)",
                  backgroundColor: s.isDark
                    ? withAlpha("#FFFFFF", 0.04)
                    : withAlpha("#FFFFFF", 0.72),
                },
              ]}
            >
              <Text
                style={[
                  styles.modalSecondaryText,
                  { color: "rgba(255,92,106,0.95)" },
                ]}
              >
                Delete template
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 260,
    filter: undefined as any,
    zIndex: 0,
  },
  // ✅ ADD
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },

  headerBlur: {
    overflow: "hidden",
  },

  headerRow: {
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  // ✅ ADD
  headerHairline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
  },

  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  cardWrap: { borderRadius: 18, overflow: "hidden" },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
  },
  cardBlur: { borderRadius: 18, overflow: "hidden" },
  cardInner: { padding: 14 },

  continueCard: { borderRadius: 22 },
  continueTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  continueTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  continueName: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  continueMeta: { marginTop: 5, fontSize: 13, fontWeight: "600" },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  finishBtnText: {
    fontSize: 12,
    fontWeight: "900",
  },
  continueCTA: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  continueCTAText: { fontSize: 13, fontWeight: "800" },

  emptyStateCard: { borderRadius: 22 },
  emptyTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  emptyText: { marginTop: 6, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  emptyCTA: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyCTAtext: { fontSize: 13, fontWeight: "800" },

  ringsRow: { flexDirection: "row", marginTop: 2 },
  ringCard: { borderRadius: 18 },
  ringTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  ringDot: { width: 8, height: 8, borderRadius: 8 },
  ringLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  ringValue: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  ringSub: { marginTop: 2, fontSize: 12, fontWeight: "600" },

  sectionHeader: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", letterSpacing: 0.4 },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  sectionActionText: { fontSize: 13, fontWeight: "800" },
  helperText: { marginTop: 6, fontSize: 12, fontWeight: "600" },

  pillStroke: {
    borderRadius: 999,
    padding: 1,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 12.5, fontWeight: "800", letterSpacing: 0.2 },

  templateCard: {
    borderRadius: 18,
  },
  templateChip: {
    width: 188,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  templateEmoji: { fontSize: 18 },
  templateName: { fontSize: 14, fontWeight: "900", letterSpacing: -0.1 },
  templateTag: { marginTop: 2, fontSize: 12, fontWeight: "700" },

  templateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  templateBadgeUser: {
    backgroundColor: withAlpha("#68D7FF", 0.16),
    borderColor: withAlpha("#68D7FF", 0.35),
  },
  templateBadgeAuto: {},

  workoutCardCompact: {
    paddingVertical: 12,
  },
  statsRowCompact: {
    marginTop: 8,
    gap: 6,
  },
  statChipDense: {
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  statChipTextDense: { fontSize: 12 },

  intensityRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  intensityRowCompact: {
    marginTop: 8,
  },
  intensityLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
  intensityBars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  intensityBar: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },

  bestSetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bestSetBadgeText: { fontSize: 12, fontWeight: "800" },
  bestSetTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFD45A", 0.18),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFD45A", 0.35),
  },
  bestSetTagText: { fontSize: 10, fontWeight: "900", color: "#FFD45A" },

  cardActionsCompact: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtnCompact: {
    height: 34,
    width: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  templateBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  templateBadgeTextUser: { color: withAlpha("#68D7FF", 0.95) },
  templateBadgeTextAuto: { color: withAlpha("#FFFFFF", 0.78) },

  workoutCard: { borderRadius: 22 },
  workoutHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  workoutTitle: { fontSize: 16, fontWeight: "900", letterSpacing: -0.15 },
  workoutMeta: { marginTop: 4, fontSize: 12, fontWeight: "700" },

  prBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFD66B", 0.92),
  },
  prText: { color: withAlpha("#111", 0.9), fontSize: 12, fontWeight: "900" },

  statsRow: { marginTop: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  highlight: { marginTop: 10, fontSize: 12, fontWeight: "700" },
  prLine: { marginTop: 6, fontSize: 12, fontWeight: "800" },

  cardActions: { marginTop: 12, flexDirection: "row", gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtnText: { fontSize: 12, fontWeight: "800" },

  /* Coach Spark */
  coachCard: { borderRadius: 22, padding: 0 },
  coachInner: { borderRadius: 22, padding: 14 },
  coachTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  coachIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  coachTitle: { fontSize: 15, fontWeight: "900", letterSpacing: -0.1 },
  coachSub: { marginTop: 4, fontSize: 12, fontWeight: "700", lineHeight: 16 },
  coachCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  coachCTAText: { fontSize: 13, fontWeight: "900" },
  coachChipsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  coachChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  coachChipText: { fontSize: 12, fontWeight: "800" },

  /* Sheets */
  sheetBackdrop: { flex: 1 },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
    paddingBottom: 16,
  },
  sheetCard: { borderRadius: 22 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
  sheetSubtitle: { marginTop: 4, fontSize: 12, fontWeight: "700" },
  sheetClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetRowTitle: { fontSize: 14, fontWeight: "900" },
  sheetRowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  sheetPrimaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  sheetPrimaryBtnText: { fontWeight: "900" },
  sheetGhostBtn: {
    width: 120,
    height: 46,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  sheetGhostBtnText: { fontWeight: "900" },

  /* Toast */
  toastWrap: { position: "absolute", left: 14, right: 14, bottom: 98 },
  toastCard: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  toastText: { flex: 1, fontWeight: "800", fontSize: 12, lineHeight: 16 },
  toastBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: 8,
  },
  toastBtnText: { fontWeight: "900", fontSize: 12 },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 30,
  },
  deleteCard: {
    width: "80%",
    maxWidth: 320,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.18),
    backgroundColor: "rgba(15,18,28,0.88)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  deleteSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },

  /* Template actions modal */
  modalBackdrop: { flex: 1, padding: 18, justifyContent: "center" },
  modalCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontWeight: "900", fontSize: 16 },
  modalSub: { marginTop: 6, fontWeight: "700", fontSize: 12 },
  modalPrimary: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalPrimaryText: { fontWeight: "900" },
  modalSecondary: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalSecondaryText: { fontWeight: "900" },
  heroCardWrap: {
    // more “hero” elevation for the first card
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  stackCardWrap: {
    // slightly smaller + quieter shadow for depth
    transform: [{ scale: 0.985 }],
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  bestSetPill: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },

  bestSetText: {
    fontSize: 12,
    fontWeight: "700",
  },

  actionBtnPrimary: {
    // tiny “primary” emphasis via shape only; colors already set inline
  },

  actionBtnIconOnly: {
    paddingHorizontal: 10,
    justifyContent: "center",
  },
});
