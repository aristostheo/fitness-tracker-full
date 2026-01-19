import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  AccessibilityInfo,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

/**
 * DailyGoalsCard — premium Apple-ish nutrition goals card
 *
 * Drop-in:
 * <DailyGoalsCard
 *   colors={colors}
 *   isDark={isDark}
 *   goals={{
 *     calories: 2600, protein: 180, carbs: 280, fat: 80,
 *     fiber: 30,
 *     sugarTotal: 60,
 *     sugarAdded: 30,
 *     satFat: 20,
 *     sodiumMg: 2300,
 *     cholesterolMg: 300,
 *     waterMl: 3000,
 *   }}
 *   totals={{
 *     calories: 1450, protein: 120, carbs: 150, fat: 45,
 *     fiber: 18,
 *     sugarTotal: 42,
 *     sugarAdded: 22,
 *     satFat: 11,
 *     sodiumMg: 1600,
 *     cholesterolMg: 210,
 *     waterMl: 1200,
 *   }}
 *   onPressLog={() => router.push("/(modals)/add-meal")}
 *   forecast={{ enabled: true }}
 *   reduceMotion={reduceMotionBoolean}
 * />
 */

type PrimaryGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type SecondaryGoals = Partial<{
  fiber: number; // g
  sugarTotal: number; // g
  sugarAdded: number; // g
  satFat: number; // g
  sodiumMg: number; // mg
  cholesterolMg: number; // mg
  waterMl: number; // ml
}>;

export type DailyGoals = PrimaryGoals & SecondaryGoals;

type PrimaryTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type SecondaryTotals = Partial<{
  fiber: number;
  sugarTotal: number;
  sugarAdded: number;
  satFat: number;
  sodiumMg: number;
  cholesterolMg: number;
  waterMl: number;
}>;

export type DailyTotals = PrimaryTotals & SecondaryTotals;

type ForecastConfig = {
  enabled?: boolean;
  /**
   * If you can pass "dayStartCalories" and "dayStartTs" from your app,
   * you can make the pace estimate more accurate. Otherwise we use time-of-day.
   */
  dayStartCalories?: number;
  dayStartTs?: number; // ms epoch
  expectedBedtimeHour?: number; // local hour, default 23
};

export function DailyGoalsCard({
  colors,
  isDark,
  goals,
  totals,
  onPressLog,
  forecast,
  reduceMotion = false,
}: {
  colors: any; // ThemeProvider colors
  isDark: boolean;
  goals: DailyGoals;
  totals: DailyTotals;
  onPressLog: () => void;
  forecast?: ForecastConfig;
  reduceMotion?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const kcalGoal = clampNum(goals.calories, 1);
  const kcalNow = clampNum(totals.calories, 0);

  const kcalDelta = Math.round(kcalGoal - kcalNow);
  const kcalRemaining = Math.max(0, kcalDelta);
  const kcalOver = Math.max(0, -kcalDelta);

  const pctCalories = clamp01(kcalNow / kcalGoal);

  const proteinLeft = Math.max(
    0,
    Math.round((goals.protein ?? 0) - (totals.protein ?? 0))
  );

  const status = useMemo(() => {
    // Calm logic: do not “punish” over. Just inform.
    if (kcalOver > 0) {
      return {
        title: "Daily goals",
        subtitle: `Over by ${kcalOver} kcal — easy to balance later`,
        tone: "over" as const,
      };
    }
    if (kcalRemaining <= 200) {
      return {
        title: "Daily goals",
        subtitle: `${kcalRemaining} kcal left • finish strong`,
        tone: "near" as const,
      };
    }
    return {
      title: "Daily goals",
      subtitle: `${kcalRemaining} kcal remaining • ${proteinLeft}g protein to go`,
      tone: "ok" as const,
    };
  }, [kcalOver, kcalRemaining, proteinLeft]);

  const cardA11y = useMemo(() => {
    const rem =
      kcalOver > 0
        ? `Over by ${kcalOver} calories.`
        : `${kcalRemaining} calories remaining.`;
    return `Daily goals. Calories: ${Math.round(
      kcalNow
    )} of ${kcalGoal}. ${rem} Protein: ${Math.round(totals.protein)} of ${
      goals.protein
    }. Carbs: ${Math.round(totals.carbs)} of ${goals.carbs}. Fat: ${Math.round(
      totals.fat
    )} of ${goals.fat}.`;
  }, [kcalNow, kcalGoal, kcalRemaining, kcalOver, totals, goals]);

  const surface = useMemo(() => {
    // Premium glass surface: soft gradient + border.
    const top = isDark
      ? withAlpha("#FFFFFF", 0.08)
      : withAlpha("#FFFFFF", 0.75);
    const bottom = isDark
      ? withAlpha("#000000", 0.35)
      : withAlpha("#FFFFFF", 0.55);
    return { top, bottom };
  }, [isDark]);

  const border = useMemo(
    () =>
      withAlpha(
        colors.border ?? (isDark ? "#FFFFFF" : "#000000"),
        isDark ? 0.18 : 0.12
      ),
    [colors.border, isDark]
  );

  const hairline = useMemo(
    () =>
      withAlpha(
        colors.text ?? (isDark ? "#FFFFFF" : "#000000"),
        isDark ? 0.1 : 0.08
      ),
    [colors.text, isDark]
  );

  const accent = colors.primary ?? (isDark ? "#7DD3FC" : "#2563EB"); // fallback

  const onToggleExpand = useCallback(() => {
    if (!reduceMotion) {
      // Nice native-feeling expansion on iOS; on Android it's okay too.
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded((v) => !v);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [reduceMotion]);

  const onLog = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    onPressLog();
  }, [onPressLog]);

  const forecastLine = useMemo(() => {
    if (!forecast?.enabled) return null;

    // Simple, calm pace estimate using time-of-day if no explicit start is provided.
    const now = new Date();
    const hour = now.getHours();
    const bedtime = clampNum(forecast.expectedBedtimeHour ?? 23, 18, 24);

    const dayStartHour = 7; // gentle default
    const elapsed = Math.max(0.25, hour + now.getMinutes() / 60 - dayStartHour);
    const totalWindow = Math.max(1, bedtime - dayStartHour);
    const pace = clamp01(elapsed / totalWindow);

    // Expected calories consumed at this time if perfectly paced:
    const expectedNow = kcalGoal * pace;
    const drift = Math.round(kcalNow - expectedNow);

    if (Math.abs(drift) < 120) return "On pace for today.";
    if (drift > 0)
      return `At this pace: ~${Math.round(drift)} kcal ahead (still okay).`;
    return `At this pace: ~${Math.round(
      -drift
    )} kcal behind (easy to catch up).`;
  }, [forecast, kcalGoal, kcalNow]);

  const glassShadow = isDark
    ? {
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      }
    : {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      };

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={cardA11y}
      style={[styles.wrap, glassShadow]}
    >
      <LinearGradient
        colors={[surface.top, surface.bottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: border,
            backgroundColor: withAlpha(
              isDark ? "#0B0F16" : "#FFFFFF",
              isDark ? 0.2 : 0.6
            ),
          },
        ]}
      >
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={[styles.title, { color: colors.text }]}
              maxFontSizeMultiplier={1.2}
            >
              {status.title}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    status.tone === "over"
                      ? withAlpha(colors.text, 0.9)
                      : withAlpha(colors.text, 0.72),
                },
              ]}
              maxFontSizeMultiplier={1.25}
            >
              {status.subtitle}
            </Text>
          </View>

          <Pressable
            onPress={onLog}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Log food"
            style={({ pressed }) => [
              styles.logBtn,
              {
                borderColor: withAlpha(accent, isDark ? 0.28 : 0.2),
                backgroundColor: withAlpha(accent, isDark ? 0.14 : 0.1),
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Ionicons name="add" size={18} color={colors.text} />
            <Text
              style={[styles.logText, { color: colors.text }]}
              maxFontSizeMultiplier={1.2}
            >
              Log
            </Text>
          </Pressable>
        </View>

        {/* Hero calories */}
        <View
          style={[
            styles.heroRow,
            { borderTopColor: hairline, borderBottomColor: hairline },
          ]}
        >
          <HaloArc
            size={112}
            stroke={10}
            progress={pctCalories}
            accent={accent}
            track={withAlpha(colors.text, isDark ? 0.12 : 0.1)}
            reduceMotion={reduceMotion}
            center={
              <View style={{ alignItems: "center" }}>
                <Text
                  style={[styles.kcalNumber, { color: colors.text }]}
                  maxFontSizeMultiplier={1.2}
                >
                  {Math.round(kcalNow)}
                </Text>
                <Text
                  style={[
                    styles.kcalLabel,
                    { color: withAlpha(colors.text, 0.68) },
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  kcal
                </Text>
              </View>
            }
          />

          <View style={{ flex: 1, paddingLeft: 14, gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Text
                style={[
                  styles.heroLine,
                  { color: withAlpha(colors.text, 0.78) },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                Goal {kcalGoal}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 99,
                  backgroundColor: withAlpha(colors.text, 0.25),
                }}
              />
              {kcalOver > 0 ? (
                <Text
                  style={[
                    styles.heroLineStrong,
                    { color: withAlpha(colors.text, 0.92) },
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  Over {kcalOver}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.heroLineStrong,
                    { color: withAlpha(colors.text, 0.92) },
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {kcalRemaining} remaining
                </Text>
              )}
            </View>

            {forecastLine ? (
              <View
                style={[
                  styles.forecastPill,
                  {
                    borderColor: hairline,
                    backgroundColor: withAlpha(
                      colors.text,
                      isDark ? 0.06 : 0.045
                    ),
                  },
                ]}
              >
                <Ionicons
                  name="sparkles"
                  size={14}
                  color={withAlpha(colors.text, 0.75)}
                />
                <Text
                  style={[
                    styles.forecastText,
                    { color: withAlpha(colors.text, 0.72) },
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {forecastLine}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Macros row */}
        <View style={styles.macroRow}>
          <MacroTile
            label="Protein"
            short="P"
            unit="g"
            value={totals.protein}
            goal={goals.protein}
            accent={accent}
            colors={colors}
            isDark={isDark}
          />
          <MacroTile
            label="Carbs"
            short="C"
            unit="g"
            value={totals.carbs}
            goal={goals.carbs}
            accent={accent}
            colors={colors}
            isDark={isDark}
          />
          <MacroTile
            label="Fat"
            short="F"
            unit="g"
            value={totals.fat}
            goal={goals.fat}
            accent={accent}
            colors={colors}
            isDark={isDark}
          />
        </View>

        {/* Expand row */}
        <Pressable
          onPress={onToggleExpand}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? "Hide nutrients" : "Show more nutrients"
          }
          style={({ pressed }) => [
            styles.expandRow,
            {
              borderTopColor: hairline,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={[
                styles.expandDot,
                {
                  backgroundColor: withAlpha(colors.text, isDark ? 0.09 : 0.07),
                  borderColor: hairline,
                },
              ]}
            >
              <Ionicons
                name="nutrition"
                size={14}
                color={withAlpha(colors.text, 0.75)}
              />
            </View>
            <Text
              style={[
                styles.expandText,
                { color: withAlpha(colors.text, 0.8) },
              ]}
              maxFontSizeMultiplier={1.2}
            >
              More nutrients
            </Text>
          </View>

          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={withAlpha(colors.text, 0.7)}
          />
        </Pressable>

        {/* Secondary nutrients */}
        {expanded ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(180)}
            exiting={reduceMotion ? undefined : FadeOut.duration(140)}
            style={styles.secondaryWrap}
          >
            <View style={styles.secondaryGrid}>
              <NutrientRow
                label="Fiber"
                unit="g"
                value={totals.fiber}
                goal={goals.fiber}
                colors={colors}
                isDark={isDark}
                accent={accent}
              />
              <NutrientRow
                label="Sugar (total)"
                unit="g"
                value={totals.sugarTotal}
                goal={goals.sugarTotal}
                colors={colors}
                isDark={isDark}
                accent={accent}
              />
              <NutrientRow
                label="Sugar (added)"
                unit="g"
                value={totals.sugarAdded}
                goal={goals.sugarAdded}
                colors={colors}
                isDark={isDark}
                accent={accent}
              />
              <NutrientRow
                label="Saturated fat"
                unit="g"
                value={totals.satFat}
                goal={goals.satFat}
                colors={colors}
                isDark={isDark}
                accent={accent}
              />
              <NutrientRow
                label="Sodium"
                unit="mg"
                value={totals.sodiumMg}
                goal={goals.sodiumMg}
                colors={colors}
                isDark={isDark}
                accent={accent}
              />
              <NutrientRow
                label="Cholesterol"
                unit="mg"
                value={totals.cholesterolMg}
                goal={goals.cholesterolMg}
                colors={colors}
                isDark={isDark}
                accent={accent}
              />

              {/* Optional hydration */}
              {typeof goals.waterMl === "number" ||
              typeof totals.waterMl === "number" ? (
                <NutrientRow
                  label="Hydration"
                  unit="ml"
                  value={totals.waterMl}
                  goal={goals.waterMl}
                  colors={colors}
                  isDark={isDark}
                  accent={accent}
                />
              ) : null}
            </View>

            <Text
              style={[
                styles.secondaryHint,
                { color: withAlpha(colors.text, 0.58) },
              ]}
              maxFontSizeMultiplier={1.2}
            >
              Tip: keep added sugar + saturated fat under target; fiber +
              protein are great to finish.
            </Text>
          </Animated.View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

/* --------------------------------- UI Bits -------------------------------- */

function MacroTile({
  label,
  short,
  unit,
  value,
  goal,
  colors,
  isDark,
  accent,
}: {
  label: string;
  short: string;
  unit: string;
  value: number;
  goal: number;
  colors: any;
  isDark: boolean;
  accent: string;
}) {
  const v = clampNum(value, 0);
  const g = clampNum(goal, 1);
  const pct = clamp01(v / g);

  const remaining = Math.round(g - v);
  const over = Math.max(0, -remaining);

  return (
    <View
      style={[
        styles.macroTile,
        {
          borderColor: withAlpha(colors.text, isDark ? 0.1 : 0.08),
          backgroundColor: withAlpha(colors.text, isDark ? 0.06 : 0.045),
        },
      ]}
      accessibilityLabel={`${label}. ${Math.round(v)} of ${g} ${unit}. ${
        over > 0 ? `Over by ${over}.` : `${Math.max(0, remaining)} remaining.`
      }`}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={[styles.macroShort, { color: withAlpha(colors.text, 0.85) }]}
        >
          {short}
        </Text>
        <Text
          style={[
            styles.macroTopRight,
            { color: withAlpha(colors.text, 0.65) },
          ]}
          maxFontSizeMultiplier={1.2}
        >
          {Math.round(v)}/{g}
        </Text>
      </View>

      <Text
        style={[styles.macroLabel, { color: withAlpha(colors.text, 0.75) }]}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>

      <PillMeter
        pct={pct}
        accent={accent}
        track={withAlpha(colors.text, 0.1)}
        over={v > g}
      />

      <Text
        style={[styles.macroBottom, { color: withAlpha(colors.text, 0.65) }]}
        maxFontSizeMultiplier={1.15}
      >
        {over > 0
          ? `Over ${over}${unit}`
          : `${Math.max(0, remaining)}${unit} left`}
      </Text>
    </View>
  );
}

function NutrientRow({
  label,
  unit,
  value,
  goal,
  colors,
  isDark,
  accent,
}: {
  label: string;
  unit: string;
  value?: number;
  goal?: number;
  colors: any;
  isDark: boolean;
  accent: string;
}) {
  if (typeof goal !== "number" && typeof value !== "number") return null;

  const v = clampNum(value ?? 0, 0);
  const g = clampNum(goal ?? Math.max(1, v), 1);

  const pct = clamp01(v / g);
  const delta = Math.round(g - v);
  const over = Math.max(0, -delta);

  const right = `${Math.round(v)}/${Math.round(g)} ${unit}`;

  return (
    <View
      style={[
        styles.nutrientRow,
        {
          borderColor: withAlpha(colors.text, isDark ? 0.1 : 0.08),
          backgroundColor: withAlpha(colors.text, isDark ? 0.05 : 0.04),
        },
      ]}
      accessibilityLabel={`${label}. ${right}. ${
        over > 0
          ? `Over by ${over} ${unit}.`
          : `${Math.max(0, delta)} ${unit} remaining.`
      }`}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Text
          style={[styles.nutrientLabel, { color: withAlpha(colors.text, 0.8) }]}
          maxFontSizeMultiplier={1.2}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.nutrientRight,
            { color: withAlpha(colors.text, 0.62) },
          ]}
          maxFontSizeMultiplier={1.2}
        >
          {right}
        </Text>
      </View>

      <PillMeter
        pct={pct}
        accent={accent}
        track={withAlpha(colors.text, 0.1)}
        over={v > g}
        compact
      />

      <Text
        style={[styles.nutrientSub, { color: withAlpha(colors.text, 0.6) }]}
        maxFontSizeMultiplier={1.2}
      >
        {over > 0
          ? `Over ${over} ${unit}`
          : `${Math.max(0, delta)} ${unit} remaining`}
      </Text>
    </View>
  );
}

/**
 * PillMeter — calm capsule progress (works for macros + secondary nutrients)
 */
function PillMeter({
  pct,
  accent,
  track,
  over,
  compact,
}: {
  pct: number;
  accent: string;
  track: string;
  over?: boolean;
  compact?: boolean;
}) {
  const w = useSharedValue(0);

  React.useEffect(() => {
    w.value = withTiming(pct, { duration: 450 });
  }, [pct]);

  const fillStyle = useAnimatedStyle(() => {
    return {
      width: `${Math.round(interpolate(w.value, [0, 1], [0, 100]))}%`,
    };
  });

  return (
    <View
      style={[
        styles.pillTrack,
        {
          height: compact ? 8 : 10,
          backgroundColor: track,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.pillFill,
          fillStyle,
          {
            backgroundColor: withAlpha(accent, over ? 0.55 : 0.85),
          },
        ]}
      />
    </View>
  );
}

/**
 * HaloArc — premium “Apple-ish” arc for calories (Concept A)
 * Uses two half-circles with borders (simple + reliable) and animates rotation.
 * Not a perfect vector arc, but it looks gorgeous in glass UI.
 */
function HaloArc({
  size,
  stroke,
  progress,
  accent,
  track,
  reduceMotion,
  center,
}: {
  size: number;
  stroke: number;
  progress: number; // 0..1
  accent: string;
  track: string;
  reduceMotion: boolean;
  center: React.ReactNode;
}) {
  const p = clamp01(progress);
  const rot = useSharedValue(0);

  React.useEffect(() => {
    rot.value = withTiming(p, { duration: reduceMotion ? 0 : 650 });
  }, [p, reduceMotion]);

  const aStyle = useAnimatedStyle(() => {
    const deg = rot.value * 360;
    return { transform: [{ rotate: `${deg}deg` }] };
  });

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Track ring */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: track,
        }}
      />
      {/* Animated “sweep” ring */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderLeftColor: "transparent",
            borderBottomColor: "transparent",
            borderRightColor: withAlpha(accent, 0.85),
            borderTopColor: withAlpha(accent, 0.85),
          },
          aStyle,
        ]}
      />
      {/* Subtle inner highlight */}
      <View
        style={{
          position: "absolute",
          width: size - stroke * 2,
          height: size - stroke * 2,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: withAlpha("#FFFFFF", 0.06),
        }}
      />
      {center}
    </View>
  );
}

/* -------------------------------- Utilities -------------------------------- */

function clampNum(n: number, min: number, max?: number) {
  const x = Number.isFinite(n) ? n : min;
  if (typeof max === "number") return Math.min(max, Math.max(min, x));
  return Math.max(min, x);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

function withAlpha(color: string, alpha = 0.2) {
  if (!color) return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("rgb")) {
    const body = color.replace(/^rgba?\(|\)$/g, "");
    const [r, g, b] = body.split(",").map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const m = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return color;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(
    m[3],
    16
  )}, ${alpha})`;
}

/* --------------------------------- Styles ---------------------------------- */

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    overflow: "hidden",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },

  logBtn: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.1,
  },

  heroRow: {
    marginTop: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },
  kcalNumber: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  kcalLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: -0.1,
    marginTop: 2,
  },
  heroLine: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  heroLineStrong: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.15,
  },

  forecastPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  forecastText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
  },

  macroRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  macroTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    gap: 6,
  },
  macroShort: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  macroTopRight: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: -0.1,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
    marginTop: -2,
  },
  macroBottom: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
    marginTop: 2,
  },

  pillTrack: {
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  pillFill: {
    height: "100%",
    borderRadius: 999,
  },

  expandRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  expandText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.1,
  },

  secondaryWrap: {
    paddingTop: 12,
    gap: 10,
  },
  secondaryGrid: {
    gap: 10,
  },
  nutrientRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    gap: 8,
  },
  nutrientLabel: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.1,
  },
  nutrientRight: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  nutrientSub: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
    marginTop: -2,
  },
  secondaryHint: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
    paddingHorizontal: 2,
  },
});
