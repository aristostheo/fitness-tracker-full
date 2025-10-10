import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Field from "./ui/Field";
import MacroBar from "./ui/MacroBar";
import MealSegmented from "./ui/MealSegmented";

export default function AddFoodCard({
  form,
  setForm,
  preview,
  onSubmit,
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  preview: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar?: number;
    fiber?: number;
  };
  onSubmit: () => void;
}) {
  const { colors } = useTheme();

  const isWeightUnit = useMemo(() => {
    const u = (form.unit || "").toLowerCase();
    return u === "g" || u === "ml";
  }, [form.unit]);

  return (
    <Card style={{ gap: 12 }}>
      <Text style={{ fontWeight: "700", color: colors.text, fontSize: 16 }}>
        Add food
      </Text>

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <MealSegmented
          value={form.meal}
          onChange={(v) => setForm((f: any) => ({ ...f, meal: v }))}
        />
        <Field
          icon="restaurant-outline"
          placeholder="Food name"
          value={form.name}
          onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Field
          icon="pricetag-outline"
          placeholder="Qty"
          inputMode="numeric"
          value={form.qty}
          onChangeText={(v) => setForm((f: any) => ({ ...f, qty: v }))}
        />
        <Field
          icon="cube-outline"
          placeholder="Unit (g, ml, serving)"
          value={form.unit}
          onChangeText={(v) => setForm((f: any) => ({ ...f, unit: v }))}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Field
          icon="flame-outline"
          placeholder="Calories (base)"
          inputMode="numeric"
          value={form.calories}
          onChangeText={(v) => setForm((f: any) => ({ ...f, calories: v }))}
        />
        <Field
          icon="fitness-outline"
          placeholder="Protein g (base)"
          inputMode="numeric"
          value={form.protein}
          onChangeText={(v) => setForm((f: any) => ({ ...f, protein: v }))}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Field
          icon="leaf-outline"
          placeholder="Carbs g (base)"
          inputMode="numeric"
          value={form.carbs}
          onChangeText={(v) => setForm((f: any) => ({ ...f, carbs: v }))}
        />
        <Field
          icon="water-outline"
          placeholder="Fat g (base)"
          inputMode="numeric"
          value={form.fat}
          onChangeText={(v) => setForm((f: any) => ({ ...f, fat: v }))}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Field
          icon="ice-cream-outline"
          placeholder="Sugar g (base)"
          inputMode="numeric"
          value={form.sugar}
          onChangeText={(v) => setForm((f: any) => ({ ...f, sugar: v }))}
        />
        <Field
          icon="trail-sign-outline"
          placeholder="Fiber g (base)"
          inputMode="numeric"
          value={form.fiber}
          onChangeText={(v) => setForm((f: any) => ({ ...f, fiber: v }))}
        />
      </View>

      <View
        style={{
          padding: 12,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 6,
        }}
      >
        <Text style={{ color: colors.muted }}>
          Preview: {Math.round(preview.calories || 0)} kcal • P
          {Math.round(preview.protein || 0)} • C{Math.round(preview.carbs || 0)}{" "}
          • F{Math.round(preview.fat || 0)}
          {preview.sugar ? ` • Sugar ${Math.round(preview.sugar)}g` : ""}
          {preview.fiber ? ` • Fiber ${Math.round(preview.fiber)}g` : ""}
        </Text>
        <MacroBar
          protein={Number(preview.protein || 0)}
          carbs={Number(preview.carbs || 0)}
          fat={Number(preview.fat || 0)}
          compact
        />
        <Text style={{ color: colors.muted }}>
          {isWeightUnit
            ? "Enter base per 100 g/ml; we scale by qty/100."
            : "Enter base per 1 serving; we scale by qty."}
        </Text>
      </View>

      <Pressable onPress={onSubmit}>
        <LinearGradient
          colors={[colors.primary, "#16a34a"] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Add</Text>
        </LinearGradient>
      </Pressable>
    </Card>
  );
}
