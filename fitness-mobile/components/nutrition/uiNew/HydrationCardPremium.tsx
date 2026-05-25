import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { GlassCard } from "./GlassCard";
import { withAlpha } from "@/lib/color";

// ✅ Replace old gauge
import { PremiumHydrationBottle } from "./PremiumHydrationBottle";

type Props = {
  colors: any;
  isDark: boolean;
  currentMl: number;
  goalMl: number;
  onAdd: (ml: number) => void;
  onClear: () => void;
  style?: ViewStyle | any;
  unit?: "ml" | "oz"; // optional display only
  streakDays?: number;
  showReminder?: boolean;
};

function mlToOz(ml: number) {
  return ml / 29.5735295625;
}

function formatInt(n: number) {
  return Math.round(n).toLocaleString();
}

export function HydrationCardPremium({
  colors,
  isDark,
  currentMl,
  goalMl,
  onAdd,
  onClear,
  style,
  unit = "ml",
  streakDays = 0,
  showReminder = false,
}: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState<string>("");

  // ✅ Pour trigger wiring
  const [logTick, setLogTick] = useState(0);
  const [lastDeltaMl, setLastDeltaMl] = useState(250);

  const safeGoal = Math.max(0, goalMl || 0);
  const safeNow = Math.max(0, currentMl || 0);

  const pct = useMemo(() => {
    if (!safeGoal) return 0;
    return Math.max(0, Math.min(999, Math.round((safeNow / safeGoal) * 100)));
  }, [safeNow, safeGoal]);

  const remaining = useMemo(() => {
    if (!safeGoal) return 0;
    return Math.max(0, safeGoal - safeNow);
  }, [safeNow, safeGoal]);

  const over = useMemo(() => {
    if (!safeGoal) return 0;
    return Math.max(0, safeNow - safeGoal);
  }, [safeNow, safeGoal]);

  const displayNow = unit === "oz" ? mlToOz(safeNow) : safeNow;
  const displayGoal = unit === "oz" ? mlToOz(safeGoal) : safeGoal;
  const displayRemaining = unit === "oz" ? mlToOz(remaining) : remaining;
  const displayOver = unit === "oz" ? mlToOz(over) : over;

  const headline = useMemo(() => {
    if (!safeGoal) return `${formatInt(displayNow)} ${unit}`;
    return `${formatInt(displayNow)} / ${formatInt(displayGoal)} ${unit}`;
  }, [safeGoal, displayNow, displayGoal, unit]);

  const subline = useMemo(() => {
    if (!safeGoal) return "Set a hydration goal to track progress";
    if (over > 0) return `Goal reached • +${formatInt(displayOver)} ${unit}`;
    return `${pct}% • ${formatInt(displayRemaining)} ${unit} to goal`;
  }, [safeGoal, over, pct, displayRemaining, displayOver, unit]);

  const cardPress = useSharedValue(1);
  const progress = useSharedValue(0);
  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: cardPress.value }],
  }));
  const progressAnim = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  React.useEffect(() => {
    progress.value = withTiming(
      safeGoal ? Math.min(100, (safeNow / safeGoal) * 100) : 0,
      { duration: 900, easing: Easing.out(Easing.cubic) }
    );
  }, [progress, safeGoal, safeNow]);

  function bump() {
    cardPress.value = withSpring(0.99, { damping: 18, stiffness: 280 });
    requestAnimationFrame(() => {
      cardPress.value = withSpring(1, { damping: 18, stiffness: 280 });
    });
  }

  function handleAdd(ml: number) {
    if (!ml || ml <= 0) return;
    Haptics.selectionAsync().catch(() => {});
    bump();

    // ✅ trigger pour animation
    setLastDeltaMl(ml);
    setLogTick((t) => t + 1);

    onAdd(ml);
  }

  function handleClear() {
    Alert.alert(
      "Clear hydration?",
      "This will reset today’s water intake to 0.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            ).catch(() => {});
            onClear();
          },
        },
      ]
    );
  }

  const quickAdds = [100, 250, 500];

  // ✅ Bottle palette derived from your theme
  const bottleColors = useMemo(
    () => ({
      glass: withAlpha("#ffffff", isDark ? 0.16 : 0.12),
      glassInner: withAlpha("#ffffff", isDark ? 0.09 : 0.07),
      highlight: withAlpha("#ffffff", isDark ? 0.18 : 0.16),
      waterTop: withAlpha(colors.primary ?? "#7dd3fc", isDark ? 0.52 : 0.46),
      waterMid: withAlpha(colors.primary ?? "#7dd3fc", isDark ? 0.44 : 0.38),
      waterBottom: withAlpha(
        colors.primaryDeep ?? colors.primary ?? "#38bdf8",
        isDark ? 0.52 : 0.44
      ),
      glow: withAlpha(colors.primary ?? "#7dd3fc", isDark ? 0.22 : 0.18),
    }),
    [colors, isDark]
  );

  return (
    <Animated.View style={cardAnim}>
      <GlassCard colors={colors} isDark={isDark} style={[styles.card, style]}>
        {/* Top */}
        <View style={styles.topRow}>
          <View style={{ gap: 4, minWidth: 0 }}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              Hydration
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                style={[
                  styles.sub,
                  {
                    color: withAlpha(
                      colors.text,
                      isDark ? 0.82 : 0.68
                    ),
                  },
                ]}
                numberOfLines={1}
              >
                {headline} • {pct}%
              </Text>
              <View
                style={[
                  styles.streakPill,
                  {
                    borderColor: withAlpha(colors.primary ?? "#7dd3fc", 0.28),
                    backgroundColor: withAlpha(
                      colors.primary ?? "#7dd3fc",
                      isDark ? 0.14 : 0.1
                    ),
                  },
                ]}
              >
                <Ionicons
                  name="flame-outline"
                  size={12}
                  color={withAlpha(colors.text, 0.9)}
                />
                <Text style={[styles.streakText, { color: colors.text }]}>
                  {streakDays}d
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={[
                styles.unitPill,
                {
                  borderColor: withAlpha(colors.border ?? colors.text, 0.22),
                  backgroundColor: withAlpha(
                    colors.card ?? "#000",
                    isDark ? 0.25 : 0.12
                  ),
                },
              ]}
              accessibilityLabel={`Display unit ${unit}`}
            >
              <Ionicons
                name="water-outline"
                size={14}
                color={withAlpha(colors.text, 0.9)}
              />
              <Text style={[styles.unitText, { color: colors.text }]}>
                {unit.toUpperCase()}
              </Text>
            </View>

            <Pressable
              onPress={handleClear}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear hydration"
              style={({ pressed }) => [
                styles.clearBtn,
                {
                  borderColor: withAlpha("#ef4444", 0.25),
                  backgroundColor: withAlpha("#ef4444", pressed ? 0.18 : 0.12),
                },
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {showReminder ? (
          <View
            style={[
              styles.reminder,
              {
                borderColor: withAlpha(colors.primary ?? "#7dd3fc", 0.26),
                backgroundColor: withAlpha("#6D5DF6", isDark ? 0.16 : 0.08),
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={16}
              color={withAlpha(colors.text, 0.92)}
            />
            <Text
              style={[
                styles.reminderText,
                { color: withAlpha(colors.text, isDark ? 0.88 : 0.76) },
              ]}
              numberOfLines={1}
            >
              No water logged yet — tap +250ml to start
            </Text>
          </View>
        ) : null}

        {/* Middle */}
        <View style={styles.middleRow}>
          <View style={styles.bottleWrap}>
            <PremiumHydrationBottle
              width={128}
              height={196}
              currentMl={safeNow}
              goalMl={safeGoal}
              logTick={logTick}
              lastDeltaMl={lastDeltaMl}
              colors={bottleColors}
            />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
            <View style={{ gap: 6 }}>
              <Text style={[styles.headline, { color: colors.text }]}>
                {headline}
              </Text>
              <Text
                style={[
                  styles.detail,
                  {
                    color: withAlpha(
                      colors.muted ?? colors.text,
                      isDark ? 0.72 : 0.78
                    ),
                  },
                ]}
                numberOfLines={2}
              >
                {subline}
              </Text>
            </View>

            {/* Mini progress bar */}
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Hydration progress"
              accessibilityValue={{
                min: 0,
                max: safeGoal || 1,
                now: safeNow,
              }}
              style={[
                styles.progressTrack,
                {
                  backgroundColor: withAlpha(
                    colors.border ?? colors.text,
                    isDark ? 0.38 : 0.28
                  ),
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  progressAnim,
                  {
                    backgroundColor: withAlpha(
                      colors.primary ?? "#7dd3fc",
                      isDark ? 0.92 : 0.85
                    ),
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.progressSheen,
                  {
                    backgroundColor: withAlpha("#ffffff", isDark ? 0.1 : 0.14),
                  },
                ]}
              />
            </View>

            {/* Quick adds */}
            <View style={styles.quickRow}>
              {quickAdds.map((ml) => (
                <QuickAddChip
                  key={ml}
                  colors={colors}
                  label={`+${ml}`}
                  subtitle="ml"
                  onPress={() => handleAdd(ml)}
                />
              ))}

              <QuickAddChip
                colors={colors}
                label="Custom"
                subtitle=""
                icon="create-outline"
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShowCustom((v) => !v);
                }}
              />
            </View>

            {/* Custom input */}
            {showCustom && (
              <View
                style={[
                  styles.customRow,
                  {
                    borderColor: withAlpha(colors.border ?? colors.text, 0.2),
                    backgroundColor: withAlpha(
                      colors.card ?? "#000",
                      isDark ? 0.24 : 0.12
                    ),
                  },
                ]}
              >
                <Ionicons
                  name="water-outline"
                  size={16}
                  color={withAlpha(colors.text, 0.85)}
                />
                <TextInput
                  value={customValue}
                  onChangeText={(t) => setCustomValue(t.replace(/[^\d]/g, ""))}
                  placeholder={`Enter ${unit === "oz" ? "oz" : "ml"}`}
                  placeholderTextColor={withAlpha(colors.text, 0.35)}
                  keyboardType={Platform.select({
                    ios: "number-pad",
                    android: "numeric",
                  })}
                  style={[styles.input, { color: colors.text }]}
                  accessibilityLabel="Custom water amount"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const raw = parseInt(customValue || "0", 10);
                    if (!raw) return;
                    const ml =
                      unit === "oz" ? Math.round(raw * 29.5735295625) : raw;
                    handleAdd(ml);
                    setCustomValue("");
                    setShowCustom(false);
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add custom amount"
                  onPress={() => {
                    const raw = parseInt(customValue || "0", 10);
                    if (!raw) return;
                    const ml =
                      unit === "oz" ? Math.round(raw * 29.5735295625) : raw;
                    handleAdd(ml);
                    setCustomValue("");
                    setShowCustom(false);
                  }}
                  style={({ pressed }) => [
                    styles.addBtn,
                    {
                      borderColor: withAlpha(colors.primary ?? "#7dd3fc", 0.28),
                      backgroundColor: withAlpha(
                        colors.primary ?? "#7dd3fc",
                        pressed ? 0.22 : 0.16
                      ),
                    },
                  ]}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                  <Text style={[styles.addText, { color: colors.text }]}>
                    Add
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function QuickAddChip({
  colors,
  label,
  subtitle,
  icon,
  onPress,
}: {
  colors: any;
  label: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${subtitle || ""}`.trim()}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: withAlpha(
            colors.primary ?? "#7dd3fc",
            pressed ? 0.34 : 0.26
          ),
          backgroundColor: withAlpha(
            colors.card ?? "#000",
            pressed ? 0.3 : 0.22
          ),
        },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons
          name={icon ?? "add-circle-outline"}
          size={16}
          color={withAlpha(colors.text, 0.9)}
        />
        <View style={{ gap: 1 }}>
          <Text style={[styles.chipLabel, { color: colors.text }]}>
            {label}
          </Text>
          {!!subtitle && (
            <Text
              style={[
                styles.chipSub,
                { color: withAlpha(colors.muted ?? colors.text, 0.65) },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  sub: {
    fontSize: 12,
    fontWeight: "800",
  },
  unitPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  unitText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  streakPill: {
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontSize: 11,
    fontWeight: "900",
  },
  reminder: {
    alignSelf: "flex-start",
    marginBottom: 10,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  reminderText: {
    fontSize: 11.5,
    fontWeight: "900",
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  middleRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  bottleWrap: {
    width: 128,
    height: 196,
    alignItems: "center",
    justifyContent: "center",
  },

  headline: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  detail: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressSheen: {
    position: "absolute",
    top: 1,
    left: 10,
    right: 10,
    height: 3,
    borderRadius: 99,
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    minWidth: 118,
    flexGrow: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  chipSub: {
    fontSize: 10,
    fontWeight: "900",
  },

  customRow: {
    marginTop: 2,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    paddingVertical: 0,
  },
  addBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addText: {
    fontSize: 12,
    fontWeight: "900",
  },
});
