// app/friends/[id]/workouts.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import Card from "@/components/Card";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { withAlpha } from "@/components/workouts/utils/withAlpha";
import { subscribeWorkouts, type Workout } from "@/services/workouts";
import { saveWorkoutTemplate } from "@/services/templates";
import { GradientButton } from "@/components/workouts/ui/GradientButton";

const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

export default function FriendWorkoutsScreen() {
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

  const datePills = useMemo(() => {
    const days = [];
    const base = new Date(todayISO + "T00:00:00");
    for (let i = 0; i < 10; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      days.push(iso);
    }
    return days;
  }, [todayISO]);

  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (!friendUid) return;
    setLoading(true);
    const unsub = subscribeWorkouts(
      friendUid,
      (rows) => {
        setWorkouts(rows);
        setLoading(false);
      },
      {
        from: selectedDate,
        to: selectedDate,
      }
    );
    return () => {
      try {
        unsub && unsub();
      } catch {}
      setLoading(false);
    };
  }, [friendUid, selectedDate]);

  const grouped = useMemo(() => {
    return workouts.filter((w) => w.date === selectedDate);
  }, [workouts, selectedDate]);

  async function handleSaveTemplate() {
    if (!user?.uid) {
      Alert.alert("Sign in required");
      return;
    }
    if (!grouped.length) {
      Alert.alert("No workouts", "Pick a day with workouts to save.");
      return;
    }
    const name = templateName.trim() || `${friendName || "Friend"} ${selectedDate}`;
    Alert.alert(
      "Save as template",
      `Save ${grouped.length} workouts as "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            try {
              await saveWorkoutTemplate(user.uid!, {
                name,
                tags: [],
                items: grouped.map((w) => ({
                  exercise: w.exercise,
                  sets: Number(w.sets || 0),
                  reps: Number(w.reps || 0),
                  weight: Number(w.weight || 0),
                  notes: w.notes || "",
                })),
              });
              Alert.alert("Saved", "Template added to your library.");
            } catch (e: any) {
              Alert.alert("Couldn't save", e?.message || "Unknown error");
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
    >
      <Ribbon side="right" colors={["#5ce1ff", "#ff5ac8"] as const} opacity={isDark ? 0.2 : 0.26} />
      <Ribbon side="left" top={260} colors={["#8cfb9f", "#ffc857"] as const} opacity={isDark ? 0.16 : 0.22} />

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
            gap: 10,
            ...softShadow,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }} numberOfLines={1}>
                {friendName || "Friend"}'s workouts
              </Text>
              <Text style={{ color: colors.muted, fontWeight: "600" }}>
                Browse their sessions by day. Save a routine as your template.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/notifications")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.35),
                backgroundColor: withAlpha(colors.primary, pressed ? 0.18 : 0.12),
              })}
            >
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "800" }}>Back</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <TextInput
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
              placeholderTextColor={withAlpha(colors.text, 0.6)}
              style={{
                flex: 1,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: withAlpha(colors.card, 0.94),
              }}
            />
            <GradientButton label="Save template" onPress={handleSaveTemplate} disabled={!grouped.length} />
          </View>
        </LinearGradient>
      </MotiView>

      {/* Date pills */}
      <Card
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "800", marginBottom: 4 }}>
          Pick a day
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {datePills.map((d) => {
            const isActive = d === selectedDate;
            const dateObj = new Date(d + "T00:00:00");
            const label = dateObj.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            const weekday = dateObj.toLocaleDateString(undefined, { weekday: "short" });
            return (
              <Pressable key={d} onPress={() => setSelectedDate(d)}>
                {({ pressed }) => (
                  <MotiView
                    animate={{
                      scale: pressed ? 0.97 : 1,
                      translateY: pressed ? 1 : 0,
                    }}
                    transition={{ type: "timing", duration: 140 }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: withAlpha(
                        isActive ? colors.primary : colors.card,
                        isActive ? 0.18 : 0.96
                      ),
                      gap: 2,
                      minWidth: 88,
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "900", fontSize: 13 }}>
                      {weekday}
                    </Text>
                    <Text style={{ color: colors.muted, fontWeight: "700" }}>{label}</Text>
                  </MotiView>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>

      {/* Workouts */}
      {loading ? (
        <Card
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 8 }}>Loading workouts...</Text>
        </Card>
      ) : grouped.length === 0 ? (
        <Card
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons name="barbell-outline" size={18} color={colors.muted} />
          <Text style={{ color: colors.muted }}>No workouts for this day</Text>
        </Card>
      ) : (
        grouped.map((w) => (
          <Card
            key={w.id}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 10,
            }}
          >
            <SectionHeader
              icon="barbell-outline"
              title={w.exercise || "Exercise"}
              subtitle={`${w.sets || 0} x ${w.reps || 0} • ${Math.round(w.weight || 0)} kg`}
            />
            {w.notes ? (
              <Text style={{ color: colors.muted, fontStyle: "italic" }}>
                “{w.notes}”
              </Text>
            ) : null}
          </Card>
        ))
      )}

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
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>{subtitle}</Text>
        ) : null}
      </View>
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
  colors: readonly [string, string];
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
