// components/calendar/CalendarMonthGrid.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import DayCell from "./DayCell";
import {
  type MonthSummaryMap,
  getMonthGrid,
  formatISODate,
} from "@/services/calendar";

type Props = {
  cursor: Date;
  today: Date;
  monthDays: MonthSummaryMap;
  selected: Date | null;
  onPressDay: (d: Date) => void;
  onLongPressDay: (d: Date) => void;
};

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarMonthGrid({
  cursor,
  today,
  monthDays,
  selected,
  onPressDay,
  onLongPressDay,
}: Props) {
  const { colors, isDark } = useTheme();

  const grid = useMemo(() => getMonthGrid(cursor), [cursor]);
  const selectedKey = selected ? formatISODate(selected) : null;
  const todayKey = formatISODate(today);

  return (
    <View>
      {/*DOW header*/}
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
        {DOW.map((d, idx) => (
          <View
            key={`${d}-${idx}`} // ✅ unique even when letters repeat
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: withAlpha(colors.card, isDark ? 0.12 : 0.5),
              borderWidth: 1,
              borderColor: withAlpha(colors.border, isDark ? 0.12 : 0.18),
            }}
          >
            <Text
              style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>
      {/* 6-week grid */}
      <View style={{ gap: 8 }}>
        {grid.map((week, wi) => (
          <View key={`w-${wi}`} style={{ flexDirection: "row", gap: 6 }}>
            {week.map((day) => {
              const key = formatISODate(day.date);
              const summary = monthDays[key];
              return (
                <DayCell
                  key={key}
                  date={day.date}
                  inMonth={day.inMonth}
                  isToday={key === todayKey}
                  isSelected={selectedKey === key}
                  summary={summary}
                  onPress={() => onPressDay(day.date)}
                  onLongPress={() => onLongPressDay(day.date)}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
