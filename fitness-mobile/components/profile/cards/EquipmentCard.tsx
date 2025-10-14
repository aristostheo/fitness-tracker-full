// components/profile/cards/EquipmentCard.tsx
import React, { memo } from "react";
import { View, Text } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Pill from "../ui/Pill";
import Field from "../ui/Field";
import { Ionicons } from "@expo/vector-icons";

/** Stable, memoized glass wrapper (avoid defining components inside render) */
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

export default function EquipmentCard({
  EQUIP,
  equipment,
  setEquipment,
  workoutPlace,
  setWorkoutPlace,
  injuries,
  setInjuries,
}: {
  EQUIP: readonly string[];
  equipment: string[];
  setEquipment: (arr: string[]) => void;
  workoutPlace: "home" | "gym";
  setWorkoutPlace: (p: "home" | "gym") => void;
  injuries?: string;
  setInjuries: (s: string) => void;
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
          <Ionicons name="barbell-outline" size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>
            Equipment & Constraints
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Tailors your plan and substitutions
          </Text>
        </View>
      </View>

      {/* Equipment chips */}
      <GlassBox>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          Equipment
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {EQUIP.map((e) => {
            const active = equipment.includes(e);
            return (
              <Pill
                key={e}
                active={active}
                onPress={() =>
                  setEquipment(
                    active
                      ? equipment.filter((x) => x !== e)
                      : [...equipment, e]
                  )
                }
              >
                {e}
              </Pill>
            );
          })}
        </View>
      </GlassBox>

      {/* Place + Injuries */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <GlassBox style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
            Place
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {(["home", "gym"] as const).map((p) => (
              <Pill
                key={p}
                active={workoutPlace === p}
                onPress={() => setWorkoutPlace(p)} // ✅ correct handler
              >
                {p}
              </Pill>
            ))}
          </View>
        </GlassBox>

        <GlassBox style={{ flex: 1 }}>
          <Field
            label="Injuries / avoid"
            value={injuries ?? ""}
            onChangeText={setInjuries}
            placeholder="comma separated (optional)"
            style={{ width: "100%" }}
            inputStyle={{ paddingVertical: 10 }}
          />
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            We’ll avoid or modify risky movements.
          </Text>
        </GlassBox>
      </View>
    </Card>
  );
}
