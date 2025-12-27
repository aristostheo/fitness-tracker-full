import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { NutritionColors } from "./NutritionTheme";
import type { MealItem } from "./NutritionTypes";
import { alpha, formatTimeFromISO } from "./utils";

type Props = {
  colors: NutritionColors;
  isDark: boolean;
  visible: boolean;
  meals: MealItem[];
  onClose: () => void;
};

export default function HistorySheet({
  colors,
  isDark,
  visible,
  meals,
  onClose,
}: Props) {
  const sorted = useMemo(
    () => [...meals].sort((a, b) => (a.timeISO < b.timeISO ? 1 : -1)),
    [meals]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close history"
      >
        <Pressable
          style={[
            styles.sheet,
            {
              borderColor: alpha(colors.text, 0.1),
              backgroundColor: isDark
                ? alpha(colors.card, 0.18)
                : alpha(colors.card, 0.94),
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: colors.text }]}>
              Today’s history
            </Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: alpha(colors.card, isDark ? 0.1 : 0.7) },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          {sorted.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  borderColor: alpha(colors.text, 0.1),
                  backgroundColor: alpha(colors.card, isDark ? 0.08 : 0.7),
                },
              ]}
            >
              <Ionicons
                name="leaf-outline"
                size={18}
                color={alpha(colors.text, 0.75)}
              />
              <Text
                style={[styles.emptyText, { color: alpha(colors.text, 0.75) }]}
              >
                Nothing logged yet. When you do, you’ll see a calm timeline
                here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={sorted}
              keyExtractor={(m) => m.id}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.row,
                    {
                      borderColor: alpha(colors.text, 0.1),
                      backgroundColor: alpha(colors.card, isDark ? 0.08 : 0.7),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: alpha(colors.primary, 0.9) },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.name, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.meta, { color: alpha(colors.text, 0.65) }]}
                      numberOfLines={1}
                    >
                      {item.mealType} • {Math.round(item.macros.calories)} kcal
                      • {formatTimeFromISO(item.timeISO)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.kcal, { color: alpha(colors.text, 0.75) }]}
                  >
                    {Math.round(item.macros.calories)}
                  </Text>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    padding: 16,
    justifyContent: "flex-end",
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(18,20,25,0.62)",
    padding: 14,
    maxHeight: "75%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  emptyText: { flex: 1, fontSize: 13, fontWeight: "700" },

  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  name: { fontSize: 14, fontWeight: "900" },
  meta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  kcal: { fontSize: 12, fontWeight: "900" },
});
