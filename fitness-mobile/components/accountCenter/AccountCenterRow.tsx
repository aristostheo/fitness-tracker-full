// components/accountCenter/AccountCenterRow.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export function AccountCenterRow({
  icon,
  label,
  value,
  hint,
  onPress,
  right = "chevron",
  toggle,
  toggleValue,
  onToggleChange,
  danger,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  hint?: string;
  onPress?: () => void;
  right?: "chevron" | "none";
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (v: boolean) => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { colors, isDark } = useTheme() as any;

  const fg = danger ? "#ef4444" : colors.text;
  const sub = colors.muted;

  const content = (
    <>
      <View
        style={[
          styles.iconWrap,
          {
            borderColor: colors.border,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={danger ? "#ef4444" : colors.text}
        />
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
            {label}
          </Text>
          {!!value && (
            <Text style={[styles.value, { color: sub }]} numberOfLines={1}>
              {value}
            </Text>
          )}
        </View>
        {!!hint && (
          <Text style={[styles.hint, { color: sub }]} numberOfLines={2}>
            {hint}
          </Text>
        )}
      </View>

      {toggle ? (
        <Switch
          value={!!toggleValue}
          onValueChange={(v) => onToggleChange?.(v)}
          disabled={!!disabled}
        />
      ) : right === "chevron" ? (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      ) : null}
    </>
  );

  if (toggle) {
    return (
      <View
        style={[
          styles.row,
          {
            borderColor: colors.border,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.02)",
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: pressed
            ? isDark
              ? "rgba(255,255,255,0.07)"
              : "rgba(0,0,0,0.05)"
            : isDark
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)",
          opacity: disabled ? 0.55 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.1,
    maxWidth: 220,
  },
  value: {
    fontSize: 12,
    fontWeight: "800",
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
