import React, { useMemo, useState } from "react";
import { View, Text, Pressable, LayoutAnimation, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "./GlassCard";
import type { FoodEntry } from "@/services/nutrition";
import { computeMealHealthScore } from "@/lib/mealHealthScore";

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
  suggestions = [],
}: {
  meal: MealKey;
  items: FoodEntry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  colors: any;
  isDark: boolean;
  onPressAdd: () => void;
  onPressItem: (it: FoodEntry) => void;
  onDeleteItem: (it: FoodEntry) => void;
  suggestions?: string[];
}) {
  const meta = MEAL_META[meal];
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [scoreHintOpen, setScoreHintOpen] = useState(false);

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
    let satFatG: number | undefined = undefined;
    let sodiumMg: number | undefined = undefined;
    let veggieFruitServings: number | undefined = undefined;

    let sugarSum = 0;
    let fiberSum = 0;
    let satFatSum = 0;
    let sodiumSum = 0;
    let veggieFruitSum = 0;

    let hasSugar = false;
    let hasFiber = false;
    let hasSatFat = false;
    let hasSodium = false;
    let hasVeg = false;

    for (const it of items) {
      const s = (it as any)?.sugar;
      const f = (it as any)?.fiber;
      const sf = (it as any)?.satFat;
      const sodium = (it as any)?.sodium ?? (it as any)?.sodiumMg;
      const veg = (it as any)?.veggieFruitServings;

      if (Number.isFinite(Number(s))) {
        hasSugar = true;
        sugarSum += Number(s);
      }
      if (Number.isFinite(Number(f))) {
        hasFiber = true;
        fiberSum += Number(f);
      }
      if (Number.isFinite(Number(sf))) {
        hasSatFat = true;
        satFatSum += Number(sf);
      }
      if (Number.isFinite(Number(sodium))) {
        hasSodium = true;
        sodiumSum += Number(sodium);
      }
      if (Number.isFinite(Number(veg))) {
        hasVeg = true;
        veggieFruitSum += Number(veg);
      }
    }

    if (hasSugar) sugarG = sugarSum;
    if (hasFiber) fiberG = fiberSum;
    if (hasSatFat) satFatG = satFatSum;
    if (hasSodium) sodiumMg = sodiumSum;
    if (hasVeg) veggieFruitServings = veggieFruitSum;

    return { sugarG, fiberG, satFatG, sodiumMg, veggieFruitServings };
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
      satFatG: extras.satFatG,
      sodiumMg: extras.sodiumMg,
      veggieFruitServings: extras.veggieFruitServings,
    }),
    [
      totals.calories,
      totals.protein,
      totals.carbs,
      totals.fat,
      extras.sugarG,
      extras.fiberG,
      extras.satFatG,
      extras.sodiumMg,
      extras.veggieFruitServings,
    ]
  );

  const mealHealth = useMemo(
    () => computeMealHealthScore(mealScoreInput),
    [mealScoreInput]
  );
  const mealHint = useMemo(
    () => buildMealQualityHint(mealScoreInput, mealHealth),
    [mealScoreInput, mealHealth]
  );
  const scoreColor = getScoreColor(mealHealth.colorKey, isDark);

  function isMealBundle(item: FoodEntry) {
    return (
      item.entryKind === "meal" &&
      Array.isArray(item.items) &&
      item.items.length > 0
    );
  }

  function toggleExpanded(id: string) {
    if (Platform.OS === "ios") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedIds((curr) => ({
      ...curr,
      [id]: !curr[id],
    }));
  }

  return (
    <View
      style={{
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.28),
      }}
    >
      <LinearGradient
        colors={[withAlpha(meta.gradA, 0.11), withAlpha(meta.gradB, 0.03)]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={{ padding: 14, gap: 8 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: withAlpha(colors.card, 0.2),
                borderWidth: 1,
                borderColor: withAlpha(colors.border, 0.34),
              }}
            >
              <Ionicons name={meta.icon} size={18} color={colors.text} />
            </View>
            <View style={{ gap: 3, flex: 1 }}>
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}
              >
                {meta.label}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <Text
                  style={{
                    color: withAlpha(colors.text, 0.66),
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  {subtitle}
                </Text>
                {items.length > 0 ? (
                  <>
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 99,
                        backgroundColor: withAlpha(colors.text, 0.28),
                      }}
                    />
	                    <Pressable
	                      accessibilityRole="button"
	                      accessibilityLabel={`Meal quality score ${mealHealth.score}. Show reason`}
	                      onPress={() => setScoreHintOpen((v) => !v)}
	                      style={{
	                        flexDirection: "row",
	                        alignItems: "center",
	                        gap: 6,
	                        minHeight: 34,
	                        paddingHorizontal: 9,
	                        borderRadius: 999,
	                        borderWidth: 1,
	                        borderColor: withAlpha(scoreColor, 0.38),
	                        backgroundColor: withAlpha(scoreColor, 0.14),
	                      }}
	                    >
	                      <Text
	                        style={{
	                          color: colors.text,
	                          fontWeight: "900",
	                          fontSize: 12.5,
	                        }}
	                      >
	                        {mealHealth.score}
	                      </Text>
	                      <Ionicons
	                        name="information-circle-outline"
	                        size={14}
	                        color={withAlpha(colors.text, 0.8)}
	                      />
	                    </Pressable>
	                  </>
	                ) : null}
              </View>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add to ${meta.label}`}
            onPress={onPressAdd}
            hitSlop={10}
            style={({ pressed }) => ({
              paddingVertical: 9,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.16),
              backgroundColor: withAlpha(colors.primary, 0.08),
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Ionicons name="add" size={18} color={colors.text} />
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 13 }}
            >
              Add
            </Text>
          </Pressable>
        </View>

	        {/* Empty / List */}
	        <View style={{ marginTop: 6, gap: 8 }}>
	          {items.length > 0 && scoreHintOpen ? (
	            <GlassCard
	              colors={colors}
	              isDark={isDark}
	              radius={16}
	              pad={12}
	              style={{
	                borderColor: withAlpha(scoreColor, 0.3),
	                backgroundColor: withAlpha(scoreColor, isDark ? 0.1 : 0.06),
	              }}
	            >
	              <Text
	                style={{
	                  color: withAlpha(colors.text, isDark ? 0.84 : 0.72),
	                  fontWeight: "800",
	                  fontSize: 12,
	                  lineHeight: 17,
	                }}
	                numberOfLines={2}
	              >
	                {mealHint}
	              </Text>
	            </GlassCard>
	          ) : null}
	          {items.length === 0 ? (
	            <GlassCard
	              colors={colors}
	              isDark={isDark}
	              radius={18}
	              pad={12}
	              style={{ borderColor: withAlpha(colors.border, 0.28) }}
	            >
	              <View style={{ gap: 10 }}>
	                <Text
	                  style={{
	                    color: colors.text,
	                    fontWeight: "900",
	                    fontSize: 13,
	                  }}
	                >
	                  Smart ideas for {meta.label.toLowerCase()}
	                </Text>
	                {suggestions.slice(0, 3).map((s) => (
	                  <View
	                    key={s}
	                    style={{
	                      flexDirection: "row",
	                      gap: 8,
	                      alignItems: "flex-start",
	                    }}
	                  >
	                    <Ionicons
	                      name="sparkles-outline"
	                      size={14}
	                      color={withAlpha(colors.primary, 0.95)}
	                      style={{ marginTop: 2 }}
	                    />
	                    <Text
	                      style={{
	                        flex: 1,
	                        color: withAlpha(colors.text, isDark ? 0.84 : 0.72),
	                        fontWeight: "800",
	                        lineHeight: 18,
	                      }}
	                    >
	                      {s}
	                    </Text>
	                  </View>
	                ))}
	              </View>
	            </GlassCard>
	          ) : (
            items.slice(0, 10).map((it) => {
              const bundle = isMealBundle(it);
              const expanded = !!expandedIds[it.id];
              const bundleItems = bundle ? it.items || [] : [];

              return (
                <GlassCard
                  key={it.id}
                  colors={colors}
                  isDark={isDark}
                  radius={18}
                  pad={12}
                  style={{
                    borderColor: withAlpha(colors.border, 0.26),
                    backgroundColor: withAlpha(colors.card, 0.62),
                  }}
                >
	                      <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={bundle ? `Expand ${it.name}` : `Edit ${it.name}`}
                    onPress={() => {
                      if (bundle) {
                        toggleExpanded(it.id);
                        return;
                      }
                      onPressItem(it);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                      opacity: pressed ? 0.94 : 1,
                    })}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "900",
                          fontSize: 15,
                          flexShrink: 1,
                        }}
                        numberOfLines={1}
                      >
                        {it.name}
                      </Text>
                      <Text
                        style={{
                          color: withAlpha(colors.text, 0.62),
                          fontWeight: "800",
                          fontSize: 11.5,
                          marginTop: 3,
                        }}
                        numberOfLines={1}
                      >
                        {bundle
                          ? `${bundleItems.length} foods • ${Math.round(
                              Number(it.calories || 0)
                            )} kcal • P ${Math.round(Number(it.protein || 0))}g`
                          : `${Math.round(Number(it.qty || 1))} ${
                              it.unit || "serving"
                            } • ${Math.round(Number(it.calories || 0))} kcal • P ${Math.round(
                              Number(it.protein || 0)
                            )}g`}
                      </Text>
                      {bundle ? (
                        <Text
                          style={{
                            color: withAlpha(colors.text, 0.52),
                            fontWeight: "700",
                            fontSize: 12,
                            lineHeight: 17,
                            marginTop: 6,
                          }}
                          numberOfLines={expanded ? undefined : 1}
                        >
                          {bundleItems.map((child) => child.name).join(", ")}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "flex-start",
                        marginTop: 2,
                      }}
                    >
                      {bundle ? (
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 10,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: withAlpha(colors.card, 0.12),
                          }}
                        >
                          <Ionicons
                            name={expanded ? "chevron-up" : "chevron-down"}
                            size={15}
                            color={withAlpha(colors.text, 0.72)}
                          />
                        </View>
                      ) : null}

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${it.name}`}
                        onPress={() => onDeleteItem(it)}
	                        hitSlop={12}
	                        style={({ pressed }) => ({
	                          width: 44,
	                          height: 44,
	                          borderRadius: 14,
	                          alignItems: "center",
	                          justifyContent: "center",
	                          backgroundColor: withAlpha("#ef4444", 0.1),
	                          opacity: pressed ? 0.8 : 1,
	                        })}
	                      >
	                        <Ionicons
	                          name="trash-outline"
	                          size={18}
	                          color={withAlpha(colors.text, 0.78)}
	                        />
                      </Pressable>
                    </View>
                  </Pressable>

                  {bundle && expanded ? (
                    <View
                      style={{
                        marginTop: 14,
                        gap: 10,
                      }}
                    >
                      {bundleItems.map((child, idx) => (
                        <View
                          key={`${it.id}:${child.name}:${idx}`}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 12,
                          }}
                        >
                          <Text
                            style={{
                              flex: 1,
                              color: withAlpha(colors.text, 0.9),
                              fontWeight: "800",
                              fontSize: 12,
                              lineHeight: 17,
                            }}
                            numberOfLines={1}
                          >
                            {child.name}
                          </Text>
                          <Text
                            style={{
                              color: withAlpha(colors.text, 0.58),
                              fontWeight: "800",
                              fontSize: 11.5,
                              minWidth: 108,
                              textAlign: "right",
                            }}
                            numberOfLines={1}
                          >
                            {Math.round(Number(child.qty || 0))} {child.unit} •{" "}
                            {Math.round(Number(child.calories || 0))} kcal
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </GlassCard>
              );
            })
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

function buildMealQualityHint(
  input: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG?: number;
    sugarG?: number;
    satFatG?: number;
    sodiumMg?: number;
    veggieFruitServings?: number;
  },
  result: ReturnType<typeof computeMealHealthScore>
) {
  const notes: string[] = [];
  const proteinPer100 = input.calories > 0 ? (input.proteinG * 100) / input.calories : 0;
  const fiberPer100 = input.calories > 0 ? ((input.fiberG ?? 0) * 100) / input.calories : 0;
  const sugarPer100 = input.calories > 0 ? ((input.sugarG ?? 0) * 100) / input.calories : 0;

  if (proteinPer100 < 2) notes.push("Low protein. Add 30g+ to improve.");
  if (input.fiberG == null) notes.push("Fiber unknown. Add plants or whole grains.");
  else if (fiberPer100 < 1) notes.push("Low fiber. Add fruit, beans, or vegetables.");
  if (input.sugarG != null && sugarPer100 > 3) notes.push("High sugar. Pair with protein.");
  if ((input.sodiumMg ?? 0) > 900) notes.push("High sodium. Choose a lower-salt side.");
  if ((input.veggieFruitServings ?? 0) < 1) notes.push("No produce logged. Add fruit or vegetables.");

  if (!notes.length) {
    notes.push("Solid balance. Keep this pattern.");
  }

  return `Score ${result.score} — ${notes[0]}`;
}

function getScoreColor(colorKey: string, isDark: boolean) {
  if (colorKey === "green") return isDark ? "#4ADE80" : "#16A34A";
  if (colorKey === "mint") return isDark ? "#5EEAD4" : "#0D9488";
  if (colorKey === "red") return isDark ? "#F87171" : "#DC2626";
  return isDark ? "#FACC15" : "#D97706";
}
