import React, { useMemo } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";

export type FriendsTab = "friends" | "requests" | "sent";

const TABS: { key: FriendsTab; label: string }[] = [
  { key: "friends", label: "Friends" },
  { key: "requests", label: "Requests" },
  { key: "sent", label: "Sent" },
];

export function SegmentedControlPremium({
  value,
  onChange,
}: {
  value: FriendsTab;
  onChange: (v: FriendsTab) => void;
}) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  const w = useMemo(() => {
    const container = Math.min(width - 32, 520);
    return { container, item: (container - 8) / 3 };
  }, [width]);

  const index = TABS.findIndex((t) => t.key === value);
  const left = 4 + index * w.item;

  return (
    <View style={{ alignItems: "center" }}>
      <BlurView
        intensity={isDark ? 38 : 60}
        style={{
          width: w.container,
          borderRadius: 16,
          padding: 4,
          overflow: "hidden",
          backgroundColor: isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.55)",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
        }}
      >
        {/* Animated glossy pill */}
        <MotiView
          animate={{ translateX: left }}
          transition={{
            type: "spring",
            damping: 18,
            stiffness: 160,
            mass: 0.8,
          }}
          style={{
            position: "absolute",
            top: 4,
            left: 0,
            width: w.item,
            height: 42,
            borderRadius: 12,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.10)"
              : "rgba(255,255,255,0.85)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.06)",
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.28 : 0.1,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        />

        <View style={{ flexDirection: "row" }}>
          {TABS.map((t) => {
            const active = t.key === value;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange(t.key);
                }}
                style={{
                  width: w.item,
                  height: 42,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel={`Show ${t.label}`}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={{
                    color: active ? colors.text : colors.muted,
                    fontWeight: active ? "800" : "700",
                    letterSpacing: -0.1,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
