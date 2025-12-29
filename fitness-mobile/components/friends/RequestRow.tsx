import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/content/ThemeProvider";

type RequestType = "requests" | "sent";
type Friend = {
  id: string;
  name: string;
  handle?: string;
  subtitle?: string;
  accent?: "aqua" | "mint" | "violet" | "sun" | "ruby" | "slate";
};

const ACCENTS: Record<NonNullable<Friend["accent"]>, [string, string]> = {
  aqua: ["rgba(92,225,255,0.85)", "rgba(255,90,200,0.35)"],
  mint: ["rgba(140,251,159,0.85)", "rgba(92,225,255,0.30)"],
  violet: ["rgba(180,120,255,0.85)", "rgba(255,90,200,0.28)"],
  sun: ["rgba(255,216,120,0.85)", "rgba(255,120,120,0.25)"],
  ruby: ["rgba(255,120,160,0.85)", "rgba(255,216,120,0.22)"],
  slate: ["rgba(180,190,210,0.65)", "rgba(140,251,159,0.18)"],
};

export function RequestCard({
  user,
  type,
  onAccept,
  onDecline,
  onCancel,
}: {
  user: Friend;
  type: RequestType;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const accent = useMemo(() => ACCENTS[user.accent ?? "aqua"], [user.accent]);

  return (
    <View
      style={{
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.06)",
        backgroundColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(255,255,255,0.72)",
      }}
    >
      <LinearGradient
        colors={
          isDark
            ? ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.00)"]
            : ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.55)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={[accent[0], accent[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                padding: 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark
                    ? "rgba(0,0,0,0.45)"
                    : "rgba(255,255,255,0.85)",
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(0,0,0,0.06)",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 16,
                  }}
                >
                  {user.name?.trim()?.[0]?.toUpperCase() ?? "U"}
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontWeight: "900",
                fontSize: 16,
                letterSpacing: -0.2,
              }}
            >
              {user.name}
            </Text>
            {!!user.handle && (
              <Text
                style={{ color: colors.muted, marginTop: 2, fontWeight: "700" }}
              >
                {user.handle}
              </Text>
            )}
            {!!user.subtitle && (
              <Text style={{ color: colors.muted, marginTop: 6 }}>
                {user.subtitle}
              </Text>
            )}
          </View>

          <BlurView
            intensity={isDark ? 26 : 45}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.55)",
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(0,0,0,0.06)",
            }}
          >
            <Text
              style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}
            >
              {type === "requests" ? "REQUEST" : "SENT"}
            </Text>
          </BlurView>
        </View>

        <View style={{ height: 12 }} />

        {type === "requests" ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ActionButton label="Accept" kind="primary" onPress={onAccept} />
            <ActionButton label="Decline" kind="neutral" onPress={onDecline} />
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ActionButton label="Pending" kind="neutral" disabled />
            <ActionButton label="Cancel" kind="neutral" onPress={onCancel} />
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function ActionButton({
  label,
  kind,
  onPress,
  disabled,
}: {
  label: string;
  kind: "primary" | "neutral";
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors, isDark } = useTheme();

  const bg =
    kind === "primary"
      ? colors.primary
      : isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(255,255,255,0.60)";

  const border =
    kind === "primary"
      ? "rgba(255,255,255,0.10)"
      : isDark
      ? "rgba(255,255,255,0.12)"
      : "rgba(0,0,0,0.06)";

  const text = kind === "primary" ? "#fff" : colors.text;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 46,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: disabled ? "rgba(150,150,150,0.20)" : bg,
        borderWidth: 1,
        borderColor: border,
        opacity: disabled ? 0.75 : pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={{ color: text, fontWeight: "900", letterSpacing: -0.1 }}>
        {label}
      </Text>
    </Pressable>
  );
}
