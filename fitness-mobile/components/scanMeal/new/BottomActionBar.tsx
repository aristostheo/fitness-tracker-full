// components/scanMeal/BottomActionBar.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useTheme } from "@/content/ThemeProvider";

export default function BottomActionBar({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  tertiaryLabel,
  onTertiary,
}: {
  primaryLabel: string;
  onPrimary?: (() => void) | undefined;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: (() => void) | undefined;
  tertiaryLabel?: string;
  onTertiary?: (() => void) | undefined;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        { borderTopColor: colors.border, backgroundColor: colors.bg },
      ]}
    >
      <View style={styles.row}>
        {secondaryLabel && onSecondary ? (
          <Pressable
            onPress={onSecondary}
            style={[
              styles.secondary,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryText, { color: colors.text }]}>
              {secondaryLabel}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onPrimary}
          disabled={!onPrimary || primaryDisabled}
          style={[
            styles.primary,
            {
              backgroundColor:
                !onPrimary || primaryDisabled ? colors.border : colors.primary,
              opacity: !onPrimary || primaryDisabled ? 0.75 : 1,
            },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        </Pressable>
      </View>

      {tertiaryLabel && onTertiary ? (
        <Pressable
          onPress={onTertiary}
          style={styles.tertiary}
          accessibilityRole="button"
        >
          <Text style={[styles.tertiaryText, { color: colors.muted }]}>
            {tertiaryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 22 : 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: "row", gap: 10 },
  secondary: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 13.5, fontWeight: "900" },
  primary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 13.5, fontWeight: "900", color: "white" },
  tertiary: { marginTop: 10, alignItems: "center" },
  tertiaryText: { fontSize: 12.5, fontWeight: "700" },
});
