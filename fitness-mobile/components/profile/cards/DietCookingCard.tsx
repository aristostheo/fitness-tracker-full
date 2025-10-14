// components/profile/cards/DietCookingCard.tsx
import React, { memo } from "react";
import { View, Text } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Pill from "../ui/Pill";
import Field from "../ui/Field";
import { Ionicons } from "@expo/vector-icons";

type DietType =
  | "balanced"
  | "mediterranean"
  | "high-protein"
  | "vegetarian"
  | "vegan"
  | "keto";

type Skill = "beginner" | "intermediate" | "advanced";

/** Stable glass */
const GlassBox = memo(function GlassBox({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const { colors } = useTheme();
  return (
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
});

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
}: {
  dietType: DietType;
  setDietType: (v: DietType) => void; // ✅ match the union type
  allergies: string | undefined;
  setAllergies: (s: string) => void;
  dislikes: string | undefined;
  setDislikes: (s: string) => void;
  cookMins: string | number | undefined;
  setCookMins: (s: string) => void;
  cookSkill: Skill;
  setCookSkill: (v: Skill) => void;
  budgetPerMeal: string | number | undefined;
  setBudgetPerMeal: (s: string) => void;
}) {
  const { colors } = useTheme();

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
      {/* Header */}
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

      {/* Diet type */}
      <GlassBox>
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
            ] as DietType[]
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
      </GlassBox>

      {/* Allergies / Dislikes */}
      <GlassBox style={{ gap: 10 }}>
        <Field
          label="Allergies / intolerances"
          value={allergies ?? ""}
          onChangeText={setAllergies}
          placeholder="comma separated (e.g., peanuts, lactose)"
          style={{ width: "100%" }}
          inputStyle={{ paddingVertical: 10 }}
        />
        <Field
          label="Dislikes"
          value={dislikes ?? ""}
          onChangeText={setDislikes}
          placeholder="comma separated"
          style={{ width: "100%" }}
          inputStyle={{ paddingVertical: 10 }}
        />
      </GlassBox>

      {/* Time / Budget */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <GlassBox style={{ flex: 1 }}>
          <Field
            label="Cooking time"
            value={cookMins == null ? "" : String(cookMins)}
            onChangeText={setCookMins}
            placeholder="minutes"
            inputMode="numeric"
            style={{ width: "100%" }}
            inputStyle={{ paddingVertical: 10 }}
          />
        </GlassBox>
        <GlassBox style={{ flex: 1 }}>
          <Field
            label="Budget per meal"
            value={budgetPerMeal == null ? "" : String(budgetPerMeal)}
            onChangeText={setBudgetPerMeal}
            placeholder="USD"
            inputMode="decimal"
            style={{ width: "100%" }}
            inputStyle={{ paddingVertical: 10 }}
          />
        </GlassBox>
      </View>

      {/* Skill */}
      <GlassBox>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          Cooking skill
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {(["beginner", "intermediate", "advanced"] as Skill[]).map((s) => (
            <Pill
              key={s}
              active={cookSkill === s}
              onPress={() => setCookSkill(s)}
            >
              {s}
            </Pill>
          ))}
        </View>
      </GlassBox>
    </Card>
  );
}
