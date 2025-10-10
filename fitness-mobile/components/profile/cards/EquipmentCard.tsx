import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Pill from "../ui/Pill";
import Field from "../ui/Field";
import { Ionicons } from "@expo/vector-icons";

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
  injuries: string;
  setInjuries: (s: string) => void;
}) {
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

      <Glass>
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
      </Glass>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Glass style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
            Place
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {(["home", "gym"] as const).map((p) => (
              <Pill
                key={p}
                active={workoutPlace === p}
                onPress={() => setWorkoutPlace(p)}
              >
                {p}
              </Pill>
            ))}
          </View>
        </Glass>

        <Glass style={{ flex: 1 }}>
          <Field
            label="Injuries / avoid"
            value={injuries}
            onChangeText={setInjuries}
            placeholder="comma separated (optional)"
          />
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            We’ll avoid or modify risky movements.
          </Text>
        </Glass>
      </View>
    </Card>
  );
}
