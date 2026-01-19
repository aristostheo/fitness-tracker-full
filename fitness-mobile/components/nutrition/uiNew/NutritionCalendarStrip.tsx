// components/nutrition/uiNew/NutritionCalendarStrip.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";

import { withAlpha } from "@/lib/color";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import { startOfMonth, addMonths, getMonthKey } from "@/services/calendar";
import {
  subscribeMonthSummaries,
  type MonthSummaryMap,
} from "@/components/calendar/utils/calendarData";

type Props = {
  colors: any;
  isDark: boolean;
  uid?: string | null;
  activeISO: string; // YYYY-MM-DD
  onPickISO: (iso: string) => void;
  onOpenFullCalendar?: () => void;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthTitle(d: Date) {
  const m = d.toLocaleString(undefined, { month: "long" });
  return `${m} ${d.getFullYear()}`;
}

export function NutritionCalendarStrip({
  colors,
  isDark,
  uid,
  activeISO,
  onPickISO,
  onOpenFullCalendar,
}: Props) {
  const activeDate = useMemo(
    () => new Date(activeISO + "T12:00:00"),
    [activeISO]
  );

  // Month cursor follows the currently selected nutrition date
  const [cursor, setCursor] = useState(() => startOfMonth(activeDate));
  useEffect(() => {
    setCursor(startOfMonth(activeDate));
  }, [activeISO]); // keep in sync when user changes date from DayStrip or arrows

  const monthKey = useMemo(() => getMonthKey(cursor), [cursor]);
  const [monthDays, setMonthDays] = useState<MonthSummaryMap>({});

  useEffect(() => {
    const unsub = subscribeMonthSummaries(monthKey, uid || "__demo__", (m) =>
      setMonthDays(m)
    );
    return () => unsub?.();
  }, [monthKey, uid]);

  const title = useMemo(() => monthTitle(cursor), [cursor]);

  const onPrev = useCallback(() => {
    setCursor((d) => addMonths(d, -1));
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);
  const onNext = useCallback(() => {
    setCursor((d) => addMonths(d, +1));
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 240 }}
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: withAlpha(colors.border, isDark ? 0.18 : 0.25),
        backgroundColor: withAlpha(colors.card, isDark ? 0.12 : 0.62),
        overflow: "hidden",
      }}
    >
      {/* header row */}
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: withAlpha(colors.border, isDark ? 0.14 : 0.22),
        }}
      >
        <View style={{ gap: 2 }}>
          <Text
            style={{
              color: colors.muted,
              fontWeight: "900",
              fontSize: 12,
              letterSpacing: 0.4,
            }}
          >
            CALENDAR
          </Text>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>
            {title}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!!onOpenFullCalendar && (
            <Pressable
              onPress={onOpenFullCalendar}
              hitSlop={10}
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.35),
                backgroundColor: withAlpha(colors.primary, 0.12),
                opacity: pressed ? 0.75 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              })}
              accessibilityRole="button"
              accessibilityLabel="Open full calendar"
            >
              <Ionicons name="calendar-outline" size={16} color={colors.text} />
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 12 }}
              >
                Full
              </Text>
            </Pressable>
          )}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={onPrev}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: withAlpha(colors.border, isDark ? 0.16 : 0.22),
                backgroundColor: withAlpha(colors.card, isDark ? 0.14 : 0.7),
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name="chevron-back" size={16} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: withAlpha(colors.border, isDark ? 0.16 : 0.22),
                backgroundColor: withAlpha(colors.card, isDark ? 0.14 : 0.7),
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* grid */}
      <View style={{ padding: 12 }}>
        <CalendarMonthGrid
          cursor={cursor}
          today={new Date()}
          monthDays={monthDays}
          selected={activeDate}
          onPressDay={(d) => onPickISO(toISO(d))}
          onLongPressDay={(d) => onPickISO(toISO(d))}
        />

        {/* tiny helper */}
        <Text
          style={{
            color: withAlpha(colors.muted, 0.9),
            fontSize: 12,
            marginTop: 10,
            lineHeight: 16,
          }}
        >
          Tap a day to jump your Nutrition log. The dots show days with
          activity.
        </Text>
      </View>
    </MotiView>
  );
}
