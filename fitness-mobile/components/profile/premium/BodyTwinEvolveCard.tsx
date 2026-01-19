// components/profile/premium/BodyTwinEvolveCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha, clamp, fmt } from "./ui";

/**
 * Premium “Body Twin” preview (no dependency on your old UI).
 * This is intentionally calm + abstract:
 * - a silhouette core
 * - 3 rings that “evolve” based on metrics & goal direction
 *
 * Later, if you want, you can swap the center for your real BodyTwinAvatar renderer.
 */
export function BodyTwinEvolveCard(props: {
  isDark: boolean;
  weightKg: number;
  heightCm: number;
  goalType: "cut" | "maintain" | "lean_bulk" | "bulk";
  trendHint: number; // negative means trending down
  onPressCustomize: () => void;
}) {
  const { colors, isDark } = useTheme();

  const energy = useMemo(() => {
    // a stable, not-too-reactive evolution scalar
    const h = props.heightCm || 175;
    const w = props.weightKg || 75;
    const bmi = w / Math.pow(h / 100, 2);
    const norm = clamp((bmi - 18) / 14, 0, 1);
    const goalBias =
      props.goalType === "cut" ? 0.15 : props.goalType === "bulk" ? 0.25 : 0.2;
    const trendBias = clamp(Math.abs(props.trendHint) / 2.5, 0, 0.18);
    return clamp(norm * 0.65 + goalBias + trendBias, 0.12, 0.92);
  }, [props.heightCm, props.weightKg, props.goalType, props.trendHint]);

  const mood = useMemo(() => {
    if (props.goalType === "cut") return "Leaner form";
    if (props.goalType === "bulk") return "Stronger form";
    return "Balanced form";
  }, [props.goalType]);

  return (
    <GlassCard>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
          Body Twin
        </Text>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            props.onPressCustomize();
          }}
          style={({ pressed }) => [
            styles.btn,
            {
              marginLeft: "auto",
              backgroundColor: withAlpha(
                colors.card,
                isDark ? (pressed ? 0.22 : 0.18) : pressed ? 0.7 : 0.55
              ),
              borderColor: withAlpha(colors.border, 0.7),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Customize Body Twin"
        >
          <Ionicons name="options-outline" size={16} color={colors.text} />
        </Pressable>
      </View>

      <Text style={{ color: colors.muted, marginTop: 6 }}>{mood}</Text>

      <View style={{ height: 12 }} />

      <View
        style={[
          styles.stage,
          { backgroundColor: withAlpha(colors.border, isDark ? 0.12 : 0.2) },
        ]}
      >
        <View
          style={[
            styles.ringOuter,
            { borderColor: withAlpha(colors.primary, isDark ? 0.35 : 0.22) },
          ]}
        >
          <View
            style={[
              styles.ringMid,
              { borderColor: withAlpha(colors.primary, isDark ? 0.28 : 0.18) },
            ]}
          >
            <View
              style={[
                styles.ringInner,
                {
                  borderColor: withAlpha(colors.primary, isDark ? 0.22 : 0.14),
                },
              ]}
            >
              <View
                style={[
                  styles.core,
                  {
                    width: 62 + energy * 16,
                    height: 62 + energy * 16,
                    borderRadius: 22 + energy * 6,
                    backgroundColor: withAlpha(
                      colors.text,
                      isDark ? 0.08 : 0.06
                    ),
                    borderColor: withAlpha(colors.border, 0.7),
                  },
                ]}
              >
                <Ionicons name="person-outline" size={22} color={colors.text} />
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: 12 }} />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Chip label="Evolves" value={`${Math.round(energy * 100)}%`} />
        <Chip label="Weight" value={`${fmt.num1(props.weightKg)} kg`} />
      </View>

      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          marginTop: 12,
          lineHeight: 16,
        }}
      >
        A visual companion — not a critic. It changes slowly so you don’t feel
        “watched.”
      </Text>
    </GlassCard>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.chip}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text
        style={{ color: colors.text, fontWeight: "900", marginTop: 4 }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stage: {
    height: 128,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ringOuter: {
    width: 112,
    height: 112,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ringMid: {
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 74,
    height: 74,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  core: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chip: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
