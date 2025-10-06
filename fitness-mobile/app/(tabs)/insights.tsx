// app/(tabs)/insights.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

import Card from "../../components/Card";
import { useAuth } from "@/content/AuthContext";
import {
  getFoodsInRange,
  getExerciseInRange,
  type FoodEntry,
  type ExerciseEntry,
} from "@/services/nutrition";
import NetAreaChart from "@/components/charts/NetAreaChart";
import MacrosStackedBars from "@/components/charts/MacrosStackedBars";
import { useTheme } from "@/content/ThemeProvider";

/* ---------- helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysArray = (n: number) => {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(ymd(d));
  }
  return out;
};
const withAlpha = (hex: string, a = 0.18) => {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/* ---------- page ---------- */
export default function InsightsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [range, setRange] = useState<7 | 14 | 30>(7);
  const days = useMemo(() => daysArray(range), [range]);
  const from = days[0];
  const to = days[days.length - 1];

  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [ex, setEx] = useState<ExerciseEntry[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    (async () => {
      const [f, e] = await Promise.all([
        getFoodsInRange(user.uid, from, to),
        getExerciseInRange(user.uid, from, to),
      ]);
      if (!active) return;
      setFoods(f || []);
      setEx(e || []);
    })();
    return () => {
      active = false;
    };
  }, [user?.uid, from, to]);

  /* aggregate by day */
  const byDay = useMemo(() => {
    const map: Record<
      string,
      { cal: number; p: number; c: number; f: number; ex: number }
    > = {};
    for (const d of days) map[d] = { cal: 0, p: 0, c: 0, f: 0, ex: 0 };
    foods.forEach((r) => {
      const d = r.date;
      if (!map[d]) map[d] = { cal: 0, p: 0, c: 0, f: 0, ex: 0 };
      map[d].cal += Number(r.calories || 0);
      map[d].p += Number(r.protein || 0);
      map[d].c += Number(r.carbs || 0);
      map[d].f += Number(r.fat || 0);
    });
    ex.forEach((r) => {
      const d = r.date;
      if (!map[d]) map[d] = { cal: 0, p: 0, c: 0, f: 0, ex: 0 };
      map[d].ex += Number(r.calories || 0);
    });
    return map;
  }, [foods, ex, days]);

  const chartData = useMemo(
    () =>
      days.map((d) => {
        const v = byDay[d] || { cal: 0, p: 0, c: 0, f: 0, ex: 0 };
        return {
          label: d.slice(5), // MM-DD
          calories: Math.round(v.cal),
          exercise: Math.round(v.ex),
          net: Math.round(v.cal - v.ex),
          protein: Math.round(v.p),
          carbs: Math.round(v.c),
          fat: Math.round(v.f),
        };
      }),
    [byDay, days]
  );

  const totals = useMemo(() => {
    return chartData.reduce(
      (t, r) => ({
        cal: t.cal + r.calories,
        p: t.p + r.protein,
        c: t.c + r.carbs,
        f: t.f + r.fat,
        ex: t.ex + r.exercise,
        net: t.net + r.net,
      }),
      { cal: 0, p: 0, c: 0, f: 0, ex: 0, net: 0 }
    );
  }, [chartData]);

  const avgNet = Math.round((totals.net || 0) / Math.max(1, chartData.length));
  const best = chartData.reduce((acc, r) => (r.net > acc.net ? r : acc), {
    label: "",
    net: -Infinity,
  } as { label: string; net: number });
  const worst = chartData.reduce((acc, r) => (r.net < acc.net ? r : acc), {
    label: "",
    net: Infinity,
  } as { label: string; net: number });

  const pos = (colors as any).success ?? "#10B981";
  const neg = (colors as any).danger ?? "#EF4444";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* HERO */}
      <LinearGradient
        colors={
          isDark
            ? (["#0D1221", "#0D1221", withAlpha(colors.primary, 0.22)] as const)
            : (["#F6FAFF", "#EEF4FF", withAlpha(colors.primary, 0.18)] as const)
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        <BlurView tint={isDark ? "dark" : "light"} intensity={isDark ? 20 : 10}>
          <View style={{ padding: 14, gap: 12 }}>
            {/* top row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor: withAlpha(colors.primary, 0.15),
                    borderWidth: 1,
                    borderColor: withAlpha(colors.primary, 0.35),
                  }}
                >
                  <Ionicons
                    name="analytics-outline"
                    color={colors.primary}
                    size={18}
                  />
                </View>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Overview
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 22,
                      fontWeight: "800",
                    }}
                  >
                    Insights
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {from.slice(5)} → {to.slice(5)}
                  </Text>
                </View>
              </View>

              <Segmented
                options={[
                  { k: 7, label: "7d" },
                  { k: 14, label: "14d" },
                  { k: 30, label: "30d" },
                ]}
                value={range}
                onChange={(k) => setRange(k as 7 | 14 | 30)}
              />
            </View>

            {/* quick metrics */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Metric
                label="Avg Net"
                value={avgNet}
                suffix="kcal"
                tone={avgNet >= 0 ? pos : neg}
              />
              <Metric
                label="Total kcal"
                value={Math.round(totals.cal)}
                suffix="kcal"
              />
              <Metric
                label="Exercise"
                value={Math.round(totals.ex)}
                suffix="kcal"
              />
            </View>

            {/* best/worst */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pill
                icon="trending-up-outline"
                label={`Best: ${best.label || "--"}`}
                value={`${isFinite(best.net) ? best.net : 0} kcal`}
                tone={pos}
              />
              <Pill
                icon="trending-down-outline"
                label={`Worst: ${worst.label || "--"}`}
                value={`${isFinite(worst.net) ? worst.net : 0} kcal`}
                tone={neg}
              />
            </View>
          </View>
        </BlurView>
      </LinearGradient>

      {/* CHARTS */}
      <Card style={{ gap: 10, paddingBottom: 12 }}>
        <SectionHeader
          icon="speedometer-outline"
          title="Net calories"
          subtitle="Daily balance"
        />
        <NetAreaChart
          data={chartData.map(({ label, net }) => ({ label, net }))}
        />
      </Card>

      <Card style={{ gap: 10, paddingBottom: 12 }}>
        <SectionHeader
          icon="bar-chart-outline"
          title="Macros per day"
          subtitle="Protein • Carbs • Fat"
        />
        <MacrosStackedBars
          data={chartData.map(({ label, protein, carbs, fat }) => ({
            label,
            protein,
            carbs,
            fat,
          }))}
        />
      </Card>

      {/* TABLE */}
      <Card style={{ paddingVertical: 6 }}>
        {/* header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Th flex={1.25} align="left">
            Day
          </Th>
          <Th>Calories</Th>
          <Th>Protein</Th>
          <Th>Carbs</Th>
          <Th>Fat</Th>
          <Th>Exercise</Th>
          <Th>Net</Th>
        </View>

        {/* rows */}
        {days.map((d) => {
          const v = byDay[d] || { cal: 0, p: 0, c: 0, f: 0, ex: 0 };
          const netVal = v.cal - v.ex;
          const tone = netVal >= 0 ? pos : neg;

          return (
            <View
              key={d}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Td flex={1.25} align="left">
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: withAlpha(tone, 0.85),
                    }}
                  />
                  <Text style={{ color: colors.text }}>{d.slice(5)}</Text>
                </View>
              </Td>
              <Td>{Math.round(v.cal)}</Td>
              <Td>{Math.round(v.p)}</Td>
              <Td>{Math.round(v.c)}</Td>
              <Td>{Math.round(v.f)}</Td>
              <Td>{Math.round(v.ex)}</Td>
              <Td>
                <View
                  style={{
                    alignSelf: "flex-end",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: withAlpha(tone, 0.45),
                    backgroundColor: withAlpha(tone, 0.12),
                  }}
                >
                  <Text style={{ color: tone, fontWeight: "700" }}>
                    {Math.round(netVal)}
                  </Text>
                </View>
              </Td>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

/* ---------- bits ---------- */

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          padding: 8,
          borderRadius: 12,
          backgroundColor: withAlpha(colors.primary, 0.15),
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, 0.35),
        }}
      >
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View>
        <Text style={{ color: colors.text, fontWeight: "800" }}>{title}</Text>
        {!!subtitle && (
          <Text style={{ color: colors.muted, fontSize: 12 }}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { k: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
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
      {options.map((o) => {
        const active = o.k === value;
        return (
          <Pressable
            key={String(o.k)}
            onPress={() => onChange(o.k)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: active
                ? withAlpha(colors.primary, 0.18)
                : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active
                ? withAlpha(colors.primary, 0.35)
                : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.primary : colors.text,
                fontWeight: active ? "700" : "500",
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Metric({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: tone ? withAlpha(tone, 0.35) : colors.border,
        backgroundColor: tone ? withAlpha(tone, 0.12) : colors.card,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text
        style={{ color: tone || colors.text, fontSize: 18, fontWeight: "800" }}
      >
        {value}
        {suffix ? ` ${suffix}` : ""}
      </Text>
    </View>
  );
}

function Pill({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  tone: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: withAlpha(tone, 0.35),
        backgroundColor: withAlpha(tone, 0.12),
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Ionicons name={icon} size={16} color={tone} />
      <View style={{ gap: 2 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: tone, fontWeight: "800" }}>{value}</Text>
      </View>
    </View>
  );
}

function Th({
  children,
  flex = 1,
  align = "right",
}: {
  children: React.ReactNode;
  flex?: number;
  align?: "left" | "right" | "center";
}) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        flex,
        paddingHorizontal: 8,
        fontWeight: "700",
        color: colors.muted,
        fontSize: 12,
        textAlign: align,
      }}
    >
      {children}
    </Text>
  );
}

function Td({
  children,
  flex = 1,
  align = "right",
}: {
  children: React.ReactNode;
  flex?: number;
  align?: "left" | "right" | "center";
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex, paddingHorizontal: 8 }}>
      <Text style={{ color: colors.text, textAlign: align }}>{children}</Text>
    </View>
  );
}
