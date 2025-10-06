// app/(tabs)/nutrition.tsx
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import Card from "../../components/Card";
import { useAuth } from "@/content/AuthContext";
import { useNutritionStreams } from "@/hooks/useNutritionStreams";
import {
  addFood,
  updateFood,
  deleteFood,
  addExercise,
  deleteExercise,
  type FoodEntry,
} from "@/services/nutrition";
import { scaleNutrients } from "@/utils/nutritionMath";
import { useTheme } from "@/content/ThemeProvider";
import { parseMealRemote } from "@/services/ai";

const pad = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;
type Meal = (typeof MEALS)[number];

function withAlpha(hex: string, a = 0.18) {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function NutritionScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO());
  const { foods, setFoods, exercise, setExercise, mealsMap, totals } =
    useNutritionStreams(user, date);

  /* ---------- Add form ---------- */
  const [form, setForm] = useState({
    meal: "breakfast" as Meal,
    name: "",
    qty: "1",
    unit: "serving",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    sugar: "",
    fiber: "",
  });

  const isWeightUnit =
    (form.unit || "").toLowerCase() === "g" ||
    (form.unit || "").toLowerCase() === "ml";

  const preview = useMemo(() => {
    const q = Number(form.qty) || 0;
    return scaleNutrients(
      {
        calories: Number(form.calories || 0),
        protein: Number(form.protein || 0),
        carbs: Number(form.carbs || 0),
        fat: Number(form.fat || 0),
        sugar: Number(form.sugar || 0),
        fiber: Number(form.fiber || 0),
      },
      q,
      form.unit
    );
  }, [form]);

  async function onAdd() {
    if (!user?.uid) {
      Alert.alert("Sign in required");
      return;
    }
    if (!form.name.trim()) {
      Alert.alert("Missing name", "Enter a food name.");
      return;
    }

    const entry = {
      date,
      meal: form.meal as FoodEntry["meal"],
      name: form.name.trim(),
      unit: form.unit || "serving",
      qty: Number(form.qty || 1),
      ...preview,
      source: "manual",
      createdAt: Date.now(),
    };

    const tempId = `temp-${Date.now()}`;
    setFoods((prev) => [{ id: tempId, ...entry }, ...prev]);

    try {
      const ref = await addFood(user.uid, { ...entry, createdAt: undefined });
      setFoods((prev) =>
        prev.map((f) => (f.id === tempId ? { ...f, id: ref.id } : f))
      );
    } catch (e) {
      console.warn(e);
      setFoods((prev) => prev.filter((f) => f.id !== tempId));
      Alert.alert("Couldn't add", (e as any)?.message || "Unknown error");
    }

    setForm((f) => ({
      ...f,
      name: "",
      qty: "1",
      unit: f.unit, // keep unit
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      sugar: "",
      fiber: "",
    }));
  }

  /* ---------- Edit state ---------- */
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    qty: "1",
    unit: "serving",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    sugar: "",
    fiber: "",
  });

  async function onSaveEdit() {
    if (!user?.uid || !editId || editId.startsWith("temp-")) {
      setEditId(null);
      return;
    }
    const scaled = scaleNutrients(
      {
        calories: Number(edit.calories || 0),
        protein: Number(edit.protein || 0),
        carbs: Number(edit.carbs || 0),
        fat: Number(edit.fat || 0),
        sugar: Number(edit.sugar || 0),
        fiber: Number(edit.fiber || 0),
      },
      Number(edit.qty || 1),
      edit.unit
    );

    const patch = {
      name: (edit.name || "").trim(),
      qty: Number(edit.qty || 1),
      unit: edit.unit || "serving",
      ...scaled,
    };

    const prev = foods;
    setFoods((curr) =>
      curr.map((f) => (f.id === editId ? { ...f, ...patch } : f))
    );
    setEditId(null);
    try {
      await updateFood(user.uid, editId, patch);
    } catch (e) {
      console.warn(e);
      setFoods(prev);
    }
  }

  async function onDeleteFood(id: string) {
    if (id.startsWith("temp-")) {
      setFoods((curr) => curr.filter((f) => f.id !== id));
      return;
    }
    const prev = foods;
    setFoods((curr) => curr.filter((f) => f.id !== id));
    try {
      await deleteFood(user!.uid, id);
    } catch (e) {
      console.warn(e);
      setFoods(prev);
    }
  }

  /* ---------- Exercise ---------- */
  const [exName, setExName] = useState("");
  const [exCalories, setExCalories] = useState("");
  async function addExerciseSubmit() {
    if (!user?.uid) return;
    const entry = {
      date,
      name: (exName || "").trim(),
      calories: Number(exCalories || 0),
      createdAt: Date.now(),
    };
    const tempId = "temp-x-" + Date.now();
    setExercise((prev) => [{ id: tempId, ...entry }, ...prev]);
    try {
      await addExercise(user.uid, { ...entry, createdAt: undefined });
    } catch (e) {
      console.warn(e);
    } finally {
      setExercise((prev) => prev.filter((x) => x.id !== tempId));
      setExName("");
      setExCalories("");
    }
  }
  async function deleteExerciseItem(id: string) {
    try {
      await deleteExercise(user!.uid, id);
    } catch (e) {
      console.warn(e);
    }
  }

  /* ---------- AI ---------- */
  const [aiDesc, setAiDesc] = useState("");
  const [aiQty, setAiQty] = useState("");
  const [aiUnit, setAiUnit] = useState("serving");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  function unscaleFromTotals(
    totals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      sugar?: number;
      fiber?: number;
    },
    qty: number,
    unit: string
  ) {
    const u = (unit || "").toLowerCase();
    const isWeight = u === "g" || u === "ml";
    const factor = isWeight ? qty / 100 : qty;
    const safe = Math.max(
      1,
      Number.isFinite(factor) && factor > 0 ? factor : 1
    );
    const n = (v: number | undefined) => Math.round((Number(v) || 0) / safe);
    return {
      calories: String(n(totals.calories)),
      protein: String(n(totals.protein)),
      carbs: String(n(totals.carbs)),
      fat: String(n(totals.fat)),
      sugar: String(n(totals.sugar)),
      fiber: String(n(totals.fiber)),
    };
  }

  async function onCalculateFromAI() {
    setAiError("");
    const raw = aiDesc.trim();
    if (!raw) {
      setAiError("Please describe your meal first.");
      return;
    }
    setAiLoading(true);
    try {
      const resp = await parseMealRemote(raw, {
        qty: aiQty ? Number(aiQty) : null,
        unit: aiUnit || null,
      });
      const qty = Number.isFinite(Number(resp.qty)) ? Number(resp.qty) : 1;
      const unit = resp.unit || "serving";
      const base = unscaleFromTotals(resp.totals, qty, unit);

      setForm((f) => ({
        ...f,
        name: resp.suggestedName || f.name || "Meal",
        qty: String(qty),
        unit,
        ...base,
      }));
    } catch (e: any) {
      console.error("AI parse failed:", e);
      setAiError(
        e?.message || "Couldn't parse that. Try adding portion details."
      );
    } finally {
      setAiLoading(false);
    }
  }

  /* ---------- Themed helpers ---------- */
  const inputBase = {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  } as const;
  const inputStyle = {
    ...inputBase,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
    color: colors.text,
  } as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* HERO HEADER */}
      <LinearGradient
        colors={
          isDark
            ? (["#0D1221", "#0D1221", withAlpha(colors.primary, 0.22)] as const)
            : (["#F6FAFF", "#EEF4FF", withAlpha(colors.primary, 0.18)] as const)
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        <BlurView
          intensity={isDark ? 20 : 10}
          tint={isDark ? "dark" : "light"}
          style={{ padding: 14 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  padding: 8,
                  borderRadius: 12,
                  backgroundColor: withAlpha(colors.primary, 0.15),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.35),
                }}
              >
                <Ionicons
                  name="fast-food-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Dashboard
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 22,
                    fontWeight: "800",
                  }}
                >
                  Nutrition
                </Text>
              </View>
            </View>

            <View style={{ width: 160 }}>
              <Field
                icon="calendar-outline"
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* quick metrics */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Metric
              value={Math.round(totals.calories)}
              label="Calories"
              suffix="kcal"
            />
            <Metric
              value={Math.round(totals.protein)}
              label="Protein"
              suffix="g"
            />
            <Metric value={Math.round(totals.net)} label="Net" suffix="kcal" />
          </View>

          {/* macro split bar */}
          <MacroBar
            protein={Math.max(0, totals.protein)}
            carbs={Math.max(0, totals.carbs)}
            fat={Math.max(0, totals.fat)}
          />
        </BlurView>
      </LinearGradient>

      {/* AI: Describe your meal */}
      <Card style={{ gap: 12 }}>
        <Text style={{ fontWeight: "700", color: colors.text, fontSize: 16 }}>
          Describe your meal
        </Text>

        <Field
          icon="create-outline"
          placeholder='e.g., "2 sandwiches with marble cheese, mortadella, genoa salami"'
          multiline
          value={aiDesc}
          onChangeText={setAiDesc}
          style={{ height: 96, alignItems: "flex-start", paddingTop: 12 }}
        />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="pricetag-outline"
            placeholder="Qty (optional)"
            inputMode="numeric"
            value={aiQty}
            onChangeText={setAiQty}
            style={{ flex: 0, width: 130 }}
          />
          <Field
            icon="cube-outline"
            placeholder="Unit (e.g., sandwich, g, cup)"
            value={aiUnit}
            onChangeText={setAiUnit}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={onCalculateFromAI}
              disabled={aiLoading || !aiDesc.trim()}
            >
              <LinearGradient
                colors={[colors.primary, "#16a34a"] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 44,
                  paddingHorizontal: 18,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>
                  {aiLoading ? "Analyzing…" : "Calculate macros"}
                </Text>
              </LinearGradient>
            </Pressable>
            {!!aiError && (
              <Text style={{ color: colors.danger, marginLeft: 6 }}>
                {aiError}
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>

        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Tip: Add portion details (e.g., “2 sandwiches”, “350 g”, “1.5 cups”)
          for better estimates.
        </Text>
      </Card>

      {/* Add Food */}
      <Card style={{ gap: 12 }}>
        <Text style={{ fontWeight: "700", color: colors.text, fontSize: 16 }}>
          Add food
        </Text>

        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <MealSegmented
            value={form.meal}
            onChange={(v) => setForm((f) => ({ ...f, meal: v }))}
          />
          <Field
            icon="restaurant-outline"
            placeholder="Food name"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="pricetag-outline"
            placeholder="Qty"
            inputMode="numeric"
            value={form.qty}
            onChangeText={(v) => setForm((f) => ({ ...f, qty: v }))}
          />
          <Field
            icon="cube-outline"
            placeholder="Unit (g, ml, serving)"
            value={form.unit}
            onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="flame-outline"
            placeholder="Calories (base)"
            inputMode="numeric"
            value={form.calories}
            onChangeText={(v) => setForm((f) => ({ ...f, calories: v }))}
          />
          <Field
            icon="fitness-outline"
            placeholder="Protein g (base)"
            inputMode="numeric"
            value={form.protein}
            onChangeText={(v) => setForm((f) => ({ ...f, protein: v }))}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="leaf-outline"
            placeholder="Carbs g (base)"
            inputMode="numeric"
            value={form.carbs}
            onChangeText={(v) => setForm((f) => ({ ...f, carbs: v }))}
          />
          <Field
            icon="water-outline"
            placeholder="Fat g (base)"
            inputMode="numeric"
            value={form.fat}
            onChangeText={(v) => setForm((f) => ({ ...f, fat: v }))}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="ice-cream-outline"
            placeholder="Sugar g (base)"
            inputMode="numeric"
            value={form.sugar}
            onChangeText={(v) => setForm((f) => ({ ...f, sugar: v }))}
          />
          <Field
            icon="trail-sign-outline"
            placeholder="Fiber g (base)"
            inputMode="numeric"
            value={form.fiber}
            onChangeText={(v) => setForm((f) => ({ ...f, fiber: v }))}
          />
        </View>

        {/* Live preview */}
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
            Preview: {preview.calories || 0} kcal • P{preview.protein || 0} • C
            {preview.carbs || 0} • F{preview.fat || 0}
            {preview.sugar ? ` • Sugar ${preview.sugar}g` : ""}
            {preview.fiber ? ` • Fiber ${preview.fiber}g` : ""}
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

        <Pressable onPress={onAdd}>
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

      {/* Meals (sections) */}
      {MEALS.map((m) => {
        const items = mealsMap[m] || [];
        const mealTotals = items.reduce(
          (t, i) => ({
            calories: t.calories + (i.calories || 0),
            protein: t.protein + (i.protein || 0),
            carbs: t.carbs + (i.carbs || 0),
            fat: t.fat + (i.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return (
          <Card key={m} style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor:
                      m === "breakfast"
                        ? withAlpha(colors.primary, 0.8)
                        : m === "lunch"
                        ? withAlpha("#22c55e", 0.8)
                        : m === "dinner"
                        ? withAlpha("#eab308", 0.8)
                        : withAlpha("#a78bfa", 0.8),
                  }}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    textTransform: "capitalize",
                    color: colors.text,
                  }}
                >
                  {m}
                </Text>
              </View>

              <Text style={{ color: colors.muted }}>
                {Math.round(mealTotals.calories)} kcal • P
                {Math.round(mealTotals.protein)} • C
                {Math.round(mealTotals.carbs)} • F{Math.round(mealTotals.fat)}
              </Text>
            </View>

            {items.length === 0 ? (
              <Text style={{ color: colors.muted, fontStyle: "italic" }}>
                Nothing here yet — add your first item above.
              </Text>
            ) : (
              items.map((it) => {
                const isEditing = editId === it.id;
                const isTemp = it.id?.startsWith?.("temp-");
                return (
                  <View
                    key={it.id}
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      paddingTop: 10,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Field
                            icon="restaurant-outline"
                            value={edit.name}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, name: v }))
                            }
                          />
                          <Field
                            icon="pricetag-outline"
                            value={edit.qty}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, qty: v }))
                            }
                            inputMode="numeric"
                          />
                          <Field
                            icon="cube-outline"
                            value={edit.unit}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, unit: v }))
                            }
                          />
                        </View>
                        <View
                          style={{ flexDirection: "row", gap: 8, marginTop: 8 }}
                        >
                          <Field
                            icon="flame-outline"
                            placeholder="kcal (base)"
                            value={edit.calories}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, calories: v }))
                            }
                            inputMode="numeric"
                          />
                          <Field
                            icon="fitness-outline"
                            placeholder="P (base)"
                            value={edit.protein}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, protein: v }))
                            }
                            inputMode="numeric"
                          />
                          <Field
                            icon="leaf-outline"
                            placeholder="C (base)"
                            value={edit.carbs}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, carbs: v }))
                            }
                            inputMode="numeric"
                          />
                          <Field
                            icon="water-outline"
                            placeholder="F (base)"
                            value={edit.fat}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, fat: v }))
                            }
                            inputMode="numeric"
                          />
                        </View>
                        <View
                          style={{ flexDirection: "row", gap: 8, marginTop: 8 }}
                        >
                          <Field
                            icon="ice-cream-outline"
                            placeholder="Sugar (base)"
                            value={edit.sugar}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, sugar: v }))
                            }
                            inputMode="numeric"
                          />
                          <Field
                            icon="trail-sign-outline"
                            placeholder="Fiber (base)"
                            value={edit.fiber}
                            onChangeText={(v) =>
                              setEdit((e) => ({ ...e, fiber: v }))
                            }
                            inputMode="numeric"
                          />
                        </View>
                        <Text style={{ color: colors.muted, marginTop: 6 }}>
                          {["g", "ml"].includes(edit.unit.toLowerCase())
                            ? "Enter base per 100 g/ml; will be scaled by qty/100."
                            : "Enter base per 1 serving; will be scaled by qty."}
                        </Text>
                        <View
                          style={{ flexDirection: "row", gap: 8, marginTop: 8 }}
                        >
                          <Pressable
                            style={{
                              height: 42,
                              paddingHorizontal: 14,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: colors.border,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            onPress={() => setEditId(null)}
                          >
                            <Text style={{ color: colors.text }}>Cancel</Text>
                          </Pressable>
                          <Pressable onPress={onSaveEdit}>
                            <LinearGradient
                              colors={[colors.primary, "#16a34a"] as const}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                height: 42,
                                paddingHorizontal: 18,
                                borderRadius: 12,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text
                                style={{ color: "#fff", fontWeight: "800" }}
                              >
                                Save
                              </Text>
                            </LinearGradient>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            flex: 1,
                          }}
                        >
                          <View
                            style={{
                              width: 4,
                              height: "100%",
                              backgroundColor: withAlpha(colors.primary, 0.6),
                              borderRadius: 2,
                            }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ fontWeight: "700", color: colors.text }}
                            >
                              {it.name} — {it.qty || 1} {it.unit || "serving"} •{" "}
                              {Math.round(it.calories || 0)} kcal
                              {isTemp && (
                                <Text style={{ color: colors.muted }}>
                                  {" "}
                                  (saving…)
                                </Text>
                              )}
                            </Text>
                            <Text style={{ color: colors.muted }}>
                              P{Math.round(it.protein || 0)} • C
                              {Math.round(it.carbs || 0)} • F
                              {Math.round(it.fat || 0)}
                              {it.sugar
                                ? ` • Sugar ${Math.round(it.sugar)}g`
                                : ""}
                              {it.fiber
                                ? ` • Fiber ${Math.round(it.fiber)}g`
                                : ""}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <IconButton
                            icon="create-outline"
                            onPress={() => {
                              if (isTemp) return;
                              setEditId(it.id);
                              setEdit({
                                name: it.name || "",
                                qty: String(it.qty ?? 1),
                                unit: it.unit || "serving",
                                calories: "",
                                protein: "",
                                carbs: "",
                                fat: "",
                                sugar: "",
                                fiber: "",
                              });
                            }}
                            disabled={isTemp}
                          />
                          <IconButton
                            icon="trash-outline"
                            onPress={() => onDeleteFood(it.id)}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </Card>
        );
      })}

      {/* Exercise */}
      <Card style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
          Exercise (calories burned)
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field
            icon="bicycle-outline"
            placeholder="Exercise name"
            value={exName}
            onChangeText={setExName}
          />
          <Field
            icon="flame-outline"
            placeholder="Calories burned"
            inputMode="numeric"
            value={exCalories}
            onChangeText={setExCalories}
          />
        </View>
        <Pressable
          style={{
            height: 44,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={addExerciseSubmit}
        >
          <Text style={{ color: colors.text, fontWeight: "700" }}>Add</Text>
        </Pressable>

        {exercise.length === 0 ? (
          <Text style={{ color: colors.muted, fontStyle: "italic" }}>
            No exercise logged.
          </Text>
        ) : (
          exercise.map((x) => (
            <View
              key={x.id}
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 10,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.text }}>
                {x.name} — {Math.round(x.calories || 0)} kcal
              </Text>
              <IconButton
                icon="trash-outline"
                onPress={() => deleteExerciseItem(x.id)}
              />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

/* ---------- Bits ---------- */

function Field(
  props: {
    icon: keyof typeof Ionicons.glyphMap;
  } & React.ComponentProps<typeof TextInput>
) {
  const { colors } = useTheme();
  const { icon, style, ...rest } = props;
  return (
    <View
      style={[
        {
          flex: 1,
          height: 44,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: colors.inputBg,
          flexDirection: "row",
          alignItems: "center",
        },
        style as any,
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        placeholderTextColor={colors.placeholder}
        style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 16 }}
        {...rest}
      />
    </View>
  );
}

function IconButton({
  icon,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        height: 38,
        width: 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

function Metric({
  value,
  label,
  suffix,
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
        {value}
        {suffix ? ` ${suffix}` : ""}
      </Text>
    </View>
  );
}

function MacroBar({
  protein,
  carbs,
  fat,
  compact,
}: {
  protein: number;
  carbs: number;
  fat: number;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const total = Math.max(1, protein + carbs + fat);
  const p = (protein / total) * 100;
  const c = (carbs / total) * 100;
  const f = (fat / total) * 100;

  return (
    <View style={{ marginTop: 10, gap: compact ? 6 : 8 }}>
      <View
        style={{
          height: compact ? 8 : 10,
          borderRadius: 999,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          flexDirection: "row",
        }}
      >
        <View
          style={{ width: `${p}%`, backgroundColor: withAlpha("#22c55e", 0.8) }}
        />
        <View
          style={{ width: `${c}%`, backgroundColor: withAlpha("#60a5fa", 0.8) }}
        />
        <View
          style={{
            width: `${f}%`,
            backgroundColor: withAlpha("#f97316", 0.85),
          }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Protein {Math.round(p)}%
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Carbs {Math.round(c)}%
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Fat {Math.round(f)}%
        </Text>
      </View>
    </View>
  );
}

function MealSegmented({
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
