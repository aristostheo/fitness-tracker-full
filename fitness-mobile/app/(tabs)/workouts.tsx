// app/(tabs)/workouts.tsx
// Drop-in replacement ✅
// Theme-adjusted: light mode is glossy + readable (no “washed out” text), dark mode unchanged vibe.
// Notes:
// - Uses your ThemeProvider: { colors, isDark }
// - Keeps your Coach Spark + template routes as-is

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Alert as RNAlert,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeInDown,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
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
  subscribeActivityBetween,
  addActivity,
  updateActivity,
  deleteActivity,
  type ActivityEntry as CardioEntry,
} from "@/services/activity";

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
  source: TemplateSource;
  items: TemplateItem[];
};

type ActiveSession = {
  title: string;
  elapsedMin: number;
  lastAction: string;
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
  style,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
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
        onPressIn={() =>
          (down.value = withTiming(1, {
            duration: 90,
            easing: Easing.out(Easing.quad),
          }))
        }
        onPressOut={() =>
          (down.value = withTiming(0, {
            duration: 140,
            easing: Easing.out(Easing.quad),
          }))
        }
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
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha(colors.text, 0.12);

  const cardFill = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.72);

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
  const chevron = isDark
    ? withAlpha("#FFFFFF", 0.55)
    : withAlpha(colors.text, 0.45);

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
    icon,
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
  intensity = 34,
}: {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
}) {
  const s = useSurfaceTokens();

  const gradColors = s.isDark
    ? [
        withAlpha("#FFFFFF", 0.1),
        withAlpha("#FFFFFF", 0.06),
        withAlpha("#000000", 0.06),
      ]
    : [
        withAlpha("#FFFFFF", 0.92),
        withAlpha(s.colors.primary, 0.08),
        withAlpha("#FFFFFF", 0.7),
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
                  ? withAlpha("#FFFFFF", 0.04)
                  : withAlpha("#FFFFFF", 0.32),
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
  return (
    <ScalePressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint="Activates quick workout action"
      style={{ marginRight: 10 }}
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: s.chipFill,
            borderColor: s.chipBorder,
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={s.icon} />
        <Text style={[styles.pillText, { color: s.t1 }]}>{label}</Text>
      </View>
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const s = useSurfaceTokens();
  return (
    <View
      style={[
        styles.statChip,
        {
          backgroundColor: s.isDark
            ? withAlpha("#FFFFFF", 0.05)
            : withAlpha("#FFFFFF", 0.68),
          borderColor: s.hairline,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={s.icon} />
      <Text style={[styles.statChipText, { color: s.t1 }]}>{label}</Text>
    </View>
  );
}

function WorkoutCard({
  w,
  onPress,
  onDuplicate,
  onDelete,
  onSaveTemplate,
}: {
  w: WorkoutSummary;
  onPress?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSaveTemplate?: () => void;
}) {
  const s = useSurfaceTokens();
  return (
    <Animated.View
      entering={FadeInDown.duration(380).springify().damping(18).stiffness(160)}
    >
      <ScalePressable
        onPress={onPress}
        accessibilityLabel={`${w.title}. ${w.dateLabel}. ${w.durationMin} minutes. ${w.sets} sets.`}
        accessibilityHint="Opens workout details"
        style={{ marginBottom: 12 }}
      >
        <GlassCard intensity={30} style={styles.workoutCard}>
          <View style={styles.workoutHeaderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={[styles.workoutTitle, { color: s.t1 }]}
                numberOfLines={1}
              >
                {w.title}
              </Text>
              <Text
                style={[styles.workoutMeta, { color: s.t2 }]}
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

          <View style={styles.statsRow}>
            <StatChip icon="time-outline" label={`${w.durationMin}m`} />
            <StatChip icon="layers-outline" label={`${w.sets} sets`} />
            <StatChip
              icon="barbell-outline"
              label={`${Math.round(w.volumeKg)} kg`}
            />
          </View>

          {w.highlight ? (
            <Text style={[styles.highlight, { color: s.t2 }]} numberOfLines={1}>
              {w.highlight}
            </Text>
          ) : null}
          {w.pr ? (
            <Text style={[styles.prLine, { color: s.t3 }]} numberOfLines={1}>
              {w.pr.label}
              {w.pr.value ? ` • ${w.pr.value}` : ""}
            </Text>
          ) : null}

          <View style={styles.cardActions}>
            <Pressable
              onPress={onDuplicate}
              accessibilityRole="button"
              accessibilityLabel="Duplicate workout"
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: s.isDark
                    ? withAlpha("#FFFFFF", 0.05)
                    : withAlpha("#FFFFFF", 0.7),
                  borderColor: s.hairline,
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons name="copy-outline" size={16} color={s.icon} />
              <Text style={[styles.actionBtnText, { color: s.t1 }]}>
                Duplicate
              </Text>
            </Pressable>

            <Pressable
              onPress={onSaveTemplate}
              accessibilityRole="button"
              accessibilityLabel="Save workout as template"
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: s.isDark
                    ? withAlpha("#FFFFFF", 0.05)
                    : withAlpha("#FFFFFF", 0.7),
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

            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete workout"
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: s.isDark
                    ? withAlpha("#FFFFFF", 0.05)
                    : withAlpha("#FFFFFF", 0.7),
                  borderColor: s.hairline,
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={s.icon} />
              <Text style={[styles.actionBtnText, { color: s.t1 }]}>
                Delete
              </Text>
            </Pressable>
          </View>
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
      <View
        style={[
          styles.templateChip,
          {
            backgroundColor: s.chipFill,
            borderColor: s.chipBorder,
          },
        ]}
      >
        <Text style={styles.templateEmoji}>{t.emoji ?? "🏋️"}</Text>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
                  { color: isUser ? styles.templateBadgeTextUser.color : s.t2 },
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
      }))
      .filter((t) => t.name && t.items?.length);

    const usedIds = new Set(userMapped.map((x) => x.id));
    const usedNames = new Set(userMapped.map((x) => x.name.toLowerCase()));
    const autos = AUTO_TEMPLATES.filter(
      (a) => !usedIds.has(a.id) && !usedNames.has(a.name.toLowerCase())
    );

    return [...userMapped, ...autos];
  }, [dbTemplates]);

  const templatesPreview = templatesMerged.slice(0, TEMPLATE_PREVIEW_COUNT);

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
    rows: WorkoutRow[];
  };

  function buildRecentsFromWorkoutRows(all: WorkoutRow[]): WorkoutSummary[] {
    const rows = (all || []).slice().sort((a, b) => {
      const ad = (a as any).date || "";
      const bd = (b as any).date || "";
      if (ad !== bd) return bd.localeCompare(ad);
      return createdAtMs(b) - createdAtMs(a);
    });

    const buckets = new Map<string, SessionBucket>();

    for (const r of rows) {
      const dateISO = ((r as any).date || "").trim() || "Unknown date";
      const sid =
        typeof (r as any).sessionId === "string" && (r as any).sessionId.trim()
          ? String((r as any).sessionId)
          : "";
      const key = sid || `date:${dateISO}`;

      const title =
        typeof (r as any).sessionTitle === "string" &&
        (r as any).sessionTitle.trim()
          ? String((r as any).sessionTitle)
          : "Workout";

      const startedAt = Number((r as any).sessionStartedAt || 0) || undefined;

      const existing = buckets.get(key);
      if (!existing) {
        buckets.set(key, {
          key,
          sessionId: sid || undefined,
          dateISO,
          title,
          startedAt,
          rows: [r],
        });
      } else {
        existing.rows.push(r);
        if (existing.title === "Workout" && title !== "Workout")
          existing.title = title;
        if (!existing.startedAt && startedAt) existing.startedAt = startedAt;
        if (existing.dateISO === "Unknown date" && dateISO !== "Unknown date")
          existing.dateISO = dateISO;
      }
    }

    const sessions = Array.from(buckets.values()).sort((a, b) => {
      const at = a.startedAt || createdAtMs(a.rows[0]) || 0;
      const bt = b.startedAt || createdAtMs(b.rows[0]) || 0;
      if (a.dateISO !== b.dateISO) return b.dateISO.localeCompare(a.dateISO);
      return bt - at;
    });

    return sessions.slice(0, 12).map((sess) => {
      const ordered = sess.rows
        .slice()
        .sort((a, b) => createdAtMs(a) - createdAtMs(b));

      const first = ordered[0];
      const last = ordered[ordered.length - 1];

      const totalSets = ordered.reduce(
        (acc, r) => acc + Number((r as any).sets || 0),
        0
      );
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

      const start = sess.startedAt || createdAtMs(first);
      const end = createdAtMs(last);
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
        subtitle: ordered.length ? `${ordered.length} exercises` : undefined,
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

  const [hasDraftSession, setHasDraftSession] = useState(false);

  useEffect(() => {
    if (!uid) {
      setHasDraftSession(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`workout:draft:${uid}`);
        if (mounted) setHasDraftSession(!!raw);
      } catch {
        if (mounted) setHasDraftSession(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [uid]);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>({
    title: hasDraftSession ? "Workout" : "Strength • Sat",
    elapsedMin: 18,
    lastAction: "Last: Incline DB Press • Set 3",
  });

  useEffect(() => {
    if (hasDraftSession) {
      setActiveSession({
        title: "Workout",
        elapsedMin: 0,
        lastAction: "Draft in progress",
      });
    }
  }, [hasDraftSession]);

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

  const [workoutRows, setWorkoutRows] = useState<WorkoutRow[]>([]);
  const [recents, setRecents] = useState<WorkoutSummary[]>([]);
  const recentLimit = 5;

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
    setActiveSession(null);
    showToast("Workout hidden (draft still in session).", () => {
      setActiveSession({
        title: "Workout",
        elapsedMin: 0,
        lastAction: "Draft in progress",
      });
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

    const rowsInSession = workoutRows.filter((r) => {
      const sid = String((r as any).sessionId || "");
      const key = sid ? sid : `date:${(r as any).date || ""}`;
      return key === sum.id;
    });

    try {
      for (const r of rowsInSession) {
        await deleteWorkout(user.uid, (r as any).id);
      }
    } catch (e) {
      console.warn(e);
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

  return (
    <View style={[styles.root, { backgroundColor: s.colors.bg }]}>
      <LinearGradient
        colors={s.bgGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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
            backgroundColor: withAlpha(accent2, s.isDark ? 0.16 : 0.09),
          },
        ]}
      />

      {/* Sticky header */}
      <View style={{ paddingTop: topInset }}>
        <BlurView
          intensity={s.isDark ? 28 : 18}
          tint={s.isDark ? "dark" : "light"}
          style={[
            styles.headerBlur,
            {
              borderBottomColor: s.hairline,
              backgroundColor: s.isDark
                ? undefined
                : withAlpha("#FFFFFF", 0.25),
            },
          ]}
        >
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
                <Text
                  style={[
                    styles.startBtnText,
                    { color: s.isDark ? withAlpha("#FFFFFF", 0.92) : "#fff" },
                  ]}
                >
                  Start
                </Text>
              </LinearGradient>
            </ScalePressable>
          </View>
        </BlurView>
      </View>

      <FlatList
        data={recents.slice(0, recentLimit)}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{
          paddingBottom: 28,
          paddingTop: 14,
          paddingHorizontal: sidePad,
        }}
        ListHeaderComponent={
          <View>
            {/* Continue card */}
            {activeSession ? (
              <Animated.View entering={FadeIn.duration(240)}>
                <ScalePressable
                  onPress={onContinue}
                  accessibilityLabel={`Continue workout. ${activeSession.title}. ${activeSession.elapsedMin} minutes.`}
                  accessibilityHint="Returns to your active workout session"
                  style={{ marginBottom: 14 }}
                >
                  <GlassCard intensity={32} style={styles.continueCard}>
                    <View style={styles.continueTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.continueTitle, { color: s.t2 }]}>
                          {hasDraftSession ? "Continue Workout" : "Active"}
                        </Text>
                        <Text
                          style={[styles.continueName, { color: s.t1 }]}
                          numberOfLines={1}
                        >
                          {activeSession.title}
                        </Text>
                        <Text
                          style={[styles.continueMeta, { color: s.t2 }]}
                          numberOfLines={1}
                        >
                          {hasDraftSession
                            ? "Draft in progress • tap to open"
                            : `${activeSession.elapsedMin}m • ${activeSession.lastAction}`}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end", gap: 10 }}>
                        <View
                          style={[
                            styles.pulseDot,
                            {
                              backgroundColor: withAlpha(accent, 0.95),
                              shadowColor: accent,
                            },
                          ]}
                        />
                        <Pressable
                          onPress={onFinish}
                          accessibilityRole="button"
                          accessibilityLabel="Hide active workout banner"
                          style={({ pressed }) => [
                            styles.finishBtn,
                            {
                              backgroundColor: s.isDark
                                ? withAlpha("#FFFFFF", 0.92)
                                : withAlpha("#0B1020", 0.9),
                            },
                            pressed && { opacity: 0.75 },
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={
                              s.isDark
                                ? withAlpha("#111", 0.95)
                                : withAlpha("#FFFFFF", 0.95)
                            }
                          />
                          <Text
                            style={[
                              styles.finishBtnText,
                              {
                                color: s.isDark
                                  ? withAlpha("#111", 0.92)
                                  : withAlpha("#FFFFFF", 0.92),
                              },
                            ]}
                          >
                            Finish
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.continueCTA,
                        {
                          borderColor: s.hairline,
                          backgroundColor: s.isDark
                            ? withAlpha("#FFFFFF", 0.04)
                            : withAlpha("#FFFFFF", 0.7),
                        },
                      ]}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={s.chevron}
                      />
                      <Text style={[styles.continueCTAText, { color: s.t1 }]}>
                        Open session
                      </Text>
                    </View>
                  </GlassCard>
                </ScalePressable>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.duration(420).springify().damping(16)}
              >
                <ScalePressable
                  onPress={onStart}
                  accessibilityLabel="Start a workout"
                  accessibilityHint="Opens workout start options"
                  style={{ marginBottom: 14 }}
                >
                  <GlassCard intensity={28} style={styles.emptyStateCard}>
                    <Text style={[styles.emptyTitle, { color: s.t1 }]}>
                      Start a workout
                    </Text>
                    <Text style={[styles.emptyText, { color: s.t2 }]}>
                      Quick start, templates, or repeat your last session —
                      smooth and fast.
                    </Text>
                    <View style={styles.emptyCTA}>
                      <Text style={[styles.emptyCTAtext, { color: s.t3 }]}>
                        Choose how to start
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={s.chevron}
                      />
                    </View>
                  </GlassCard>
                </ScalePressable>
              </Animated.View>
            )}

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

            {/* Coach Spark (featured) */}
            <View style={{ marginTop: 14 }}>
              <SectionHeader title="Coach Spark" />
              <ScalePressable
                onPress={() => router.push("/(modals)/coach-spark")}
                accessibilityLabel="Coach Spark workout generator"
                accessibilityHint="Opens the workout generator"
                style={{ marginTop: 10 }}
              >
                <GlassCard intensity={34} style={styles.coachCard}>
                  <LinearGradient
                    colors={
                      s.isDark
                        ? [
                            withAlpha("#68D7FF", 0.22),
                            withAlpha("#8B7CFF", 0.14),
                            withAlpha("#FFFFFF", 0.06),
                          ]
                        : [
                            withAlpha(s.colors.primary, 0.22),
                            withAlpha("#8B7CFF", 0.12),
                            withAlpha("#FFFFFF", 0.72),
                          ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.coachInner}
                  >
                    <View style={styles.coachTopRow}>
                      <View
                        style={[
                          styles.coachIconWrap,
                          {
                            backgroundColor: s.ghostFill,
                            borderColor: s.ghostBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name="sparkles-outline"
                          size={18}
                          color={s.icon}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.coachTitle, { color: s.t1 }]}>
                          Generate a workout in seconds
                        </Text>
                        <Text
                          style={[styles.coachSub, { color: s.t2 }]}
                          numberOfLines={2}
                        >
                          Pick a focus + duration. Coach Spark builds the plan —
                          you start lifting.
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.coachCTA,
                          {
                            backgroundColor: s.ghostFill,
                            borderColor: s.ghostBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.coachCTAText, { color: s.t1 }]}>
                          Generate
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={s.chevron}
                        />
                      </View>
                    </View>

                    <View style={styles.coachChipsRow}>
                      <View
                        style={[
                          styles.coachChip,
                          {
                            backgroundColor: s.chipFill,
                            borderColor: s.hairline,
                          },
                        ]}
                      >
                        <Ionicons
                          name="barbell-outline"
                          size={14}
                          color={s.icon}
                        />
                        <Text style={[styles.coachChipText, { color: s.t1 }]}>
                          Strength
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.coachChip,
                          {
                            backgroundColor: s.chipFill,
                            borderColor: s.hairline,
                          },
                        ]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={s.icon}
                        />
                        <Text style={[styles.coachChipText, { color: s.t1 }]}>
                          30–60m
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.coachChip,
                          {
                            backgroundColor: s.chipFill,
                            borderColor: s.hairline,
                          },
                        ]}
                      >
                        <Ionicons
                          name="flash-outline"
                          size={14}
                          color={s.icon}
                        />
                        <Text style={[styles.coachChipText, { color: s.t1 }]}>
                          Optimized
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </GlassCard>
              </ScalePressable>
            </View>

            {/* Quick actions */}
            <View style={{ marginTop: 16 }}>
              <SectionHeader title="Quick actions" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10 }}
              >
                <Pill
                  label="Coach Spark"
                  icon="sparkles-outline"
                  onPress={() => router.push("/(modals)/coach-spark")}
                />
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
            </View>

            {/* Templates */}
            <View style={{ marginTop: 8 }}>
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
            </View>

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
        renderItem={({ item }) => (
          <WorkoutCard
            w={item}
            onPress={() =>
              router.push({
                pathname: "/workouts/recap",
                params: { sessionKey: item.id },
              } as any)
            }
            onDuplicate={() => duplicateRecent(item)}
            onDelete={() => deleteRecent(item)}
            onSaveTemplate={() =>
              router.push({
                pathname: "/(modals)/save-workout-as-templates",
                params: { sessionKey: item.id, defaultName: item.title },
              } as any)
            }
          />
        )}
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
  },

  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 13, fontWeight: "800" },

  templateChip: {
    width: 200,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
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
    paddingVertical: 7,
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
  toastWrap: { position: "absolute", left: 14, right: 14, bottom: 18 },
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
});
