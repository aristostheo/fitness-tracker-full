// components/profile/premium/QuickActionsRow.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha } from "./ui";

function Action({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: withAlpha(
            colors.card,
            isDark ? (pressed ? 0.22 : 0.18) : pressed ? 0.7 : 0.55
          ),
          borderColor: withAlpha(colors.border, pressed ? 0.85 : 0.65),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: withAlpha(colors.primary, 0.14) },
        ]}
      >
        <Ionicons name={icon} size={16} color={colors.text} />
      </View>
      <Text
        style={{ color: colors.text, fontWeight: "900", fontSize: 12 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function QuickActionsRow(props: {
  onScanMeal: () => void;
  onLogWorkout: () => void;
  onAddCheckIn: () => void;
  onBadges: () => void;
  onFriends: () => void;
}) {
  const { colors } = useTheme();
  return (
    <GlassCard>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
        Quick actions
      </Text>
      <Text style={{ color: colors.muted, marginTop: 6 }}>
        Fast, lightweight, no friction.
      </Text>

      <View style={{ height: 12 }} />

      <View style={styles.grid}>
        <Action
          icon="scan-outline"
          label="Scan meal"
          onPress={props.onScanMeal}
        />
        <Action
          icon="barbell-outline"
          label="Log workout"
          onPress={props.onLogWorkout}
        />
        <Action
          icon="analytics-outline"
          label="Check-in"
          onPress={props.onAddCheckIn}
        />
        <Action icon="ribbon-outline" label="Badges" onPress={props.onBadges} />
        <Action
          icon="people-outline"
          label="Friends"
          onPress={props.onFriends}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: {
    width: "31%",
    minWidth: 96,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    gap: 8,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
