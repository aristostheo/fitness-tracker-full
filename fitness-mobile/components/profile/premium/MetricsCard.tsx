// components/profile/premium/MetricsCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha, fmt } from "./ui";

export function MetricsCard(props: {
  unit: "kg" | "lb";
  weightKg: number;
  targetWeightKg: number;
  heightCm: number;
  bodyFatPct?: number;
  waistCm?: number;
  restingHeartRateBpm?: number;
  lastUpdatedVia?: string;
  lastUpdatedAt?: number;
  onPressAdd: () => void;
}) {
  const { colors } = useTheme();

  const bmi = useMemo(() => {
    if (!props.weightKg || !props.heightCm) return null;
    const h = props.heightCm / 100;
    const v = props.weightKg / (h * h);
    return Math.round(v * 10) / 10;
  }, [props.weightKg, props.heightCm]);

  const weightLabel = useMemo(() => {
    if (!props.weightKg) return "--";
    return props.unit === "kg"
      ? `${fmt.num1(props.weightKg)} kg`
      : `${fmt.num1(props.weightKg * 2.20462)} lb`;
  }, [props.unit, props.weightKg]);

  const targetLabel = useMemo(() => {
    if (!props.targetWeightKg) return "--";
    return props.unit === "kg"
      ? `${fmt.num1(props.targetWeightKg)} kg`
      : `${fmt.num1(props.targetWeightKg * 2.20462)} lb`;
  }, [props.unit, props.targetWeightKg]);

  return (
    <GlassCard>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: colors.textPrimary, fontWeight: "500", fontSize: 16 }}>
          Body metrics
        </Text>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            props.onPressAdd();
          }}
          style={({ pressed }) => [
            styles.addBtn,
            {
              marginLeft: "auto",
              backgroundColor: colors.surface3,
              borderColor: colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add or edit measurements"
        >
          <Ionicons name="add-outline" size={16} color={colors.textTertiary} />
        </Pressable>
      </View>

      <View style={{ height: 12 }} />

      <View style={{ gap: 10 }}>
        <Row label="Weight" value={weightLabel} />
        {props.lastUpdatedVia && props.lastUpdatedAt ? (
          <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: "300", marginTop: -5 }}>
            Last updated via {props.lastUpdatedVia}: {new Date(props.lastUpdatedAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
          </Text>
        ) : null}
        <Row label="Target" value={targetLabel} />
        <Row label="Height" value={`${fmt.num0(props.heightCm)} cm`} />
        <Row
          label="Resting HR"
          value={
            props.restingHeartRateBpm != null && Number(props.restingHeartRateBpm) > 0
              ? `${fmt.num0(props.restingHeartRateBpm)} bpm`
              : "—"
          }
          subtleNote={
            props.lastUpdatedVia === "RingConn" &&
            props.restingHeartRateBpm != null &&
            Number(props.restingHeartRateBpm) > 0
              ? "via RingConn"
              : undefined
          }
        />
        <Row
          label="BMI"
          value={bmi ? `${bmi}` : "—"}
          subtleNote="Not a health verdict."
        />
        <Row
          label="Body fat"
          value={
            props.bodyFatPct != null && Number(props.bodyFatPct) > 0
              ? `${fmt.num1(props.bodyFatPct)}%`
              : "—"
          }
          subtleNote={
            props.bodyFatPct != null && Number(props.bodyFatPct) > 0
              ? undefined
              : "Not set"
          }
        />
        <Row
          label="Waist"
          value={props.waistCm != null ? `${fmt.num0(props.waistCm)} cm` : "—"}
        />
      </View>

      <Text
        style={{
          color: colors.muted,
          fontSize: 11,
          marginTop: 12,
          lineHeight: 16,
        }}
      >
        Measurements are optional.
      </Text>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          props.onPressAdd();
        }}
        style={{ marginTop: 10, alignSelf: "flex-start", paddingVertical: 4 }}
        accessibilityRole="button"
        accessibilityLabel="Add measurement"
      >
        <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "400" }}>
          + Add measurement
        </Text>
      </Pressable>
    </GlassCard>
  );
}

function Row(props: { label: string; value: string; subtleNote?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={{ color: colors.textTertiary, fontSize: 12, fontWeight: "300" }}>{props.label}</Text>
      <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
        <Text style={{ color: colors.textPrimary, fontWeight: "500" }}>
          {props.value}
        </Text>
        {props.subtleNote ? (
          <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2, fontWeight: "300" }}>
            {props.subtleNote}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
