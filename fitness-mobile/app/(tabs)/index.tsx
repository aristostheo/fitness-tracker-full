// app/(tabs)/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Link, Href, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";

import Card from "../../components/Card";
import { useAuth } from "@/content/AuthContext";
import {
  subscribeFoodsByDate,
  subscribeExerciseByDate,
  subscribeFoodsBetween,
  subscribeExerciseBetween,
  type FoodEntry,
  type ExerciseEntry,
} from "@/services/nutrition";
import {
  ensureProfile,
  subscribeProfile,
  type Profile,
} from "@/services/profile";
import WeeklyCaloriesChart from "@/components/WeeklyCaloriesChart";
import ProgressRing from "@/components/ProgressRing";
import { useTheme } from "@/content/ThemeProvider";

/* ---------- utils ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

function withAlpha(color: string, alpha = 0.25) {
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

const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

/* initials helper for avatar */
function initialsOf(name?: string | null, email?: string | null) {
  const src = (name && name.trim()) || (email || "").split("@")[0] || "You";
  const parts = src.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const [date] = useState(ymd(new Date()));

  // today
  const [foodsToday, setFoodsToday] = useState<FoodEntry[]>([]);
  const [exerciseToday, setExerciseToday] = useState<ExerciseEntry[]>([]);

  // goals/profile
  const [profile, setProfile] = useState<Profile | null>(null);

  // last 7 days (inclusive)
  const [foodsRange, setFoodsRange] = useState<FoodEntry[]>([]);
  const [exerciseRange, setExerciseRange] = useState<ExerciseEntry[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubs: Array<() => void> = [];

    unsubs.push(subscribeFoodsByDate(user.uid, date, setFoodsToday));
    unsubs.push(subscribeExerciseByDate(user.uid, date, setExerciseToday));

    (async () => {
      await ensureProfile(user.uid, user.email ? { email: user.email } : {});
      unsubs.push(subscribeProfile(user.uid, setProfile));
    })();

    const today = new Date();
    const start = addDays(today, -6);
    const from = ymd(start),
      to = ymd(today);
    unsubs.push(subscribeFoodsBetween(user.uid, from, to, setFoodsRange));
    unsubs.push(subscribeExerciseBetween(user.uid, from, to, setExerciseRange));

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {}
      });
    };
  }, [user?.uid, date]);

  // today totals
  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    foodsToday.forEach((f) => {
      t.calories += f.calories || 0;
      t.protein += f.protein || 0;
      t.carbs += f.carbs || 0;
      t.fat += f.fat || 0;
    });
    const burned = exerciseToday.reduce((s, e) => s + (e.calories || 0), 0);
    return { ...t, burned, net: t.calories - burned };
  }, [foodsToday, exerciseToday]);

  // macro split today (for micro bars)
  const macroSplit = useMemo(() => {
    const sum = (totals.protein || 0) + (totals.carbs || 0) + (totals.fat || 0);
    const pct = (n: number) =>
      sum > 0 ? Math.max(2, Math.round((n / sum) * 100)) : 0;
    return {
      p: pct(totals.protein),
      c: pct(totals.carbs),
      f: pct(totals.fat),
    };
  }, [totals]);

  // weekly series
  const weekly = useMemo(() => {
    const today = new Date();
    const start = addDays(today, -6);
    const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(start, i)));
    const consumedMap = Object.fromEntries(days.map((d) => [d, 0]));
    const burnedMap = Object.fromEntries(days.map((d) => [d, 0]));
    foodsRange.forEach((f) => {
      if (consumedMap[f.date] != null)
        consumedMap[f.date] += Number(f.calories || 0);
    });
    exerciseRange.forEach((x) => {
      if (burnedMap[x.date] != null)
        burnedMap[x.date] += Number(x.calories || 0);
    });
    return days.map((d) => ({
      date: d.slice(5),
      consumed: consumedMap[d] || 0,
      burned: burnedMap[d] || 0,
      net: (consumedMap[d] || 0) - (burnedMap[d] || 0),
    }));
  }, [foodsRange, exerciseRange]);

  // goals
  const kcalGoal = profile?.dailyCaloriesTarget ?? profile?.calorieGoal ?? 2200;
  const proteinGoal = profile?.dailyProteinTarget ?? 130;

  // streaks (last 30 days)
  const [foodStreak, workoutStreak] = useMemo(() => {
    const daysBack = 30;
    const today = new Date();
    const logs: Record<string, boolean> = {};
    foodsRange.forEach((f) => (logs[f.date] = true));
    exerciseRange.forEach((x) => (logs[`w:${x.date}`] = true));

    const foodPresence: boolean[] = [];
    const woPresence: boolean[] = [];
    for (let i = 0; i < daysBack; i++) {
      const d = ymd(addDays(today, -i));
      foodPresence.push(!!logs[d]);
      woPresence.push(!!logs[`w:${d}`]);
    }
    const streak = (arr: boolean[]) => {
      let s = 0;
      for (const v of arr) {
        if (v) s++;
        else break;
      }
      return s;
    };
    return [streak(foodPresence), streak(woPresence)];
  }, [foodsRange, exerciseRange]);

  /* greeting + tiny avatar */
  const greetingLabel = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const greeting = `${greetingLabel}, ${user?.displayName || "there"}`;
  const initials = initialsOf(
    profile?.displayName ?? undefined,
    user?.email ?? undefined
  );

  /* ---------- UI ---------- */
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* TOP BAR / AVATAR */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha(colors.primary, 0.18),
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "800" }}>
              {initials}
            </Text>
          </View>
          <Text style={{ color: withAlpha(colors.text, 0.6) }}>{date}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <IconBtn icon="notifications-outline" />
          {/* ⚙️ -> Account page */}
          <IconBtn
            icon="settings-outline"
            onPress={() => router.push("/(modals)/settings")}
          />
        </View>
      </View>

      {/* HERO / GLASS + GRADIENT */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 480 }}
      >
        <LinearGradient
          colors={[
            withAlpha(colors.primary, 0.22),
            withAlpha(colors.success, 0.22),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              borderRadius: 24,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            },
            softShadow,
          ]}
        >
          {/* glow blobs (native) */}
          <LinearGradient
            colors={[withAlpha(colors.primary, 0.15), "transparent"]}
            start={{ x: 0.4, y: 0.4 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              right: -40,
              top: -30,
              width: 220,
              height: 220,
              borderRadius: 999,
              opacity: 0.9,
            }}
          />
          <LinearGradient
            colors={[withAlpha(colors.success, 0.14), "transparent"]}
            start={{ x: 0.6, y: 0.6 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              left: -50,
              bottom: -40,
              width: 260,
              height: 260,
              borderRadius: 999,
              opacity: 0.9,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12, minWidth: 0 }}>
              <Text
                style={{ color: withAlpha(colors.text, 0.6), fontSize: 12 }}
              >
                Welcome
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 26,
                  fontWeight: "800",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {greeting}
              </Text>
              <Text
                style={{ color: withAlpha(colors.text, 0.6), marginTop: 4 }}
              >
                Here’s your day at a glance.
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <ProgressRing
                label="Net"
                value={Math.max(0, totals.net)}
                target={kcalGoal}
                unit="kcal"
              />
            </View>
          </View>

          {/* hero pills */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pill
              icon="flame-outline"
              label="Consumed"
              value={`${Math.round(totals.calories)} kcal`}
              tint={colors.primary}
            />
            <Pill
              icon="walk-outline"
              label="Burned"
              value={`${Math.round(totals.burned)} kcal`}
              tint={colors.chartSecondary}
            />
          </View>

          {/* micro macro bars */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <MacroChip
              label="Protein"
              grams={Math.round(totals.protein)}
              pct={macroSplit.p}
              tint={colors.success}
            />
            <MacroChip
              label="Carbs"
              grams={Math.round(totals.carbs)}
              pct={macroSplit.c}
              tint={colors.primary}
            />
            <MacroChip
              label="Fat"
              grams={Math.round(totals.fat)}
              pct={macroSplit.f}
              tint={colors.chartSecondary}
            />
          </View>
        </LinearGradient>
      </MotiView>

      {/* QUICK STATS */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 80 }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <StatCard
            label="Calories"
            value={`${Math.round(totals.calories)} kcal`}
          />
          <StatCard label="Protein" value={`${Math.round(totals.protein)} g`} />
          <StatCard
            label="Exercise"
            value={`-${Math.round(totals.burned)} kcal`}
          />
          <StatCard
            label="Net"
            value={`${Math.round(totals.net)} kcal`}
            accent
          />
        </View>
      </MotiView>

      {/* GOALS */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 120 }}
      >
        <Card
          style={{ padding: 14, borderWidth: 1, borderColor: colors.border }}
        >
          <SectionTitle icon="trophy-outline" text="Goals" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <ProgressRing
              label="Calorie Goal"
              value={totals.calories}
              target={kcalGoal}
              unit="kcal"
            />
            <ProgressRing
              label="Protein Goal"
              value={totals.protein}
              target={proteinGoal}
              unit="g"
            />
          </View>
        </Card>
      </MotiView>

      {/* STREAKS — wraps nicely, no squish */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 160 }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <GlassCard>
            <SectionTitle icon="calendar-outline" text="Meal Streak" compact />
            <RowSplit>
              <View
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 180, // 👈 keeps enough width for “0 days”
                  paddingRight: 8,
                }}
              >
                <HeadlineValue value={`${foodStreak} days`} />
                <Text
                  style={{ color: withAlpha(colors.text, 0.6) }}
                  numberOfLines={2}
                >
                  consecutive days with at least one food logged
                </Text>
              </View>
              <Badge text="Goal: daily" color={colors.primary} />
            </RowSplit>
          </GlassCard>

          <GlassCard>
            <SectionTitle
              icon="barbell-outline"
              text="Workout Streak"
              compact
            />
            <RowSplit>
              <View
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 180,
                  paddingRight: 8,
                }}
              >
                <HeadlineValue value={`${workoutStreak} days`} />
                <Text
                  style={{ color: withAlpha(colors.text, 0.6) }}
                  numberOfLines={2}
                >
                  consecutive days with a workout logged
                </Text>
              </View>
              <Badge text="Goal: 3×/week" color={colors.primary} />
            </RowSplit>
          </GlassCard>
        </View>
      </MotiView>

      {/* WEEKLY CHART */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 200 }}
      >
        <Card style={{ borderWidth: 1, borderColor: colors.border }}>
          <SectionTitle icon="stats-chart-outline" text="Weekly Trend" />
          <WeeklyCaloriesChart data={weekly} />
        </Card>
      </MotiView>

      {/* TODAY SNAPSHOT BAR */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 220 }}
      >
        <Card
          style={{ padding: 16, borderWidth: 1, borderColor: colors.border }}
        >
          <SectionTitle icon="pulse-outline" text="Today Snapshot" />
          <TodayBar
            consumed={totals.calories}
            burned={totals.burned}
            target={kcalGoal}
            primary={colors.primary}
            secondary={colors.chartSecondary}
            border={colors.border}
            textColor={colors.text}
            muted={withAlpha(colors.text, 0.6)}
          />
        </Card>
      </MotiView>

      {/* QUICK ACTIONS */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 460, delay: 260 }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <ActionTile
            icon="barbell-outline"
            title="Log Workout"
            desc="Add sets, reps, weight"
            to={"/(tabs)/workouts" as Href}
            tint={colors.chartSecondary}
          />
          <ActionTile
            icon="fast-food-outline"
            title="Add Meal"
            desc="Track food & macros"
            to={"/(tabs)/nutrition" as Href}
            tint={colors.primary}
          />
          <ActionTile
            icon="person-circle-outline"
            title="Profile"
            desc="Account & preferences"
            to={"/(tabs)/profile" as Href}
            tint={colors.success}
          />
        </View>
      </MotiView>
    </ScrollView>
  );
}

/* ---------- bits ---------- */

function IconBtn({ icon, onPress }: { icon: any; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(colors.card, 0.9),
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
    </Pressable>
  );
}

function SectionTitle({
  icon,
  text,
  compact,
}: {
  icon: any;
  text: string;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: compact ? 6 : 10,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(colors.primary, 0.15),
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, 0.35),
        }}
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={{ color: colors.text, fontWeight: "800" }}>{text}</Text>
    </View>
  );
}

function HeadlineValue({ value }: { value: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
      {value}
    </Text>
  );
}

// Wraps children; will move Badge below text when space is tight
function RowSplit({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap", // 👈 key: wrap instead of squishing
      }}
    >
      {children}
    </View>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Card
      style={{
        padding: 16,
        minWidth: 150,
        borderWidth: 1,
        borderColor: accent ? withAlpha(colors.primary, 0.35) : colors.border,
        borderRadius: 16,
        ...softShadow,
      }}
    >
      <Text
        style={{
          color: withAlpha(colors.text, 0.6),
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
        {value}
      </Text>
    </Card>
  );
}

function Pill({
  icon,
  label,
  value,
  tint,
}: {
  icon: any;
  label: string;
  value: string;
  tint: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: withAlpha(tint, 0.18),
        borderWidth: 1,
        borderColor: withAlpha(tint, 0.35),
      }}
    >
      <Ionicons name={icon} size={16} color={tint} />
      <Text style={{ color: colors.text, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: withAlpha(colors.text, 0.6) }}>· {value}</Text>
    </View>
  );
}

function MacroChip({
  label,
  grams,
  pct,
  tint,
}: {
  label: string;
  grams: number;
  pct: number; // 0-100 (we clamp to min width visually)
  tint: string;
}) {
  const { colors } = useTheme();
  const widthPct = Math.max(10, Math.min(100, pct));
  return (
    <View
      style={{
        flex: 1,
        minWidth: 90,
        borderRadius: 14,
        padding: 10,
        backgroundColor: withAlpha(tint, 0.12),
        borderWidth: 1,
        borderColor: withAlpha(tint, 0.35),
      }}
    >
      <Text style={{ color: withAlpha(colors.text, 0.6), fontSize: 12 }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontWeight: "800" }}>{grams} g</Text>
      <View
        style={{
          height: 6,
          borderRadius: 999,
          backgroundColor: withAlpha(colors.card, 0.5),
          marginTop: 6,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${widthPct}%`,
            height: "100%",
            backgroundColor: tint,
          }}
        />
      </View>
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: withAlpha(color, 0.5),
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
        alignSelf: "flex-start", // when it wraps, it aligns nicely
      }}
    >
      <Text style={{ color }}>{text}</Text>
    </View>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 180, // 👈 a bit wider than before
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: withAlpha(colors.card, 0.9),
        ...softShadow,
      }}
    >
      {children}
    </View>
  );
}

function ActionTile({
  icon,
  title,
  desc,
  to,
  tint,
}: {
  icon: any;
  title: string;
  desc: string;
  to: Href;
  tint: string;
}) {
  const { colors } = useTheme();
  return (
    <Link href={to} asChild>
      <Pressable>
        {({ pressed }) => (
          <MotiView
            from={{ scale: 1 }}
            animate={{ scale: pressed ? 0.98 : 1 }}
            transition={{ type: "timing", duration: 120 }}
            style={{
              padding: 16,
              minWidth: 160,
              borderRadius: 18,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              ...softShadow,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: withAlpha(tint, 0.15),
                borderWidth: 1,
                borderColor: withAlpha(tint, 0.35),
                marginBottom: 8,
              }}
            >
              <Ionicons name={icon} size={20} color={tint} />
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "800", color: colors.text }}
            >
              {title}
            </Text>
            <Text style={{ color: withAlpha(colors.text, 0.6) }}>{desc}</Text>
          </MotiView>
        )}
      </Pressable>
    </Link>
  );
}

function TodayBar({
  consumed,
  burned,
  target,
  primary,
  secondary,
  border,
  textColor,
  muted,
}: {
  consumed: number;
  burned: number;
  target: number;
  primary: string;
  secondary: string;
  border: string;
  textColor: string;
  muted: string;
}) {
  const safeTarget = Math.max(1, target || 1);
  const pctConsumed = Math.min(100, Math.round((consumed / safeTarget) * 100));
  const pctBurned = Math.min(100, Math.round((burned / safeTarget) * 100));
  const net = consumed - burned;

  return (
    <View>
      <View
        style={{
          height: 16,
          borderRadius: 999,
          backgroundColor: withAlpha("#ffffff", 0.04),
          borderWidth: 1,
          borderColor: border,
          overflow: "hidden",
        }}
      >
        {/* consumed */}
        <View
          style={{
            width: `${pctConsumed}%`,
            height: "100%",
            backgroundColor: withAlpha(primary, 0.9),
          }}
        >
          {/* burned overlay */}
          <View
            style={{
              width: `${pctBurned}%`,
              height: "100%",
              backgroundColor: withAlpha(secondary, 0.9),
              opacity: 0.65,
            }}
          />
        </View>
      </View>
      <View
        style={{
          marginTop: 8,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: muted }}>Target: {Math.round(target)} kcal</Text>
        <Text style={{ color: textColor, fontWeight: "700" }}>
          Net: {Math.round(net)} kcal
        </Text>
      </View>
    </View>
  );
}
