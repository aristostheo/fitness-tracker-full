// components/profile/cards/MealScheduleCard.tsx
import React, { memo, useMemo, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Pill from "../ui/Pill";
import Field from "../ui/Field";
import { Ionicons } from "@expo/vector-icons";

/* ───────────────── helpers ───────────────── */
const onlyTime = (s: string) => s.replace(/[^0-9:]/g, "");
const isTime = (s?: string | null) =>
  !!s && /^([01]\d|2[0-3]):([0-5]\d)$/.test(s);
const toMin = (s: string) => {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
};
const fromMin = (m: number) => {
  const mm = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60);
  const r = mm % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(r)}`;
};
const spanMins = (start: string, end: string) =>
  Math.max(0, toMin(end) - toMin(start));
const spreadTimes = (start: string, end: string, count: number) => {
  const s = toMin(start);
  const e = toMin(end);
  const w = Math.max(0, e - s);
  if (count <= 1 || w === 0) return [start];
  const step = w / (count - 1);
  return Array.from({ length: count }, (_, i) =>
    fromMin(Math.round(s + i * step))
  );
};

const StatTile = memo(function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 120,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>
        {value} {unit}
      </Text>
    </View>
  );
});

const Glass = memo(function Glass({
  children,
  style,
}: React.PropsWithChildren<{ style?: any }>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

/* ───────────────── main ───────────────── */

export default function MealScheduleCard({
  mealsPerDay,
  setMealsPerDay,
  fastingWindow,
  setFastingWindow,
  breakfastTime,
  setBreakfastTime,
  lastMealTime,
  setLastMealTime,
}: {
  mealsPerDay: number | string | undefined;
  setMealsPerDay: (v: string) => void;
  fastingWindow?: string | null;
  setFastingWindow: (v: string | null) => void;
  breakfastTime?: string | null;
  setBreakfastTime: (v: string) => void;
  lastMealTime?: string | null;
  setLastMealTime: (v: string) => void;
}) {
  const { colors, isDark } = useTheme();

  // Local UI niceties
  const [presetHint, setPresetHint] = useState<null | string>(null);

  // Derivations
  const nMeals = Number(mealsPerDay || 0) || 3;
  const hasTimes =
    isTime(breakfastTime) &&
    isTime(lastMealTime) &&
    toMin(lastMealTime!) > toMin(breakfastTime!);
  const previewTimes = useMemo(
    () =>
      hasTimes
        ? spreadTimes(breakfastTime!, lastMealTime!, Math.max(1, nMeals))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breakfastTime, lastMealTime, nMeals]
  );
  const windowMins = hasTimes ? spanMins(breakfastTime!, lastMealTime!) : 0;
  const avgGap =
    hasTimes && nMeals > 1 ? Math.round(windowMins / (nMeals - 1)) : 0;

  // Quick presets that also fill sensible times/windows
  const presets = [
    {
      label: "Classic 3",
      meals: 3,
      start: "08:00",
      end: "19:00",
      fast: "14:10",
    },
    { label: "4 small", meals: 4, start: "08:00", end: "20:00", fast: "12:12" },
    { label: "2 big", meals: 2, start: "11:30", end: "19:30", fast: "16:8" },
    {
      label: "Early bird",
      meals: 3,
      start: "07:00",
      end: "18:00",
      fast: "14:10",
    },
  ] as const;

  return (
    <Card
      style={{
        padding: 16,
        borderRadius: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark
              ? "rgba(255,255,255,0.10)"
              : "rgba(0,0,0,0.06)",
          }}
        >
          <Ionicons name="restaurant-outline" size={20} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>
            Meal schedule
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Choose meals/day, set first & last meal, preview spacing
          </Text>
        </View>
      </View>

      {/* Presets */}
      <Glass>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          Quick presets
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {presets.map((p) => (
            <Pressable
              key={p.label}
              onPress={() => {
                setMealsPerDay(String(p.meals));
                setBreakfastTime(p.start);
                setLastMealTime(p.end);
                setFastingWindow(p.fast);
                setPresetHint(p.label);
                setTimeout(() => setPresetHint(null), 1200);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: Platform.select({ ios: 8, android: 6 }),
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed
                  ? isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.06)"
                  : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.03)",
              })}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {presetHint && (
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            Applied: {presetHint}
          </Text>
        )}
      </Glass>

      {/* Meals per day */}
      <Glass>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          Meals per day
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[2, 3, 4, 5].map((n) => (
            <Pill
              key={n}
              active={Number(mealsPerDay || 0) === n}
              onPress={() => setMealsPerDay(String(n))}
            >
              {n}
            </Pill>
          ))}
        </View>
      </Glass>

      {/* Time windows */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Glass style={{ flex: 1 }}>
          <Field
            label="Breakfast at"
            value={breakfastTime ?? ""}
            onChangeText={(s) => setBreakfastTime(onlyTime(s))}
            placeholder="08:00"
            inputMode="numeric"
            style={{ width: "100%" }}
            inputStyle={{ paddingVertical: 10 }}
            icon="sunny-outline"
          />
          {!isTime(breakfastTime) && (breakfastTime?.length ?? 0) > 0 && (
            <Text style={{ color: "#ff6b6b", fontSize: 11, marginTop: 6 }}>
              Please enter HH:MM (24h)
            </Text>
          )}
        </Glass>
        <Glass style={{ flex: 1 }}>
          <Field
            label="Last meal at"
            value={lastMealTime ?? ""}
            onChangeText={(s) => setLastMealTime(onlyTime(s))}
            placeholder="19:30"
            inputMode="numeric"
            style={{ width: "100%" }}
            inputStyle={{ paddingVertical: 10 }}
            icon="moon-outline"
          />
          {!isTime(lastMealTime) && (lastMealTime?.length ?? 0) > 0 && (
            <Text style={{ color: "#ff6b6b", fontSize: 11, marginTop: 6 }}>
              Please enter HH:MM (24h)
            </Text>
          )}
        </Glass>
      </View>

      {/* Fasting */}
      <Glass>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          Fasting window (optional)
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {["none", "12:12", "14:10", "16:8", "18:6", "20:4"].map((w) => (
            <Pill
              key={w}
              active={(fastingWindow || "none") === w}
              onPress={() => setFastingWindow(w === "none" ? null : w)}
            >
              {w === "none" ? "None" : w}
            </Pill>
          ))}
        </View>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
          We’ll tailor reminders and macro timing around this.
        </Text>
      </Glass>

      {/* Live stats + timeline */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile
          label="Eating window"
          value={hasTimes ? Math.round(windowMins / 60) : "—"}
          unit={hasTimes ? "hrs" : ""}
        />
        <StatTile
          label="Avg. gap"
          value={
            hasTimes && nMeals > 1
              ? `${Math.floor(avgGap / 60)}h ${avgGap % 60}m`
              : "—"
          }
        />
      </View>

      {hasTimes && (
        <Glass style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>
            Preview for {nMeals} {nMeals === 1 ? "meal" : "meals"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {previewTimes.map((t, i) => (
              <View
                key={t}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: Platform.select({ ios: 8, android: 6 }),
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.03)",
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    {t}
                  </Text>
                </View>
                {i !== previewTimes.length - 1 && (
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={16}
                    color={colors.muted}
                    style={{ marginHorizontal: 2 }}
                  />
                )}
              </View>
            ))}
          </View>

          {/* Helper action: nudge end time to even out spacing */}
          <Pressable
            onPress={() => {
              // Round last meal so the average gap lands on 3h/3h30m/4h when close
              if (!hasTimes || nMeals < 2) return;
              const targetGaps = [180, 210, 240]; // 3h, 3h30m, 4h
              const best = targetGaps.reduce(
                (best, g) =>
                  Math.abs(g - avgGap) < Math.abs(best - avgGap) ? g : best,
                targetGaps[0]
              );
              const newEnd = fromMin(
                toMin(breakfastTime!) + best * (nMeals - 1)
              );
              setLastMealTime(newEnd);
            }}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              marginTop: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed
                ? isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.06)"
                : isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.03)",
            })}
          >
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              Even-out spacing
            </Text>
          </Pressable>
        </Glass>
      )}
    </Card>
  );
}
