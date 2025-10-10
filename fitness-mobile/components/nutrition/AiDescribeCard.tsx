import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Field from "./ui/Field";
import { parseMealRemote } from "@/services/ai";

export default function AiDescribeCard({
  setForm,
}: {
  setForm: React.Dispatch<
    React.SetStateAction<{
      meal: any;
      name: string;
      qty: string;
      unit: string;
      calories: string;
      protein: string;
      carbs: string;
      fat: string;
      sugar: string;
      fiber: string;
    }>
  >;
}) {
  const { colors } = useTheme();
  const [aiDesc, setAiDesc] = useState("");
  const [aiQty, setAiQty] = useState("");
  const [aiUnit, setAiUnit] = useState("serving");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  function unscaleFromTotals(totals: any, qty: number, unit: string) {
    const u = (unit || "").toLowerCase();
    const isWeight = u === "g" || u === "ml";
    const factor = isWeight ? qty / 100 : qty;
    const safe = Math.max(
      1,
      Number.isFinite(factor) && factor > 0 ? factor : 1
    );
    const n = (v: number | undefined) =>
      String(Math.round((Number(v) || 0) / safe));
    return {
      calories: n(totals.calories),
      protein: n(totals.protein),
      carbs: n(totals.carbs),
      fat: n(totals.fat),
      sugar: n(totals.sugar),
      fiber: n(totals.fiber),
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
      setAiError(
        e?.message || "Couldn't parse that. Try adding portion details."
      );
    } finally {
      setAiLoading(false);
    }
  }

  return (
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
              colors={["#22c55e", "#16a34a"] as const}
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
        Tip: Add portion details (e.g., “2 sandwiches”, “350 g”, “1.5 cups”) for
        better estimates.
      </Text>
    </Card>
  );
}
