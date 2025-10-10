import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Pill from "../ui/Pill";
import Field from "../ui/Field";
import { Ionicons } from "@expo/vector-icons";

export default function DietCookingCard({
  dietType,
  setDietType,
  allergies,
  setAllergies,
  dislikes,
  setDislikes,
  cookMins,
  setCookMins,
  cookSkill,
  setCookSkill,
  budgetPerMeal,
  setBudgetPerMeal,
}: any) {
  const { colors } = useTheme();

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
          <Ionicons name="leaf-outline" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>
            Diet & Cooking
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Preferences, time & budget
          </Text>
        </View>
      </View>

      <Glass>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          Diet type
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {(
            [
              "balanced",
              "mediterranean",
              "high-protein",
              "vegetarian",
              "vegan",
              "keto",
            ] as const
          ).map((v) => (
            <Pill
              key={v}
              active={dietType === v}
              onPress={() => setDietType(v)}
            >
              {v.replace("-", " ")}
            </Pill>
          ))}
        </View>
      </Glass>

      <Glass style={{ gap: 10 }}>
        <Field
          label="Allergies / intolerances"
          value={allergies}
          onChangeText={setAllergies}
          placeholder="comma separated (e.g., peanuts, lactose)"
        />
        <Field
          label="Dislikes"
          value={dislikes}
          onChangeText={setDislikes}
          placeholder="comma separated"
        />
      </Glass>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Glass style={{ flex: 1 }}>
          <Field
            label="Cooking time"
            value={cookMins}
            onChangeText={setCookMins}
            placeholder="minutes"
            inputMode="numeric"
          />
        </Glass>
        <Glass style={{ flex: 1 }}>
          <Field
            label="Budget per meal"
            value={budgetPerMeal}
            onChangeText={setBudgetPerMeal}
            placeholder="USD"
            inputMode="decimal"
          />
        </Glass>
      </View>

      <Glass>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          Cooking skill
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {(["beginner", "intermediate", "advanced"] as const).map((s) => (
            <Pill
              key={s}
              active={cookSkill === s}
              onPress={() => setCookSkill(s)}
            >
              {s}
            </Pill>
          ))}
        </View>
      </Glass>
    </Card>
  );
}
