// components/profile/premium/MealSchedulePremiumCard.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha } from "./ui";

export function MealSchedulePremiumCard(props: {
  mealsPerDay: string | number;
  setMealsPerDay: (v: string | number) => void;
  breakfastTime: string;
  setBreakfastTime: (v: string) => void;
  lastMealTime: string;
  setLastMealTime: (v: string) => void;
}) {
  const { colors, isDark } = useTheme();

  const Chip = ({ n }: { n: number }) => {
    const active = Number(props.mealsPerDay) === n;
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          props.setMealsPerDay(n);
        }}
        style={({ pressed }) => [
          styles.chip,
          {
            borderColor: active
              ? withAlpha(colors.primary, 0.35)
              : withAlpha(colors.border, 0.7),
            backgroundColor: active
              ? withAlpha(colors.primary, pressed ? 0.18 : 0.14)
              : withAlpha(
                  colors.card,
                  isDark ? (pressed ? 0.22 : 0.16) : pressed ? 0.75 : 0.6
                ),
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${n} meals per day`}
      >
        <Text style={{ color: colors.text, fontWeight: "900" }}>{n}</Text>
      </Pressable>
    );
  };

  return (
    <GlassCard>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="fast-food-outline" size={16} color={colors.text} />
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
          Meal schedule
        </Text>
        <Text style={{ color: colors.muted, marginLeft: "auto", fontSize: 12 }}>
          Timing, not pressure
        </Text>
      </View>

      <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 18 }}>
        This is for comfort and consistency — not rigid rules. It helps the app
        suggest calmer pacing.
      </Text>

      <View style={{ height: 12 }} />

      <Text style={{ color: colors.muted, fontSize: 12 }}>Meals per day</Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        {[2, 3, 4, 5].map((n) => (
          <Chip key={n} n={n} />
        ))}
      </View>

      <View style={{ height: 12 }} />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Field
          label="Breakfast"
          value={props.breakfastTime}
          onChange={props.setBreakfastTime}
          placeholder="08:00"
        />
        <Field
          label="Last meal"
          value={props.lastMealTime}
          onChange={props.setLastMealTime}
          placeholder="19:00"
        />
      </View>

      <View style={{ height: 12 }} />

      <View
        style={[
          styles.hint,
          {
            borderColor: withAlpha(colors.border, 0.7),
            backgroundColor: withAlpha(colors.card, isDark ? 0.16 : 0.65),
          },
        ]}
      >
        <Ionicons name="sparkles-outline" size={16} color={colors.text} />
        <Text style={{ color: colors.muted, lineHeight: 18, flex: 1 }}>
          Small win: aim for a{" "}
          <Text style={{ color: colors.text, fontWeight: "900" }}>
            consistent first meal window
          </Text>{" "}
          rather than perfect timing.
        </Text>
      </View>
    </GlassCard>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.field,
        {
          borderColor: withAlpha(colors.border, 0.7),
          backgroundColor: withAlpha(colors.card, isDark ? 0.16 : 0.65),
        },
      ]}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={withAlpha(colors.muted, 0.7)}
        style={{
          color: colors.text,
          fontWeight: "900",
          paddingVertical: Platform.OS === "ios" ? 8 : 6,
        }}
        accessibilityLabel={props.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hint: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
});
