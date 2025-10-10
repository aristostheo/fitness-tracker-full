import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Segmented from "../ui/Segmented";
import Field from "../ui/Field";
import PctField from "../ui/PctField";
import SummaryCard from "../ui/SummaryCard";
import { Ionicons } from "@expo/vector-icons";

export default function MacrosCard({
  macroMethod,
  setMacroMethod,
  proteinPerKg,
  setProteinPerKg,
  proteinPct,
  setProteinPct,
  carbPct,
  setCarbPct,
  fatPct,
  setFatPct,
  trainCarbPct,
  setTrainCarbPct,
  restCarbPct,
  setRestCarbPct,
  setSplit,
  preview,
  clamp01,
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
          <Ionicons name="nutrition-outline" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>Macros</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Choose a method, tune below
          </Text>
        </View>
        <Segmented
          value={macroMethod}
          options={["proteinPerKg", "percent", "cycling"]}
          setValue={setMacroMethod}
        />
      </View>

      {macroMethod === "proteinPerKg" && (
        <Glass>
          <Field
            label="Protein (g/kg)"
            value={proteinPerKg}
            onChangeText={setProteinPerKg}
            placeholder="e.g., 1.8"
            inputMode="decimal"
          />
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            A solid default is 1.6–2.2 g/kg.
          </Text>
        </Glass>
      )}

      {macroMethod === "percent" && (
        <Glass style={{ gap: 10 }}>
          <PctField
            label="Protein %"
            value={proteinPct}
            onChange={(v) => setSplit("proteinPct", v)}
          />
          <PctField
            label="Carbs %"
            value={carbPct}
            onChange={(v) => setSplit("carbPct", v)}
          />
          <PctField
            label="Fat %"
            value={fatPct}
            onChange={(v) => setSplit("fatPct", v)}
          />
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            Values auto-balance to 100%.
          </Text>
        </Glass>
      )}

      {macroMethod === "cycling" && (
        <Glass style={{ gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Protein is fixed. Carbs vary; Fat fills the rest.
          </Text>
          <PctField
            label="Protein % (both days)"
            value={proteinPct}
            onChange={(v) => setProteinPct(clamp01(v))}
          />
          <PctField
            label="Training day Carbs %"
            value={trainCarbPct}
            onChange={(v) => setTrainCarbPct(clamp01(v))}
          />
          <PctField
            label="Rest day Carbs %"
            value={restCarbPct}
            onChange={(v) => setRestCarbPct(clamp01(v))}
          />
        </Glass>
      )}

      {!!preview && (
        <>
          {macroMethod !== "cycling" ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 4,
              }}
            >
              <SummaryCard
                label="Calories"
                value={(preview as any).calorieGoal}
              />
              <SummaryCard
                label="Protein (g)"
                value={(preview as any).proteinGoal}
              />
              <SummaryCard
                label="Carbs (g)"
                value={(preview as any).carbGoal}
              />
              <SummaryCard label="Fat (g)" value={(preview as any).fatGoal} />
            </View>
          ) : (
            <>
              <Text style={{ color: colors.muted, marginTop: 6 }}>
                Training day
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <SummaryCard
                  label="Calories"
                  value={(preview as any).training.calorieGoal}
                />
                <SummaryCard
                  label="Protein (g)"
                  value={(preview as any).training.proteinGoal}
                />
                <SummaryCard
                  label="Carbs (g)"
                  value={(preview as any).training.carbGoal}
                />
                <SummaryCard
                  label="Fat (g)"
                  value={(preview as any).training.fatGoal}
                />
              </View>
              <Text style={{ color: colors.muted, marginTop: 6 }}>
                Rest day
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <SummaryCard
                  label="Calories"
                  value={(preview as any).rest.calorieGoal}
                />
                <SummaryCard
                  label="Protein (g)"
                  value={(preview as any).rest.proteinGoal}
                />
                <SummaryCard
                  label="Carbs (g)"
                  value={(preview as any).rest.carbGoal}
                />
                <SummaryCard
                  label="Fat (g)"
                  value={(preview as any).rest.fatGoal}
                />
              </View>
            </>
          )}
        </>
      )}
    </Card>
  );
}
