import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

export type FriendCardChip = {
  key: string;
  label: string;
  tone?: "amber" | "green" | "purple" | "gray";
};

export function FriendRowPremium({
  displayName,
  uidLabel,
  activitySummary,
  accentColor,
  streakRingTone,
  nicknameMissing = false,
  onAddNickname,
  chips,
  canPing,
  pingCooldownLabel,
  onPress,
  onPing,
}: {
  displayName: string;
  uidLabel: string;
  activitySummary: string;
  accentColor: string;
  streakRingTone: "gray" | "green" | "gold";
  nicknameMissing?: boolean;
  onAddNickname?: () => void;
  chips: FriendCardChip[];
  canPing: boolean;
  pingCooldownLabel?: string;
  onPress: () => void;
  onPing: () => void;
}) {
  const { colors } = useTheme();

  const ringColor =
    streakRingTone === "gold"
      ? "#FFC107"
      : streakRingTone === "green"
      ? "#4CAF50"
      : withAlpha(colors.text, 0.14);

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            {
              backgroundColor: pressed ? withAlpha(colors.text, 0.04) : "#1A1A24",
              borderColor: withAlpha(colors.text, 0.08),
            },
          ]}
        >
          <View style={[styles.avatarRing, { borderColor: ringColor }]}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: withAlpha(accentColor, 0.2),
                  borderColor: withAlpha(accentColor, 0.32),
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.text }]}>
                {(displayName || "F")[0]?.toUpperCase() || "F"}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.name, { color: colors.text }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {nicknameMissing ? (
                <Pressable onPress={onAddNickname}>
                  <Text style={styles.nicknamePrompt}>Add nickname →</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={[styles.uid, { color: colors.muted }]} numberOfLines={1}>
              {uidLabel}
            </Text>

            <Text
              style={[styles.summary, { color: colors.muted }]}
              numberOfLines={1}
            >
              {activitySummary}
            </Text>

            <View
              style={{
                marginTop: 12,
                height: 1,
                backgroundColor: withAlpha(colors.text, 0.06),
              }}
            />

            <View style={styles.chipsRow}>
              {chips.slice(0, 3).map((chip) => {
                const tone =
                  chip.tone === "amber"
                    ? "#FFC107"
                    : chip.tone === "green"
                    ? "#4CAF50"
                    : chip.tone === "purple"
                    ? "#6C63FF"
                    : "#7A7A86";
                return (
                  <View
                    key={chip.key}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: withAlpha(tone, chip.tone === "gray" ? 0.08 : 0.14),
                        borderColor: withAlpha(tone, chip.tone === "gray" ? 0.14 : 0.24),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: chip.tone === "gray" ? colors.muted : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {chip.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={onPing}
            hitSlop={10}
            style={({ pressed: pingPressed }) => [
              styles.pingWrap,
              {
                backgroundColor: canPing
                  ? withAlpha("#6C63FF", pingPressed ? 0.28 : 0.18)
                  : pingPressed
                  ? withAlpha(colors.text, 0.1)
                  : withAlpha(colors.text, 0.04),
                borderColor: canPing
                  ? withAlpha("#6C63FF", 0.34)
                  : withAlpha(colors.text, 0.12),
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={canPing ? "#C9C5FF" : colors.muted}
            />
            {pingCooldownLabel ? (
              <Text style={[styles.cooldown, { color: colors.muted }]}>
                {pingCooldownLabel}
              </Text>
            ) : null}
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "900",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.25,
    flexShrink: 1,
  },
  nicknamePrompt: {
    color: "#9C95FF",
    fontSize: 12,
    fontWeight: "800",
  },
  uid: {
    marginTop: 4,
    fontSize: 11.5,
    fontWeight: "700",
  },
  summary: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
  },
  chipsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: "900",
  },
  pingWrap: {
    width: 76,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  cooldown: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
});
