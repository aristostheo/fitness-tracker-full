import React, { useRef, memo } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Segmented from "../ui/Segmented";
import Field from "../ui/Field";
import { kgToLb, lbToKg } from "@/utils/units";
import { Ionicons } from "@expo/vector-icons";

/** Stable, memoized glass wrapper (DO NOT define inside the render function) */
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

type Props = {
  sex: "male" | "female";
  setSex: (s: "male" | "female") => void;
  age: string | number | undefined;
  setAge: (v: string) => void;
  heightCm: string | number | undefined;
  setHeightCm: (v: string) => void;
  weightUnit: "kg" | "lb";
  setWeightUnit: (u: "kg" | "lb") => void;
  weightInput: string | number | undefined;
  setWeightInput: (v: string) => void;
};

function BasicsCardInner({
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
}: Props) {
  const { colors } = useTheme();

  // Refs for focus chaining
  const ageRef = useRef<TextInput>(null);
  const heightRef = useRef<TextInput>(null);
  const weightRef = useRef<TextInput>(null);

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
        <Segmented
          value={sex}
          options={["male", "female"]}
          setValue={setSex as any}
        />
      </View>

      {/* Age / Height */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <GlassBox style={{ flex: 1 }}>
          <Field
            ref={ageRef}
            label="Age"
            value={age == null ? "" : String(age)}
            onChangeText={setAge}
            placeholder="years"
            inputMode="numeric"
            returnKeyType="next"
            onSubmitEditing={() => heightRef.current?.focus()}
            autoCapitalize="none"
            style={{ width: "100%" }} // Glass width
            inputStyle={{ fontSize: 18, paddingVertical: 10 }}
          />
        </GlassBox>

        <GlassBox style={{ flex: 1 }}>
          <Field
            ref={heightRef}
            label="Height"
            value={heightCm == null ? "" : String(heightCm)}
            onChangeText={setHeightCm}
            placeholder="cm"
            inputMode="numeric"
            returnKeyType="next"
            onSubmitEditing={() => weightRef.current?.focus()}
            autoCapitalize="none"
            style={{ width: "100%" }}
            inputStyle={{ fontSize: 18, paddingVertical: 10 }}
          />
        </GlassBox>
      </View>

      {/* Weight + Unit toggle (stacked for clarity) */}
      <GlassBox>
        <Field
          ref={weightRef}
          label="Weight"
          value={weightInput == null ? "" : String(weightInput)}
          onChangeText={setWeightInput}
          placeholder={weightUnit}
          inputMode="decimal"
          returnKeyType="done"
          autoCapitalize="none"
          style={{ width: "100%", minWidth: 0 }}
          inputStyle={{ fontSize: 18, paddingVertical: 12 }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${
            weightUnit === "kg" ? "pounds" : "kilograms"
          }`}
          onPress={() => {
            // Convert only on tap (NOT onChangeText) to avoid re-renders while typing
            const raw = Number(weightInput || 0);
            if (weightUnit === "kg") {
              setWeightInput(String(Math.round(kgToLb(raw))));
              setWeightUnit("lb");
            } else {
              setWeightInput(String(Math.round(lbToKg(raw))));
              setWeightUnit("kg");
            }
          }}
          style={{
            alignSelf: "flex-end",
            marginTop: 8,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 999,
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: colors.card,
          }}
          hitSlop={8}
        >
          <Text style={{ color: colors.text, fontWeight: "700" }}>
            {weightUnit.toUpperCase()}
          </Text>
        </Pressable>

        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
          Tap the unit to convert automatically.
        </Text>
      </GlassBox>
    </Card>
  );
}

/** Memoize the card so unrelated parent state changes don’t cause unnecessary re-renders */
export default memo(BasicsCardInner);
