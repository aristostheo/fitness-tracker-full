import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Field from "../ui/Field";
import { Ionicons } from "@expo/vector-icons";

type Meal = {
  label: "breakfast" | "lunch" | "dinner" | "snacks";
  time?: string;
};

export default function MealScheduleCard({
  meals,
  setMeals,
}: {
  meals: Meal[];
  setMeals: (m: Meal[]) => void;
}) {
  const { colors } = useTheme();

  const Row = ({ children, style }: any) => (
    <View
      style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, style]}
    >
      {children}
    </View>
  );

  const Glass = ({ children, style }: any) => (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <Card
      style={{
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Ionicons name="alarm-outline" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>
            Meal Schedule
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Used for smart reminders
          </Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {meals.map((m, idx) => (
          <Glass key={m.label}>
            <Row>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "800",
                    textTransform: "capitalize",
                  }}
                >
                  {m.label[0]}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    textTransform: "capitalize",
                    fontWeight: "700",
                  }}
                >
                  {m.label}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  Preferred time
                </Text>
              </View>

              <View style={{ width: 120 }}>
                <Field
                  label=""
                  value={m.time || ""}
                  onChangeText={(t: string) => {
                    const arr = meals.slice();
                    arr[idx] = { ...arr[idx], time: t };
                    setMeals(arr);
                  }}
                  placeholder="HH:MM"
                />
              </View>
            </Row>
          </Glass>
        ))}
      </View>
    </Card>
  );
}
