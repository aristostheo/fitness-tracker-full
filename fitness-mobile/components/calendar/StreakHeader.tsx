// components/calendar/StreakHeader.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { MotiView } from "moti";
import { withAlpha } from "@/lib/color";
import {
  formatMonthTitle,
  type Streaks,
  type MonthConsistency,
} from "@/services/calendar";

type Props = {
  cursor: Date;
  streaks: Streaks;
  consistency: MonthConsistency;
  colors: any;
  isDark: boolean;
};

export default function StreakHeader({
  cursor,
  streaks,
  consistency,
  colors,
  isDark,
}: Props) {
  const title = useMemo(() => formatMonthTitle(cursor), [cursor]);

  const pill = (label: string, value: string, subtle?: boolean) => (
    <View
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 18,
        backgroundColor: withAlpha(colors.card, isDark ? 0.14 : 0.62),
        borderWidth: 1,
        borderColor: withAlpha(colors.border, isDark ? 0.14 : 0.22),
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontWeight: "900",
          fontSize: 12,
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontWeight: "900",
          fontSize: 20,
          marginTop: 4,
        }}
      >
        {value}
      </Text>
      {subtle && (
        <Text
          style={{
            color: withAlpha(colors.muted, 0.85),
            fontSize: 12,
            marginTop: 4,
          }}
        >
          Calm progress, not perfection.
        </Text>
      )}
    </View>
  );

  const pct = Math.round(consistency.percent * 100);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 260 }}
    >
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {pill("CURRENT STREAK", `${streaks.current}d`)}
          {pill("BEST STREAK", `${streaks.best}d`)}
        </View>

        <View
          style={{
            padding: 14,
            borderRadius: 22,
            backgroundColor: withAlpha(colors.card, isDark ? 0.16 : 0.68),
            borderWidth: 1,
            borderColor: withAlpha(colors.border, isDark ? 0.14 : 0.22),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
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
                {title.toUpperCase()} CONSISTENCY
              </Text>
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
              >
                {pct}% days logged
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: withAlpha(colors.accent, isDark ? 0.18 : 0.14),
                borderWidth: 1,
                borderColor: withAlpha(colors.accent, isDark ? 0.35 : 0.24),
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                {consistency.loggedDays}/{consistency.daysSoFar}
              </Text>
            </View>
          </View>

          {/* tiny progress bar */}
          <View
            style={{
              height: 10,
              borderRadius: 999,
              backgroundColor: withAlpha(colors.border, isDark ? 0.22 : 0.28),
              overflow: "hidden",
              marginTop: 12,
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.min(100, Math.max(0, pct))}%`,
                borderRadius: 999,
                backgroundColor: withAlpha(colors.accent, isDark ? 0.85 : 0.7),
              }}
            />
          </View>

          <Text
            style={{
              color: withAlpha(colors.muted, 0.9),
              fontSize: 12,
              marginTop: 10,
              lineHeight: 16,
            }}
          >
            Each logged day is a vote for the person you’re becoming.
          </Text>
        </View>
      </View>
    </MotiView>
  );
}
