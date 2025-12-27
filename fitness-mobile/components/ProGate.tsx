import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/components/workouts/utils/withAlpha";

type Props = {
  enabled: boolean;
  onUpgrade: () => void;
  children: React.ReactNode;
  label?: string;
};

export function ProGate({ enabled, onUpgrade, children, label }: Props) {
  const { colors } = useTheme();

  if (enabled) return <>{children}</>;

  return (
    <View
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.35),
        backgroundColor: withAlpha(colors.card, 0.9),
      }}
    >
      <View style={{ opacity: 0.35 }}>{children}</View>

      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: withAlpha(colors.background, 0.6),
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
          gap: 8,
        }}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={onUpgrade}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: withAlpha(colors.primary, pressed ? 0.85 : 1),
          })}
        >
          <Ionicons name="sparkles-outline" size={16} color={colors.background} />
          <Text style={{ color: colors.background, fontWeight: "900" }}>
            Unlock {label || "Pro"}
          </Text>
        </Pressable>
        <Text
          style={{
            color: withAlpha(colors.text, 0.8),
            fontWeight: "700",
            textAlign: "center",
            fontSize: 12,
          }}
        >
          Pro includes AI suggestions, templates, Coach Spark, and more.
        </Text>
      </View>
    </View>
  );
}
