import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "./GlassCard";
import type { FoodEntry } from "@/services/nutrition";

// ✅ NEW
import MealHealthScoreIndicator from "@/components/nutrition/uiNew/MealHealthScoreIndicator";

export type MealKey = "breakfast" | "lunch" | "dinner" | "snacks";

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

const MEAL_META: Record<
  MealKey,
  { icon: any; label: string; gradA: string; gradB: string }
> = {
  breakfast: {
    icon: "sunny-outline",
    label: "Breakfast",
    gradA: "#7dd3fc",
    gradB: "#a78bfa",
  },
  lunch: {
    icon: "pizza-outline",
    label: "Lunch",
    gradA: "#34d399",
    gradB: "#60a5fa",
  },
  dinner: {
    icon: "restaurant-outline",
    label: "Dinner",
    gradA: "#fca5a5",
    gradB: "#f59e0b",
  },
  snacks: {
    icon: "ice-cream-outline",
    label: "Snacks",
    gradA: "#93c5fd",
    gradB: "#22c55e",
  },
};

export function MealCard({
  meal,
  items,
  totals,
  colors,
  isDark,
  onPressAdd,
  onPressItem,
  onDeleteItem,
}: {
  meal: MealKey;
  items: FoodEntry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  colors: any;
  isDark: boolean;
  onPressAdd: () => void;
  onPressItem: (it: FoodEntry) => void;
  onDeleteItem: (it: FoodEntry) => void;
}) {
  const meta = MEAL_META[meal];

  const subtitle = useMemo(() => {
    if (!items.length) return "No items yet";
    const kcal = Math.round(totals.calories);
    return `${items.length} item${
      items.length === 1 ? "" : "s"
    } • ${kcal} kcal`;
  }, [items.length, totals.calories]);

  // ✅ NEW: aggregate optional fields from items (so the score + confidence can actually change)
  const extras = useMemo(() => {
    let sugarG: number | undefined = undefined;
    let fiberG: number | undefined = undefined;

    let sugarSum = 0;
    let fiberSum = 0;

    let hasSugar = false;
    let hasFiber = false;

    for (const it of items) {
      const s = (it as any)?.sugar;
      const f = (it as any)?.fiber;

      if (Number.isFinite(Number(s))) {
        hasSugar = true;
        sugarSum += Number(s);
      }
      if (Number.isFinite(Number(f))) {
        hasFiber = true;
        fiberSum += Number(f);
      }
    }

    if (hasSugar) sugarG = sugarSum;
    if (hasFiber) fiberG = fiberSum;

    return { sugarG, fiberG };
  }, [items]);

  // ✅ FIX: depend on the actual numeric values (not the totals object reference),
  // and include optional sugar/fiber when available.
  const mealScoreInput = useMemo(
    () => ({
      calories: Number(totals.calories || 0) || 0,
      proteinG: Number(totals.protein || 0) || 0,
      carbsG: Number(totals.carbs || 0) || 0,
      fatG: Number(totals.fat || 0) || 0,
      sugarG: extras.sugarG,
      fiberG: extras.fiberG,
    }),
    [
      totals.calories,
      totals.protein,
      totals.carbs,
      totals.fat,
      extras.sugarG,
      extras.fiberG,
    ]
  );

  // ✅ FIX: force the indicator to re-mount when inputs change (covers internal memo/state bugs)
  const indicatorKey = useMemo(() => {
    const c = Math.round(Number(totals.calories || 0) || 0);
    const p = Math.round(Number(totals.protein || 0) || 0);
    const cb = Math.round(Number(totals.carbs || 0) || 0);
    const f = Math.round(Number(totals.fat || 0) || 0);
    const s = extras.sugarG != null ? Math.round(extras.sugarG) : "na";
    const fi = extras.fiberG != null ? Math.round(extras.fiberG) : "na";
    return `mealScore:${c}:${p}:${cb}:${f}:${s}:${fi}`;
  }, [
    totals.calories,
    totals.protein,
    totals.carbs,
    totals.fat,
    extras.sugarG,
    extras.fiberG,
  ]);

  return (
    <View
      style={{
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <LinearGradient
        colors={[withAlpha(meta.gradA, 0.26), withAlpha(meta.gradB, 0.12)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 14 }}
      >
        {/* Header */}
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
                width: 40,
                height: 40,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: withAlpha(colors.card, 0.45),
                borderWidth: 1,
                borderColor: withAlpha(colors.border, 0.9),
              }}
            >
              <Ionicons name={meta.icon} size={18} color={colors.text} />
            </View>
            <View style={{ gap: 2 }}>
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
              >
                {meta.label}
              </Text>
              <Text
                style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}
              >
                {subtitle}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add to ${meta.label}`}
            onPress={onPressAdd}
            hitSlop={10}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              backgroundColor: withAlpha(colors.primary, 0.14),
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="add" size={18} color={colors.text} />
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 13 }}
            >
              Add
            </Text>
          </Pressable>
        </View>

        {/* ✅ Meal-level Health Score (NEW) */}
        {items.length > 0 ? (
          <MealHealthScoreIndicator
            key={indicatorKey}
            input={mealScoreInput}
            variant="pill"
            compact
            style={{ marginTop: 12 }}
          />
        ) : null}

        {/* Empty / List */}
        <View style={{ marginTop: 12, gap: 8 }}>
          {items.length === 0 ? (
            <GlassCard colors={colors} isDark={isDark} radius={16} pad={12}>
              <Text
                style={{
                  color: colors.muted,
                  fontWeight: "800",
                  lineHeight: 18,
                }}
              >
                Tap “Add” to log. Recents can be one tap.
              </Text>
            </GlassCard>
          ) : (
            items.slice(0, 10).map((it) => (
              <GlassCard
                key={it.id}
                colors={colors}
                isDark={isDark}
                radius={16}
                pad={12}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${it.name}`}
                  onPress={() => onPressItem(it)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "900",
                        fontSize: 14,
                      }}
                      numberOfLines={1}
                    >
                      {it.name}
                    </Text>
                    <Text
                      style={{
                        color: colors.muted,
                        fontWeight: "800",
                        fontSize: 12,
                      }}
                    >
                      {Math.round(Number(it.qty || 1))} {it.unit || "serving"} •{" "}
                      {Math.round(Number(it.calories || 0))} kcal
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: withAlpha(colors.primary, 0.12),
                        borderWidth: 1,
                        borderColor: withAlpha(colors.primary, 0.25),
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "900",
                          fontSize: 12,
                        }}
                      >
                        P {Math.round(Number(it.protein || 0))}g
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${it.name}`}
                      onPress={() => onDeleteItem(it)}
                      hitSlop={10}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: withAlpha("#ef4444", 0.12),
                        borderWidth: 1,
                        borderColor: withAlpha("#ef4444", 0.25),
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.text}
                      />
                    </Pressable>
                  </View>
                </Pressable>
              </GlassCard>
            ))
          )}
        </View>
      </LinearGradient>
    </View>
  );
}
