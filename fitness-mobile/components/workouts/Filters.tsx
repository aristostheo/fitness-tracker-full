// components/workouts/Filters.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { withAlpha } from "./utils/withAlpha";
import { Field } from "./ui/Field";

type PresetKey = "all" | "week" | "7" | "month" | "30";

export default function Filters({
  preset,
  setPreset,
  from,
  to,
  setFrom,
  setTo,
}: {
  preset: PresetKey;
  setPreset: (p: PresetKey) => void;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  const { colors } = useTheme();

  const summary = useMemo(() => {
    const map: Record<PresetKey, string> = {
      all: "All time",
      week: "This week",
      "7": "Last 7 days",
      month: "This month",
      "30": "Last 30 days",
    };
    const base = map[preset] ?? "Custom";
    if (from || to) {
      const span = (from ? from : "…") + " → " + (to ? to : "…");
      return `${base} • ${span}`;
    }
    return base;
  }, [preset, from, to]);

  const presets: Array<[PresetKey, keyof typeof Ionicons.glyphMap, string]> = [
    ["all", "infinite-outline", "All"],
    ["week", "calendar-outline", "Week"],
    ["7", "time-outline", "7d"],
    ["month", "calendar-number-outline", "Month"],
    ["30", "hourglass-outline", "30d"],
  ];

  const chipBase = {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  } as const;

  function setToday() {
    const d = new Date();
    const s = d.toISOString().slice(0, 10);
    setFrom(s);
    setTo(s);
  }
  function setYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const s = d.toISOString().slice(0, 10);
    setFrom(s);
    setTo(s);
  }
  function clearDates() {
    setFrom("");
    setTo("");
  }

  return (
    <Card style={{ gap: 12, paddingTop: 12, paddingBottom: 14 }}>
      {/* Header + summary pill */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: withAlpha(colors.primary, 0.15),
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
            }}
          >
            <Ionicons name="funnel-outline" size={16} color={colors.primary} />
          </View>
          <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>
            Filters
          </Text>
        </View>

        {/* Summary */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: withAlpha(colors.primary, 0.12),
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.28),
            maxWidth: "64%",
          }}
        >
          <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}
          >
            {summary}
          </Text>
        </View>
      </View>

      {/* Presets */}
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 999,
          padding: 4,
          flexDirection: "row",
          gap: 6,
          backgroundColor: colors.card,
        }}
      >
        {presets.map(([p, icon, label]) => {
          const active = preset === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPreset(p)}
              hitSlop={6}
              android_ripple={{
                color: withAlpha(colors.primary, 0.12),
                borderless: false,
              }}
              style={[
                chipBase,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: active
                    ? withAlpha(colors.primary, 0.18)
                    : "transparent",
                  borderColor: active
                    ? withAlpha(colors.primary, 0.35)
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name={icon}
                size={14}
                color={active ? colors.primary : colors.muted}
              />
              <Text
                style={{
                  color: active ? colors.primary : colors.text,
                  fontWeight: active ? "800" : "600",
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Quick shortcuts */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: -2,
        }}
      >
        <Pressable
          onPress={setToday}
          hitSlop={6}
          style={[
            chipBase,
            {
              borderColor: colors.border,
              backgroundColor: withAlpha(colors.primary, 0.08),
            },
          ]}
        >
          <Row gap={6}>
            <Ionicons name="sunny-outline" size={14} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: "700" }}>Today</Text>
          </Row>
        </Pressable>
        <Pressable
          onPress={setYesterday}
          hitSlop={6}
          style={[
            chipBase,
            { borderColor: colors.border, backgroundColor: "transparent" },
          ]}
        >
          <Row gap={6}>
            <Ionicons name="moon-outline" size={14} color={colors.muted} />
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              Yesterday
            </Text>
          </Row>
        </Pressable>
        {(from || to) && (
          <Pressable
            onPress={clearDates}
            hitSlop={6}
            style={[
              chipBase,
              {
                borderColor: withAlpha("#ef4444", 0.5),
                backgroundColor: withAlpha("#ef4444", 0.08),
              },
            ]}
          >
            <Row gap={6}>
              <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontWeight: "800" }}>
                Clear dates
              </Text>
            </Row>
          </Pressable>
        )}
      </View>

      {/* Custom range */}
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Or set a custom range:
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="calendar-outline"
            placeholder="From YYYY-MM-DD"
            value={from}
            onChangeText={setFrom}
            autoCapitalize="none"
          />
          <Field
            icon="calendar-clear-outline"
            placeholder="To YYYY-MM-DD"
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
          />
        </View>
      </View>
    </Card>
  );
}

/* ─── tiny helper ───────────────────────────────────────────── */

function Row({ children, gap = 0 }: React.PropsWithChildren<{ gap?: number }>) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap }}>
      {children}
    </View>
  );
}
