// app/(tabs)/friends/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import Card from "@/components/Card";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { withAlpha } from "@/components/workouts/utils/withAlpha";
import { subscribeFoodsByDate, getFoodsInRange } from "@/services/nutrition";
import { GradientButton } from "@/components/workouts/ui/GradientButton";

type MealRow = { name: string; meal: string; calories: number };
type DayCalories = { date: string; calories: number };

export default function FriendDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const friendUid = (id || "").toString();
  const friendName = (name || "").toString();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const todayISO = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
      t.getDate()
    ).padStart(2, "0")}`;
  }, []);

  const [todayMeals, setTodayMeals] = useState<MealRow[]>([]);
  const [weekCalories, setWeekCalories] = useState<DayCalories[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(false);

  // Stream today's meals
  useEffect(() => {
    if (!friendUid) return;
    return subscribeFoodsByDate(friendUid, todayISO, (rows) => {
      setTodayMeals(
        rows.map((r) => ({
          name: r.name,
          meal: r.meal,
          calories: r.calories,
        }))
      );
    });
  }, [friendUid, todayISO]);

  // Fetch last 7 days calories
  useEffect(() => {
    if (!friendUid) return;
    (async () => {
      setLoadingWeek(true);
      const end = new Date(todayISO + "T00:00:00");
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const toISO = todayISO;
      const fromISO = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(start.getDate()).padStart(2, "0")}`;
      const rows = await getFoodsInRange(friendUid, fromISO, toISO);
      const grouped: Record<string, number> = {};
      rows.forEach((r: any) => {
        grouped[r.date] = (grouped[r.date] || 0) + Number(r.calories || 0);
      });
      const list = Object.keys(grouped)
        .sort()
        .map((d) => ({ date: d, calories: Math.round(grouped[d]) }));
      setWeekCalories(list);
      setLoadingWeek(false);
    })();
  }, [friendUid, todayISO]);

  const title = friendName || friendUid || "Friend";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
    >
      <Ribbon side="right" colors={["#5ce1ff", "#ff5ac8"]} opacity={isDark ? 0.2 : 0.26} />
      <Ribbon side="left" top={260} colors={["#8cfb9f", "#ffc857"]} opacity={isDark ? 0.16 : 0.22} />

      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 420 }}
      >
        <LinearGradient
          colors={[withAlpha(colors.primary, 0.22), colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.35),
            gap: 12,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>
            {title}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>
            Viewing {title}'s meals and weekly calories.
          </Text>
          <GradientButton label="Back to friends" onPress={() => router.back()} />
        </LinearGradient>
      </MotiView>

      <Card
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        }}
      >
        <SectionHeader
          icon="fast-food-outline"
          title="Today"
          subtitle={todayMeals.length ? `${todayMeals.length} meals` : "No meals logged"}
        />
        {todayMeals.length === 0 ? (
          <EmptyLine label="No meals logged today" />
        ) : (
          todayMeals.map((m, idx) => (
            <View
              key={idx}
              style={{
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: withAlpha(colors.border, 0.9),
                backgroundColor: withAlpha(colors.card, 0.96),
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "800" }}>{m.name}</Text>
                <Text style={{ color: colors.muted }}>{m.meal}</Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: "800" }}>{m.calories} kcal</Text>
            </View>
          ))
        )}
      </Card>

      <Card
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        }}
      >
        <SectionHeader
          icon="calendar-outline"
          title="Last 7 days"
          subtitle={
            loadingWeek
              ? "Loading..."
              : weekCalories.length
              ? `${weekCalories.length} days logged`
              : "No meals this week"
          }
        />
        {weekCalories.length === 0 ? (
          <EmptyLine label={loadingWeek ? "Loading..." : "No meals this week"} />
        ) : (
          weekCalories.map((d) => (
            <View
              key={d.date}
              style={{
                padding: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: withAlpha(colors.border, 0.8),
                backgroundColor: withAlpha(colors.card, 0.95),
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: colors.text }}>{d.date}</Text>
              <Text style={{ color: colors.text, fontWeight: "800" }}>{d.calories} kcal</Text>
            </View>
          ))
        )}
      </Card>

      <BottomTabSpacer extra={20} />
    </ScrollView>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(colors.primary, 0.16),
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, 0.35),
        }}
      >
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

function EmptyLine({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.8),
        backgroundColor: withAlpha(colors.card, 0.9),
      }}
    >
      <Text style={{ color: colors.muted }}>{label}</Text>
    </View>
  );
}

function Ribbon({
  side,
  colors,
  top = -50,
  opacity = 0.2,
}: {
  side: "left" | "right";
  colors: string[];
  top?: number;
  opacity?: number;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        position: "absolute",
        [side]: -70,
        top,
        width: 220,
        height: 220,
        borderRadius: 120,
        opacity,
        transform: [{ rotate: side === "left" ? "-14deg" : "16deg" }],
      }}
    />
  );
}
