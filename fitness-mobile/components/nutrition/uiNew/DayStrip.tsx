import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "./GlassCard";

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

export function DayStrip({
  colors,
  isDark,
  days,
  activeISO,
  goals,
  mode,
  onPressDay,
  onToggleMode,
}: {
  colors: any;
  isDark: boolean;
  days: { date: string; calories: number }[];
  activeISO: string;
  goals: { calories: number };
  mode: "week" | "month";
  onPressDay: (iso: string) => void;
  onToggleMode: () => void;
}) {
  const label = mode === "week" ? "2 weeks" : "Month";

  const items = useMemo(() => {
    // Keep stable order; hooks usually returns descending; we want left->right older->newer.
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    return sorted;
  }, [days]);

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <GlassCard colors={colors} isDark={isDark} pad={12} radius={22}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}
            >
              History
            </Text>
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}
            >
              Pick a day
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Toggle history range. Currently ${label}`}
            onPress={onToggleMode}
            hitSlop={10}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: withAlpha(colors.card, 0.35),
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.text} />
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 12 }}
            >
              {mode === "week" ? "Month" : "2 weeks"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: 8 }}
        >
          {items.map((d) => {
            const active = d.date === activeISO;
            const hit = d.calories >= goals.calories * 0.9;
            const dayObj = new Date(d.date + "T12:00:00");

            return (
              <Pressable
                key={d.date}
                accessibilityRole="button"
                accessibilityLabel={`Select ${dayObj.toDateString()}, ${Math.round(
                  d.calories
                )} calories`}
                onPress={() => onPressDay(d.date)}
                style={{
                  width: mode === "week" ? 56 : 50,
                  paddingVertical: 10,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: active
                    ? withAlpha(colors.primary, 0.45)
                    : withAlpha(colors.border, 0.75),
                  backgroundColor: active
                    ? withAlpha(colors.primary, 0.16)
                    : hit
                    ? withAlpha("#22c55e", 0.12)
                    : withAlpha(colors.card, 0.25),
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "900",
                    fontSize: 10,
                  }}
                >
                  {dayObj.toLocaleDateString(undefined, { weekday: "narrow" })}
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    marginTop: 2,
                  }}
                >
                  {Number(d.date.slice(-2))}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontWeight: "900",
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  {Math.round(d.calories)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </GlassCard>
    </View>
  );
}
