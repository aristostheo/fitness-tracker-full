// components/nutrition/Header.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router"; // ⬅️ NEW
import { useTheme } from "@/content/ThemeProvider";
import Card from "@/components/Card";
import Field from "./ui/Field";
import Metric from "./ui/Metric";
import MacroBar from "./ui/MacroBar";
import withAlpha from "./utils/withAlpha";

export default function Header({
  date,
  onChangeDate,
  totals,
}: {
  date: string;
  onChangeDate: (v: string) => void;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    net: number;
  };
}) {
  const { colors, isDark } = useTheme();

  return (
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
      <BlurView
        intensity={isDark ? 20 : 10}
        tint={isDark ? "dark" : "light"}
        style={{ padding: 14 }}
      >
        {/* Top row: title + date + quick calendar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
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
                name="fast-food-outline"
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
                Nutrition
              </Text>
            </View>
          </View>

          {/* Date input + Calendar button column */}
          <View style={{ width: 170 }}>
            <Field
              icon="calendar-outline"
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={onChangeDate}
              autoCapitalize="none"
            />
            {/* NEW: small calendar link under the date field */}
            <Link href="/(modals)/full-calendar" asChild>
              <Pressable
                hitSlop={8}
                style={{
                  alignSelf: "flex-end",
                  marginTop: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.35),
                  backgroundColor: withAlpha(colors.primary, 0.12),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={colors.primary}
                />
                <Text style={{ color: colors.primary, fontWeight: "800" }}>
                  Calendar
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Metric value={totals.calories} label="Calories" suffix="kcal" />
          <Metric value={totals.protein} label="Protein" suffix="g" />
          <Metric value={totals.net} label="Net" suffix="kcal" />
        </View>

        <MacroBar
          protein={Math.max(0, totals.protein)}
          carbs={Math.max(0, totals.carbs)}
          fat={Math.max(0, totals.fat)}
        />
      </BlurView>
    </LinearGradient>
  );
}
