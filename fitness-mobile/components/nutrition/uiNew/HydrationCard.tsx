import React from "react";
import { View, Text, Pressable, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "./GlassCard";
import WaterBottleCardRealistic from "@/components/WaterBottleCardRealistic";

function withAlpha(color: string, alpha = 0.2) {
  if (!color) return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("rgb")) {
    const body = color.replace(/^rgba?\(|\)$/g, "");
    const [r, g, b] = body.split(",").map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const m = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return color;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(
    m[3],
    16
  )}, ${alpha})`;
}

export function HydrationCard({
  colors,
  isDark,
  currentMl,
  goalMl,
  onAdd,
  onClear,
  style,
}: {
  colors: any;
  isDark: boolean;
  currentMl: number;
  goalMl: number;
  onAdd: (ml: number) => void;
  onClear: () => void;
  style?: ViewStyle | any;
}) {
  const pct = Math.round((currentMl / goalMl) * 100) || 0;

  return (
    <GlassCard colors={colors} isDark={isDark} style={style}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>
            Hydration
          </Text>
          <Text
            style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}
          >
            {currentMl} / {goalMl} ml • {pct}%
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear hydration"
          onPress={onClear}
          hitSlop={10}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: withAlpha("#ef4444", 0.25),
            backgroundColor: withAlpha("#ef4444", 0.12),
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 12 }}>
            Clear
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <View style={{ width: 140, flexShrink: 0, overflow: "visible" }}>
          <WaterBottleCardRealistic
            currentMl={currentMl}
            goalMl={goalMl}
            width={140}
            height={190}
            tint="aqua"
            onQuickAdd={(ml) => onAdd(ml)}
          />
        </View>

        <View style={{ flex: 1, gap: 10, minWidth: 0 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[150, 250, 350, 500].map((ml) => (
              <Pressable
                key={ml}
                accessibilityRole="button"
                accessibilityLabel={`Add ${ml} milliliters`}
                onPress={() => onAdd(ml)}
                style={{
                  width: "48%",
                  minWidth: 120,
                  height: 42,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.32),
                  backgroundColor: withAlpha(colors.primary, 0.14),
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={colors.text}
                />
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  {ml} ml
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add one liter"
            onPress={() => onAdd(1000)}
            style={{
              height: 44,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              backgroundColor: withAlpha(colors.card, 0.35),
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
          >
            <Ionicons name="water-outline" size={18} color={colors.text} />
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              +1000 ml (bottle)
            </Text>
          </Pressable>

          <View
            accessibilityLabel={`Hydration progress ${pct} percent`}
            style={{
              height: 10,
              borderRadius: 999,
              backgroundColor: withAlpha(colors.border, 0.9),
              overflow: "hidden",
              marginTop: 2,
            }}
          >
            <View
              style={{
                width: `${
                  Math.min(1, goalMl > 0 ? currentMl / goalMl : 0) * 100
                }%`,
                height: "100%",
                backgroundColor: withAlpha(colors.primary, 0.95),
              }}
            />
          </View>
        </View>
      </View>
    </GlassCard>
  );
}
