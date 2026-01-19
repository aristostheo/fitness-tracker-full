// components/calendar/DayDetailSheet.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import {
  type DaySummary,
  ACTIVITY_META,
  formatReadableDate,
} from "@/services/calendar";

type Props = {
  open: boolean;
  onClose: () => void;
  day: Date;
  summary: DaySummary | null;
};

export default function DayDetailSheet({ open, onClose, day, summary }: Props) {
  const { colors, isDark } = useTheme();

  const title = useMemo(() => formatReadableDate(day), [day]);

  const rows = useMemo(() => {
    const acts = summary?.activities ?? {};
    return Object.values(ACTIVITY_META).map((m) => {
      const v = acts[m.key];
      const count = typeof v?.count === "number" ? v.count : 0;
      const note = v?.note ?? "";
      return { ...m, count, note };
    });
  }, [summary]);

  const hasAnything = useMemo(() => rows.some((r) => r.count > 0), [rows]);

  if (!open) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: "flex-end",
      }}
    >
      {/* backdrop */}
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
          onClose();
        }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: withAlpha("#000", isDark ? 0.55 : 0.35),
        }}
        accessibilityRole="button"
        accessibilityLabel="Close day details"
      />

      <MotiView
        from={{ translateY: 40, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        exit={{ translateY: 40, opacity: 0 }}
        transition={{ type: "timing", duration: 220 }}
        style={{
          padding: 14,
          paddingBottom: 14,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: withAlpha(colors.border, isDark ? 0.18 : 0.22),
        }}
      >
        {/* handle */}
        <View style={{ alignItems: "center", marginBottom: 10 }}>
          <View
            style={{
              width: 44,
              height: 5,
              borderRadius: 999,
              backgroundColor: withAlpha(colors.border, isDark ? 0.45 : 0.55),
            }}
          />
        </View>

        {/* header */}
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
              DAY DETAILS
            </Text>
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}
            >
              {title}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              if (Platform.OS !== "web")
                Haptics.selectionAsync().catch(() => {});
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(colors.card, isDark ? 0.18 : 0.7),
              borderWidth: 1,
              borderColor: withAlpha(colors.border, isDark ? 0.16 : 0.24),
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* rows */}
        <View style={{ marginTop: 12, gap: 10 }}>
          {rows.map((r) => (
            <View
              key={r.key}
              style={{
                padding: 12,
                borderRadius: 18,
                backgroundColor: withAlpha(colors.card, isDark ? 0.14 : 0.62),
                borderWidth: 1,
                borderColor: withAlpha(r.color, isDark ? 0.35 : 0.22),
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      backgroundColor: withAlpha(r.color, isDark ? 0.22 : 0.16),
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: withAlpha(r.color, isDark ? 0.45 : 0.26),
                    }}
                  >
                    <Text style={{ fontWeight: "900" }}>{r.emoji}</Text>
                  </View>

                  <View style={{ gap: 2 }}>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                      {r.label}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {r.count > 0 ? `${r.count} logged` : "Not logged"}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: withAlpha(r.color, isDark ? 0.18 : 0.12),
                    borderWidth: 1,
                    borderColor: withAlpha(r.color, isDark ? 0.35 : 0.22),
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "900" }}>
                    {r.count}
                  </Text>
                </View>
              </View>

              {!!r.note && (
                <Text
                  style={{
                    marginTop: 8,
                    color: withAlpha(colors.muted, 0.9),
                    fontSize: 12,
                    lineHeight: 16,
                  }}
                >
                  {r.note}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* footer prompt */}
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 18,
            backgroundColor: withAlpha(colors.card, isDark ? 0.12 : 0.6),
            borderWidth: 1,
            borderColor: withAlpha(colors.border, isDark ? 0.14 : 0.22),
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "900" }}>
            {hasAnything ? "Nice work." : "Quiet day."}{" "}
            <Text
              style={{ color: withAlpha(colors.muted, 0.9), fontWeight: "800" }}
            >
              {hasAnything
                ? "Consistency compounds."
                : "Tomorrow is a clean page."}
            </Text>
          </Text>
        </View>
      </MotiView>
    </View>
  );
}
