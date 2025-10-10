// components/workouts/Hero.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "./utils/withAlpha";
import { Metric } from "./ui/Metric";

export default function Hero({
  unit,
  totals,
  dailySetTarget,
  todaySets,
  onToggleUnit,
}: {
  unit: "kg" | "lb";
  totals: {
    workouts: number;
    sets: number;
    volume: number;
    volumeUnit: string;
  };
  dailySetTarget: number;
  todaySets: number;
  onToggleUnit: () => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <LinearGradient
      colors={
        isDark
          ? ["#0D1221", "#0D1221", withAlpha(colors.primary, 0.22)]
          : ["#F6FAFF", "#EEF4FF", withAlpha(colors.primary, 0.18)]
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
      <BlurView
        intensity={isDark ? 20 : 10}
        tint={isDark ? "dark" : "light"}
        style={{ padding: 14 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
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
              <Ionicons
                name="barbell-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <View>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                Dashboard
              </Text>
              <Text
                style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}
              >
                Workouts
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onToggleUnit}
            hitSlop={8}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              Unit: {unit.toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Metric value={totals.workouts} label="Workouts" />
          <Metric value={totals.sets} label="Sets" />
          <Metric
            value={totals.volume}
            label={`Volume (${totals.volumeUnit})`}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Metric
            value={dailySetTarget}
            label={
              todaySets >= dailySetTarget ? "Target ✅" : "Target sets/day"
            }
          />
          <Metric value={todaySets} label="Sets today" />
        </View>
      </BlurView>
    </LinearGradient>
  );
}
