// components/nutrition/ExerciseCard.tsx
import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";
import Field from "./ui/Field";
import IconButton from "./ui/IconButton";
import withAlpha from "./utils/withAlpha";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

type Props = {
  items: Array<{ id: string; name: string; calories: number }>;
  exName: string;
  setExName: (v: string) => void;
  exCalories: string;
  setExCalories: (v: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
};

export default function ExerciseCard({
  items,
  exName,
  setExName,
  exCalories,
  setExCalories,
  onAdd,
  onDelete,
}: Props) {
  const { colors, isDark } = useTheme();

  const hasItems = items.length > 0;
  const canAdd = exName.trim().length > 0 && Number(exCalories) > 0;

  return (
    <Card style={{ gap: 12, paddingTop: 10 }}>
      {/* Add bar — clean, compact, friendly */}
      <View style={{ gap: 8 }}>
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
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Add exercise"
          style={{
            borderRadius: 12,
            overflow: "hidden",
            opacity: canAdd ? 1 : 0.75, // visual only; logic unchanged
          }}
        >
          {/* iOS glassy feel with subtle gradient */}
          {Platform.OS === "ios" ? (
            <BlurView
              tint={
                isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"
              }
              intensity={20}
              style={{
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LinearGradient
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                colors={
                  isDark
                    ? ["#22c55eAA", "#16a34aAA"]
                    : ["#3b82f6AA", "#60a5faAA"]
                }
                style={{ position: "absolute", inset: 0, opacity: 0.4 }}
              />
              <RowCenter gap={8}>
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={colors.text}
                />
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                  Add
                </Text>
              </RowCenter>
            </BlurView>
          ) : (
            <LinearGradient
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              colors={isDark ? ["#22c55e", "#16a34a"] : ["#3b82f6", "#60a5fa"]}
              style={{
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RowCenter gap={8}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "900" }}>Add</Text>
              </RowCenter>
            </LinearGradient>
          )}
        </Pressable>
      </View>

      {/* List / Empty state */}
      {!hasItems ? (
        <EmptyState colors={colors} isDark={isDark} />
      ) : (
        <View style={{ gap: 8 }}>
          {items.map((x) => (
            <ExerciseRow
              key={x.id}
              item={x}
              colors={colors}
              isDark={isDark}
              onDelete={() => onDelete(x.id)}
            />
          ))}
        </View>
      )}
    </Card>
  );
}

/* ---------------- UI bits ---------------- */

function EmptyState({ colors, isDark }: any) {
  return (
    <View
      style={{
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        No exercise yet — log your first activity.
      </Text>
    </View>
  );
}

function ExerciseRow({
  item,
  colors,
  isDark,
  onDelete,
}: {
  item: { id: string; name: string; calories: number };
  colors: any;
  isDark: boolean;
  onDelete: () => void;
}) {
  const kcal = Math.round(Number(item.calories ?? 0));

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 12,
        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Dot color={withAlpha(colors.primary, 0.9)} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: colors.text }}>
            {item.name || "Unnamed activity"}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>
            Calories burned
          </Text>
        </View>

        <KcalChip kcal={kcal} colors={colors} />

        <IconButton icon="trash-outline" onPress={onDelete} />
      </View>
    </View>
  );
}

function KcalChip({ kcal, colors }: { kcal: number; colors: any }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: withAlpha(colors.primary, 0.12),
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.25),
        marginRight: 6,
      }}
    >
      <Text
        style={{
          color: colors.primary,
          fontSize: 12,
          fontWeight: "900",
        }}
      >
        {kcal} kcal
      </Text>
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        backgroundColor: color,
        marginTop: 2,
      }}
    />
  );
}

function RowCenter({
  children,
  gap = 0,
}: React.PropsWithChildren<{ gap?: number }>) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap }}>
      {children}
    </View>
  );
}
