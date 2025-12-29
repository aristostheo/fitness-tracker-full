// components/calendar/DayCell.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import {
  type DaySummary,
  getDayDisplayChips,
  formatA11yDate,
} from "@/services/calendar";

type Props = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  summary?: DaySummary;
  onPress: () => void;
  onLongPress: () => void;
};

export default function DayCell({
  date,
  inMonth,
  isToday,
  isSelected,
  summary,
  onPress,
  onLongPress,
}: Props) {
  const { colors, isDark } = useTheme();
  const dayNum = date.getDate();

  const chips = useMemo(() => getDayDisplayChips(summary), [summary]);

  const activeCount = chips.totalCount;
  const isEmpty = activeCount === 0;

  const baseBg = useMemo(() => {
    if (!inMonth) return withAlpha(colors.card, isDark ? 0.06 : 0.35);
    if (isSelected) return withAlpha(colors.accent, isDark ? 0.22 : 0.18);
    return withAlpha(colors.card, isDark ? 0.12 : 0.6);
  }, [colors, isDark, inMonth, isSelected]);

  const border = useMemo(() => {
    if (isToday) return withAlpha(colors.accent, isDark ? 0.85 : 0.7);
    if (isSelected) return withAlpha(colors.accent, isDark ? 0.45 : 0.35);
    return withAlpha(colors.border, isDark ? 0.12 : 0.2);
  }, [colors, isDark, isToday, isSelected]);

  const textColor = useMemo(() => {
    if (!inMonth) return withAlpha(colors.muted, 0.6);
    return colors.text;
  }, [colors, inMonth]);

  const a11yLabel = useMemo(() => {
    const dateStr = formatA11yDate(date);
    if (!summary || isEmpty) return `${dateStr}. No activity logged.`;
    const parts: string[] = [];
    for (const c of chips.chips) parts.push(c.label);
    const extra = chips.extraCount > 0 ? `plus ${chips.extraCount} more.` : "";
    return `${dateStr}. Logged: ${parts.join(", ")} ${extra}`.trim();
  }, [date, chips, summary, isEmpty]);

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      onLongPress={() => {
        if (Platform.OS !== "web")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {}
          );
        onLongPress();
      }}
      delayLongPress={240}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 8,
        backgroundColor: baseBg,
        borderWidth: 1,
        borderColor: border,
        opacity: pressed ? 0.78 : 1,
        minHeight: 58,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: textColor, fontWeight: "900", fontSize: 13 }}>
          {dayNum}
        </Text>

        {/* tiny “today” halo */}
        {isToday && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: withAlpha(colors.accent, 0.95),
              shadowColor: colors.accent,
              shadowOpacity: isDark ? 0.55 : 0.25,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          />
        )}
      </View>

      {/* Activity chips */}
      <View style={{ marginTop: 6, gap: 4 }}>
        {chips.chips.length === 0 ? (
          <Text
            style={{
              color: withAlpha(colors.muted, 0.72),
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            ·
          </Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {chips.chips.map((c) => (
              <MotiView
                key={c.key}
                from={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "timing", duration: 180 }}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: withAlpha(c.color, isDark ? 0.22 : 0.16),
                  borderWidth: 1,
                  borderColor: withAlpha(c.color, isDark ? 0.45 : 0.28),
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 10,
                    fontWeight: "900",
                  }}
                >
                  {c.emoji}
                </Text>
              </MotiView>
            ))}

            {chips.extraCount > 0 && (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: withAlpha(colors.card, isDark ? 0.16 : 0.55),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.border, isDark ? 0.14 : 0.22),
                }}
              >
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 10,
                    fontWeight: "900",
                  }}
                >
                  +{chips.extraCount}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
