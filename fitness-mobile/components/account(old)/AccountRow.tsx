// components/account/AccountRow.tsx
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  hint?: string;

  onPress?: () => void;
  right?: "chevron" | "none";
  danger?: boolean;
  disabled?: boolean;

  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (v: boolean) => void;

  testID?: string;
  accessibilityLabel?: string;
};

export function AccountRow({
  icon,
  label,
  value,
  hint,
  onPress,
  right = "chevron",
  danger,
  disabled,
  toggle,
  toggleValue,
  onToggleChange,
  testID,
  accessibilityLabel,
}: Props) {
  const { colors, isDark } = useTheme();

  const pressable = !!onPress && !toggle;
  const RowWrap: any = pressable ? Pressable : View;

  const fg = danger ? colors.danger : colors.text;
  const sub = colors.muted;
  const line = colors.border;

  return (
    <RowWrap
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole={pressable ? "button" : "none"}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      style={({ pressed }: any) => [
        styles.row,
        { borderBottomColor: line, opacity: disabled ? 0.5 : 1 },
        pressable && pressed && styles.pressed,
      ]}
    >
      <View style={styles.left}>
        {icon ? (
          <View
            style={[
              styles.iconPill,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(11,18,32,0.05)",
              },
            ]}
          >
            <Ionicons name={icon} size={16} color={fg} />
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
            {label}
          </Text>

          {hint ? (
            <Text style={[styles.hint, { color: sub }]} numberOfLines={2}>
              {hint}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {value ? (
          <Text style={[styles.value, { color: sub }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}

        {toggle ? (
          <Switch
            value={!!toggleValue}
            onValueChange={onToggleChange}
            trackColor={{ true: colors.primary }}
            ios_backgroundColor={
              isDark ? "rgba(255,255,255,0.15)" : "rgba(11,18,32,0.15)"
            }
            accessibilityRole="switch"
          />
        ) : right === "chevron" ? (
          <Ionicons
            name={Platform.OS === "ios" ? "chevron-forward" : "chevron-forward"}
            size={18}
            color={sub}
            style={{ marginLeft: 8 }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : null}
      </View>
    </RowWrap>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  iconPill: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  hint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  value: {
    fontSize: 13,
    fontWeight: "700",
  },
});
