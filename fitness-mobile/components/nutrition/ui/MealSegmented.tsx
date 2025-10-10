import React from "react";
import { View, Pressable, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import { MEALS, Meal } from "@/app/(tabs)/nutrition";
import withAlpha from "../utils/withAlpha";

export default function MealSegmented({
  value,
  onChange,
}: {
  value: Meal;
  onChange: (m: Meal) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        padding: 4,
        flexDirection: "row",
        gap: 6,
        backgroundColor: colors.card,
      }}
    >
      {MEALS.map((m) => {
        const active = value === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active
                ? withAlpha(colors.primary, 0.18)
                : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active
                ? withAlpha(colors.primary, 0.35)
                : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.primary : colors.text,
                fontWeight: active ? "700" : "500",
                textTransform: "capitalize",
              }}
            >
              {m}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
