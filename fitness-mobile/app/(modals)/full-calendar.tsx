// app/(tabs)/calendar.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
  LayoutAnimation,
  UIManager,
  AccessibilityInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { MotiView, AnimatePresence } from "moti";

import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { withAlpha } from "@/lib/color";

import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import CalendarLegendPills from "@/components/calendar/CalendarLegendPills";
import DayDetailSheet from "@/components/calendar/DayDetailSheet";
import StreakHeader from "@/components/calendar/StreakHeader";
import {
  type DaySummary,
  getMonthKey,
  startOfMonth,
  addMonths,
  formatMonthTitle,
  formatISODate,
  computeStreaks,
  computeMonthConsistency,
} from "@/services/calendar";
import {
  subscribeMonthSummaries,
  type MonthSummaryMap,
} from "@/components/calendar/utils/calendarData";
import { useRouter } from "expo-router";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CalendarPage() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const uid = user?.uid || "__demo__";

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => sub?.remove?.();
  }, []);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const monthKey = useMemo(() => getMonthKey(cursor), [cursor]);

  const [data, setData] = useState<MonthSummaryMap>({});
  const [selected, setSelected] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // ✅ REAL subscription now (uses your old logic inside calendarData.ts)
  useEffect(() => {
    const unsub = subscribeMonthSummaries(monthKey, uid, (m) => setData(m));
    return () => unsub?.();
  }, [monthKey, uid]);

  const monthDays = useMemo(() => data ?? {}, [data]);

  const streaks = useMemo(() => computeStreaks(monthDays), [monthDays]);
  const consistency = useMemo(
    () => computeMonthConsistency(cursor, monthDays),
    [cursor, monthDays]
  );

  const onPrev = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        reduceMotion ? 0 : 180,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setCursor((d) => addMonths(d, -1));
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, [reduceMotion]);

  const onNext = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        reduceMotion ? 0 : 180,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setCursor((d) => addMonths(d, +1));
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, [reduceMotion]);

  const onToday = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        reduceMotion ? 0 : 180,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setCursor(startOfMonth(new Date()));
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [reduceMotion]);

  const openDay = useCallback((day: Date) => {
    setSelected(day);
    setSheetOpen(true);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);

  const longPressDay = useCallback((day: Date) => {
    setSelected(day);
    setSheetOpen(true);
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  const selectedKey = useMemo(
    () => (selected ? formatISODate(selected) : null),
    [selected]
  );
  const selectedSummary: DaySummary | null = useMemo(() => {
    if (!selectedKey) return null;
    return (
      monthDays[selectedKey] ?? {
        date: selectedKey,
        activities: {},
        note: "",
      }
    );
  }, [monthDays, selectedKey]);

  const today = useMemo(() => new Date(), []);
  const title = useMemo(() => formatMonthTitle(cursor), [cursor]);

  const softShadow = useMemo(
    () => ({
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.35 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 10 : 6,
    }),
    [isDark]
  );

  const topBarBg = useMemo(
    () => (isDark ? withAlpha("#000", 0.25) : withAlpha("#fff", 0.65)),
    [isDark]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top nav */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 54 : 18,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: topBarBg,
          borderBottomWidth: 1,
          borderBottomColor: withAlpha(colors.border, isDark ? 0.18 : 0.35),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Back / Close */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web")
                Haptics.selectionAsync().catch(() => {});
              // back if possible; otherwise go to a safe tab
              try {
                router.back();
              } catch {
                router.replace("/(tabs)");
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(colors.card, isDark ? 0.2 : 0.75),
              borderWidth: 1,
              borderColor: withAlpha(colors.border, isDark ? 0.18 : 0.3),
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>

          {/* Title */}
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 0.4,
              }}
              numberOfLines={1}
            >
              CALENDAR
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 24,
                fontWeight: "900",
                letterSpacing: -0.4,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Pressable
              onPress={onToday}
              accessibilityRole="button"
              accessibilityLabel="Jump to current month"
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: withAlpha(colors.card, isDark ? 0.22 : 0.7),
                opacity: pressed ? 0.75 : 1,
                borderWidth: 1,
                borderColor: withAlpha(colors.border, isDark ? 0.18 : 0.3),
              })}
            >
              <Text
                style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}
              >
                Today
              </Text>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={onPrev}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(colors.card, isDark ? 0.2 : 0.75),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.border, isDark ? 0.18 : 0.3),
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>

              <Pressable
                onPress={onNext}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha(colors.card, isDark ? 0.2 : 0.75),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.border, isDark ? 0.18 : 0.3),
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.text}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <StreakHeader
            cursor={cursor}
            streaks={streaks}
            consistency={consistency}
            colors={colors}
            isDark={isDark}
          />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: reduceMotion ? 0 : 240 }}
          >
            <Card style={[{ padding: 14, borderRadius: 22 }, softShadow]}>
              <CalendarMonthGrid
                cursor={cursor}
                today={today}
                monthDays={monthDays}
                selected={selected}
                onPressDay={openDay}
                onLongPressDay={longPressDay}
              />
              <View style={{ marginTop: 12 }}>
                <CalendarLegendPills />
              </View>
            </Card>
          </MotiView>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "timing",
              duration: reduceMotion ? 0 : 260,
              delay: 60,
            }}
          >
            <View
              style={{
                padding: 14,
                borderRadius: 18,
                backgroundColor: withAlpha(colors.card, isDark ? 0.16 : 0.62),
                borderWidth: 1,
                borderColor: withAlpha(colors.border, isDark ? 0.16 : 0.25),
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "900",
                  fontSize: 14,
                  letterSpacing: -0.2,
                }}
              >
                A calm story of consistency
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  marginTop: 6,
                  lineHeight: 18,
                  fontSize: 13,
                }}
              >
                Tap any day to see what you logged. Your calendar is a mirror —
                not a judge. Small dots become streaks. Streaks become identity.
              </Text>
            </View>
          </MotiView>
        </View>

        <BottomTabSpacer />
      </ScrollView>

      <AnimatePresence>
        {sheetOpen && (
          <DayDetailSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            day={selected ?? new Date()}
            summary={selectedSummary}
          />
        )}
      </AnimatePresence>
    </View>
  );
}
