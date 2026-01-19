// components/scanMeal/PortionControl.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import type { Portion } from "@/services/scanMeal/types";

type Props = {
  value: Portion;
  onChange: (v: Portion) => void;
};

const UNITS: Portion["unit"][] = ["g", "oz", "cups", "tbsp", "piece"];

function getConfig(unit: Portion["unit"]) {
  switch (unit) {
    case "g":
      return { min: 5, max: 600, step: 5 };
    case "oz":
      return { min: 0.5, max: 24, step: 0.5 };
    case "cups":
      return { min: 0.25, max: 6, step: 0.25 };
    case "tbsp":
      return { min: 0.5, max: 20, step: 0.5 };
    case "piece":
    default:
      return { min: 1, max: 10, step: 1 };
  }
}

// Multiplier strategy:
// - Current demo assumption: macros in DetectedFood.macros are "per 1 unit"
// - multiplier = amount
// If later you normalize macros per 100g, set multiplier = amount/100 when unit==="g".
function computeMultiplier(amount: number, unit: Portion["unit"]) {
  // keep it simple for now
  return amount;
}

export default function PortionControl({ value, onChange }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const cfg = getConfig(value.unit);
  const multiplier =
    value.multiplier ?? computeMultiplier(value.amount, value.unit);

  const setAmount = (nextAmount: number) => {
    const clamped = clamp(roundToStep(nextAmount, cfg.step), cfg.min, cfg.max);
    onChange({
      ...value,
      amount: clamped,
      multiplier: computeMultiplier(clamped, value.unit),
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>Portion</Text>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setAmount(value.amount - cfg.step);
            }}
            style={styles.stepBtn}
            accessibilityRole="button"
            accessibilityLabel="Decrease portion"
          >
            <Text style={styles.stepText}>–</Text>
          </Pressable>

          <Text style={styles.amountText}>
            {formatAmount(value.amount)} {value.unit}
          </Text>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setAmount(value.amount + cfg.step);
            }}
            style={styles.stepBtn}
            accessibilityRole="button"
            accessibilityLabel="Increase portion"
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Slider
          value={value.amount}
          minimumValue={cfg.min}
          maximumValue={cfg.max}
          step={cfg.step}
          onValueChange={(v: number) => setAmount(v)}
          minimumTrackTintColor={colors.primary ?? (isDark ? "#fff" : "#000")}
          maximumTrackTintColor={
            isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)"
          }
          thumbTintColor={colors.primary ?? (isDark ? "#fff" : "#000")}
          accessibilityLabel="Portion slider"
        />
      </View>

      <View style={styles.unitRow}>
        {UNITS.map((u) => {
          const active = u === value.unit;
          return (
            <Pressable
              key={u}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                const nextAmount =
                  u === "g" ? 100 : u === "oz" ? 4 : u === "piece" ? 1 : 1;
                onChange({
                  ...value,
                  unit: u,
                  amount: nextAmount,
                  multiplier: computeMultiplier(nextAmount, u),
                });
              }}
              style={[styles.unitPill, active && styles.unitPillActive]}
              accessibilityRole="button"
              accessibilityLabel={`Set unit to ${u}`}
            >
              <Text style={[styles.unitText, active && styles.unitTextActive]}>
                {u}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.estimateNote}>
        Macro totals update instantly.{" "}
        {multiplier === 1 ? "Default portion" : "Adjusted"}.
      </Text>
    </View>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundToStep(n: number, step: number) {
  const inv = 1 / step;
  return Math.round(n * inv) / inv;
}

function formatAmount(n: number) {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

function makeStyles(colors: any, isDark: boolean) {
  const hair = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  return StyleSheet.create({
    wrap: {
      padding: 12,
      borderRadius: 16,
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: { color: colors.text, fontWeight: "900" },

    stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
    stepBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
    },
    stepText: {
      color: colors.text,
      fontWeight: "900",
      fontSize: 18,
      marginTop: -1,
    },
    amountText: { color: colors.text, fontWeight: "900", fontSize: 13 },

    unitRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    unitPill: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
    },
    unitPillActive: {
      backgroundColor: colors.primary ?? (isDark ? "#fff" : "#000"),
      borderColor: "transparent",
    },
    unitText: { color: colors.text, fontWeight: "800", fontSize: 12 },
    unitTextActive: { color: colors.primaryText ?? (isDark ? "#000" : "#fff") },

    estimateNote: {
      marginTop: 10,
      color:
        colors.muted ??
        (isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)"),
      fontWeight: "700",
    },
  });
}
