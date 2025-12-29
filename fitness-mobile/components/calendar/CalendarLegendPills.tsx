// components/calendar/CalendarLegendPills.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import { ACTIVITY_META } from "@/services/calendar";

export default function CalendarLegendPills() {
  const { colors, isDark } = useTheme();

  const items = useMemo(() => Object.values(ACTIVITY_META), []);

  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          color: colors.muted,
          fontWeight: "900",
          fontSize: 12,
          letterSpacing: 0.5,
        }}
      >
        INDICATORS
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((m) => (
          <View
            key={m.key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: withAlpha(m.color, isDark ? 0.16 : 0.12),
              borderWidth: 1,
              borderColor: withAlpha(m.color, isDark ? 0.38 : 0.24),
            }}
          >
            <Text style={{ fontWeight: "900" }}>{m.emoji}</Text>
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 12 }}
            >
              {m.label}
            </Text>
          </View>
        ))}
      </View>

      <Text
        style={{
          color: withAlpha(colors.muted, 0.85),
          fontSize: 12,
          lineHeight: 16,
        }}
      >
        Multiple activities stack on the same day. Tap a day to see the full
        breakdown.
      </Text>
    </View>
  );
}
