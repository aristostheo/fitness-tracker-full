// components/profile/StickySaveBar.tsx
import React from "react";
import { View, Pressable, Text, ActivityIndicator } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import Glass from "./ui/Glass";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StickySaveBar({
  onSave,
  saving,
  status, // null | "ok" | "err"
}: {
  onSave: () => void | Promise<void>;
  saving?: boolean;
  status?: null | "ok" | "err";
}) {
  const { colors, isDark } = useTheme();
  const label = saving
    ? "Saving…"
    : status === "ok"
    ? "Saved"
    : status === "err"
    ? "Failed"
    : "Save changes";

  const fg = colors.buttonText;
  const bg =
    status === "ok"
      ? "#10b981"
      : status === "err"
      ? "#ef4444"
      : colors.buttonBg;
  const insets = useSafeAreaInsets();
  const TAB_BAR_BASE = 58 + Math.max(0, insets.bottom - 8);

  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: TAB_BAR_BASE + 12, // sits above the tab bar
      }}
    >
      <Glass tint={isDark ? "dark" : "light"} intensity={28} radius={16}>
        <Pressable
          onPress={!saving ? onSave : undefined}
          style={{
            backgroundColor: bg,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          {saving ? (
            <ActivityIndicator color={fg} />
          ) : status === "ok" ? (
            <Ionicons name="checkmark-circle" size={18} color={fg} />
          ) : status === "err" ? (
            <Ionicons name="alert-circle" size={18} color={fg} />
          ) : null}
          <Text style={{ color: fg, fontWeight: "800", letterSpacing: 0.3 }}>
            {label}
          </Text>
        </Pressable>
      </Glass>
    </View>
  );
}
