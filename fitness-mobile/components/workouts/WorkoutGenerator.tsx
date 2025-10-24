// components/workouts/WorkoutGenerator.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import Card from "@/components/Card";
import { Field } from "@/components/workouts/ui/Field";
import { GradientButton } from "@/components/workouts/ui/GradientButton";
import { withAlpha } from "@/components/workouts/utils/withAlpha";

type PlanItem = {
  exercise: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  notes?: string;
};

export default function WorkoutGenerator({
  dayText,
  setDayText,
  loading,
  plan,
  onPickPreset,
  onGenerate,
  onRegenerate, // <- optional
  onClear, // <- optional
  onInsertItem,
}: {
  dayText: string;
  setDayText: (v: string) => void;
  loading: boolean;
  plan: null | { items: PlanItem[]; rationale?: string };
  onPickPreset: (v: string) => void;
  onGenerate: () => void;
  onRegenerate?: () => void;
  onClear?: () => void;
  onInsertItem: (item: PlanItem) => void;
}) {
  const { colors, isDark } = useTheme();
  const presets = useMemo(
    () => ["push", "pull", "legs", "upper", "lower", "full body"],
    []
  );

  // Per-item “Added” feedback state
  const [addedMap, setAddedMap] = useState<Record<number, boolean>>({});

  function handleAdd(it: PlanItem, idx: number) {
    onInsertItem(it);
    setAddedMap((m) => ({ ...m, [idx]: true }));
    // auto-clear the “Added” state after 1.5s
    setTimeout(() => {
      setAddedMap((m) => {
        const n = { ...m };
        delete n[idx];
        return n;
      });
    }, 1500);
  }

  return (
    <Card
      style={{
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.25),
        backgroundColor: isDark
          ? "rgba(15,18,28,0.75)"
          : "rgba(240,246,255,0.8)",
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
            backgroundColor: withAlpha(colors.primary, 0.16),
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.32),
          }}
        >
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>
            Coach Spark
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Generate a smart plan for today
          </Text>
        </View>
      </View>

      {/* Day prompt + presets */}
      <View style={{ gap: 8 }}>
        <Field
          icon="flash-outline"
          placeholder='e.g. "push", "legs", "upper"'
          value={dayText}
          onChangeText={setDayText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {presets.map((p) => (
            <Pressable
              key={p}
              onPress={() => onPickPreset(p)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.35),
                backgroundColor: withAlpha(colors.primary, 0.12),
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: "800" }}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Primary + secondary actions */}
      <View style={{ gap: 8 }}>
        <GradientButton
          onPress={onGenerate}
          disabled={loading || !dayText.trim()}
          label={loading ? "Generating…" : "Generate Today’s Workout"}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* Regenerate */}
          <Pressable
            onPress={onRegenerate ?? onGenerate}
            disabled={loading || !(plan && plan.items?.length)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              backgroundColor: withAlpha(colors.primary, 0.08),
              alignItems: "center",
              opacity: loading || !(plan && plan.items?.length) ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "900" }}>
              Regenerate
            </Text>
          </Pressable>

          {/* Clear all (only if parent provided) */}
          {onClear ? (
            <Pressable
              onPress={onClear}
              disabled={loading || !(plan && plan.items?.length)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: withAlpha("#ef4444", 0.45),
                backgroundColor: withAlpha("#ef4444", 0.12),
                alignItems: "center",
                opacity: loading || !(plan && plan.items?.length) ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#ef4444", fontWeight: "900" }}>
                Clear all
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Result */}
      {loading ? (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
          }}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 8 }}>
            Cooking something good…
          </Text>
        </View>
      ) : plan && plan.items?.length ? (
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.25),
            backgroundColor: withAlpha(colors.primary, 0.08),
            padding: 10,
            gap: 10,
          }}
        >
          {!!plan.rationale && (
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {plan.rationale}
            </Text>
          )}

          {plan.items.map((it, idx) => {
            const added = !!addedMap[idx];
            return (
              <View
                key={`${it.exercise}-${idx}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: colors.text, fontWeight: "800" }}
                    numberOfLines={1}
                  >
                    {it.exercise}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {it.sets ?? "—"}×{it.reps ?? "—"}
                    {typeof it.weight_kg === "number"
                      ? ` • ${Math.round(it.weight_kg)} kg`
                      : ""}
                    {it.notes ? ` • ${it.notes}` : ""}
                  </Text>
                </View>

                {/* Add / Added feedback */}
                {added ? (
                  <View
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: withAlpha(colors.primary, 0.35),
                      backgroundColor: withAlpha(colors.primary, 0.18),
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={{ color: colors.primary, fontWeight: "900" }}>
                      Added
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleAdd(it, idx)}
                    style={({ pressed }) => ({
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: withAlpha(colors.primary, 0.35),
                      backgroundColor: withAlpha(
                        colors.primary,
                        pressed ? 0.2 : 0.12
                      ),
                    })}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "900" }}>
                      Add
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}
