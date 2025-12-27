import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import type { NutritionColors } from "./NutritionTheme";
import type { DayLog, MealItem, MealType } from "./NutritionTypes";
import { GlassCard, softShadow } from "./Glass";
import { alpha, formatTimeFromISO, sumMacros } from "./utils";

type Props = {
  colors: NutritionColors;
  isDark: boolean;
  day: DayLog;
  onAddPress: (type?: MealType) => void;
  onOpenHistory: () => void;
  onDeleteMeal: (id: string) => void;
};

const SECTION: { key: MealType; title: string; icon: string }[] = [
  { key: "breakfast", title: "Breakfast", icon: "sunny" },
  { key: "lunch", title: "Lunch", icon: "restaurant" },
  { key: "dinner", title: "Dinner", icon: "moon" },
  { key: "snacks", title: "Snacks", icon: "sparkles" },
];

export default function MealSection({
  colors,
  isDark,
  day,
  onAddPress,
  onOpenHistory,
  onDeleteMeal,
}: Props) {
  const grouped = useMemo(() => {
    const map: Record<MealType, MealItem[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    };
    for (const m of day.meals) map[m.mealType].push(m);
    return map;
  }, [day.meals]);

  return (
    <View style={{ marginTop: 14 }}>
      <View style={[styles.headerRow, { paddingHorizontal: 16 }]}>
        <Text style={[styles.hTitle, { color: colors.text }]}>Meals</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onOpenHistory();
            }}
            accessibilityRole="button"
            accessibilityLabel="Open nutrition history"
            style={({ pressed }) => [
              styles.smallBtn,
              {
                borderColor: alpha(colors.text, 0.14),
                backgroundColor: alpha(colors.card, isDark ? 0.1 : 0.65),
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={alpha(colors.text, 0.85)}
            />
            <Text style={[styles.smallBtnText, { color: colors.text }]}>
              History
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAddPress();
            }}
            accessibilityRole="button"
            accessibilityLabel="Add meal"
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {SECTION.map((s, idx) => {
        const list = grouped[s.key];
        const totals = sumMacros(list);

        return (
          <MotiView
            key={s.key}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 420, delay: 40 + idx * 35 }}
          >
            <GlassCard
              colors={colors}
              isDark={isDark}
              style={[
                { marginHorizontal: 16, marginTop: 12 },
                softShadow(isDark),
              ]}
            >
              <View style={styles.sectionTop}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={[
                      styles.iconBubble,
                      {
                        backgroundColor: alpha(colors.primary, 0.14),
                        borderColor: alpha(colors.primary, 0.25),
                      },
                    ]}
                  >
                    <Ionicons
                      name={s.icon as any}
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {s.title}
                    </Text>
                    <Text
                      style={[
                        styles.sectionSub,
                        { color: alpha(colors.text, 0.65) },
                      ]}
                    >
                      {Math.round(totals.calories)} kcal •{" "}
                      {Math.round(totals.protein)}P {Math.round(totals.carbs)}C{" "}
                      {Math.round(totals.fat)}F
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    onAddPress(s.key);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${s.title}`}
                  style={({ pressed }) => [
                    styles.plusBtn,
                    {
                      borderColor: alpha(colors.text, 0.14),
                      backgroundColor: alpha(colors.card, isDark ? 0.1 : 0.65),
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color={alpha(colors.text, 0.9)}
                  />
                </Pressable>
              </View>

              {list.length === 0 ? (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onAddPress(s.key);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${s.title}`}
                  style={({ pressed }) => [
                    styles.emptyRow,
                    {
                      borderColor: alpha(colors.text, 0.1),
                      backgroundColor: alpha(colors.bg, isDark ? 0.45 : 0.7),
                    },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={16}
                    color={alpha(colors.text, 0.75)}
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      { color: alpha(colors.text, 0.75) },
                    ]}
                  >
                    Log your {s.title.toLowerCase()} — quick and calm.
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={alpha(colors.text, 0.6)}
                  />
                </Pressable>
              ) : (
                <FlatList
                  data={list}
                  keyExtractor={(m) => m.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  renderItem={({ item }) => (
                    <MealRow
                      colors={colors}
                      isDark={isDark}
                      item={item}
                      onDelete={() => onDeleteMeal(item.id)}
                    />
                  )}
                  style={{ marginTop: 12 }}
                />
              )}
            </GlassCard>
          </MotiView>
        );
      })}
    </View>
  );
}

function MealRow({
  colors,
  isDark,
  item,
  onDelete,
}: {
  colors: NutritionColors;
  isDark: boolean;
  item: MealItem;
  onDelete: () => void;
}) {
  return (
    <View
      style={[
        styles.mealRow,
        {
          borderColor: alpha(colors.text, 0.1),
          backgroundColor: alpha(colors.bg, isDark ? 0.45 : 0.7),
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.mealName, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        <Text
          style={[styles.mealMeta, { color: alpha(colors.text, 0.65) }]}
          numberOfLines={1}
        >
          {item.amount ? `${item.amount} • ` : ""}
          {Math.round(item.macros.calories)} kcal •{" "}
          {Math.round(item.macros.protein)}P {Math.round(item.macros.carbs)}C{" "}
          {Math.round(item.macros.fat)}F • {formatTimeFromISO(item.timeISO)}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onDelete();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.name}`}
        style={({ pressed }) => [styles.trashBtn, pressed && { opacity: 0.7 }]}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color={alpha(colors.danger, 0.95)}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  addBtn: {
    height: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  smallBtn: {
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  smallBtnText: { fontWeight: "900", fontSize: 13, letterSpacing: 0.2 },

  sectionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: "900" },
  sectionSub: { marginTop: 2, fontSize: 12, fontWeight: "700" },

  plusBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyRow: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyText: { flex: 1, fontSize: 12, fontWeight: "700" },

  mealRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mealName: { fontSize: 14, fontWeight: "900", letterSpacing: -0.1 },
  mealMeta: { marginTop: 3, fontSize: 12, fontWeight: "700" },
  trashBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
