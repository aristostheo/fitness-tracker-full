// app/(modals)/full-calendar.tsx
import React from "react";
import { Pressable, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import FullCalendarScreen from "@/components/calendar/FullCalendarScreen";

export default function FullCalendarRoute() {
  const router = useRouter();
  const { colors, isDark } = useTheme(); // ⬅️ get isDark from useTheme

  return (
    <>
      <Stack.Screen
        options={{
          title: "Full Calendar",
          headerLargeTitle: false,
          headerTransparent: true,
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
              }}
            >
              <Ionicons name="chevron-down" size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Close
              </Text>
            </Pressable>
          ),
        }}
      />
      <FullCalendarScreen hideHeader={false} />
    </>
  );
}
