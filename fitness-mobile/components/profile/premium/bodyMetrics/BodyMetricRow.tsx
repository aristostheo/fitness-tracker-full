// components/profile/bodyMetrics/BodyMetricRow.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";

type Props = {
  label: string;
  value: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function BodyMetricRow({
  label,
  value,
  hint,
  onPress,
  disabled,
}: Props) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={async () => {
        try {
          await Haptics.selectionAsync();
        } catch {}
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          opacity: disabled ? 0.55 : 1,
          backgroundColor: pressed
            ? isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.04)"
            : "transparent",
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
        {!!hint && (
          <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>
        )}
      </View>

      <View style={styles.right}>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.muted}
          style={{ marginLeft: 8, marginTop: 2 }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flex: 1, paddingRight: 12 },
  right: { flexDirection: "row", alignItems: "center" },
  label: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 12, marginTop: 4, opacity: 0.9 },
  value: { fontSize: 22, fontWeight: "800", letterSpacing: 0.2 },
});
