import React from "react";
import { View, Text, Pressable } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Segmented from "../ui/Segmented";
import Field from "../ui/Field";
import { kgToLb, lbToKg } from "@/utils/units";
import { Ionicons } from "@expo/vector-icons";

export default function BasicsCard({
  sex,
  setSex,
  age,
  setAge,
  heightCm,
  setHeightCm,
  weightUnit,
  setWeightUnit,
  weightInput,
  setWeightInput,
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
          <Ionicons name="person-outline" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>Basics</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Quick personal details
          </Text>
        </View>
        <Segmented value={sex} options={["male", "female"]} setValue={setSex} />
      </View>

      {/* Age / Height */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Glass style={{ flex: 1 }}>
          <Field
            label="Age"
            value={age}
            onChangeText={setAge}
            placeholder="years"
            inputMode="numeric"
          />
        </Glass>
        <Glass style={{ flex: 1 }}>
          <Field
            label="Height"
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="cm"
            inputMode="numeric"
          />
        </Glass>
      </View>

      {/* Weight + Unit Toggle */}
      <Glass>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          <Field
            label="Weight"
            value={weightInput}
            onChangeText={setWeightInput}
            placeholder={weightUnit}
            inputMode="decimal"
            style={{ flex: 1 }}
          />
          <Pressable
            onPress={() => {
              if (weightUnit === "kg") {
                setWeightInput(
                  String(Math.round(kgToLb(Number(weightInput || 0))))
                );
                setWeightUnit("lb");
              } else {
                setWeightInput(
                  String(Math.round(lbToKg(Number(weightInput || 0))))
                );
                setWeightUnit("kg");
              }
            }}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 14,
              backgroundColor: colors.card,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {weightUnit.toUpperCase()}
            </Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
          Tap the unit to convert automatically.
        </Text>
      </Glass>
    </Card>
  );
}
