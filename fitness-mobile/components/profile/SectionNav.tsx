// components/profile/SectionNav.tsx
import React from "react";
import { ScrollView, Pressable, Text } from "react-native";
import { useTheme } from "@/content/ThemeProvider";
import Glass from "./ui/Glass";

type Item = { key: string; label: string };

export default function SectionNav({
  items,
  activeKey,
  onPress,
}: {
  items: Item[];
  activeKey: string | null;
  onPress: (key: string) => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
    >
      {items.map((it) => {
        const active = it.key === activeKey;
        return (
          <Glass
            key={it.key}
            tint={isDark ? "dark" : "light"}
            intensity={24}
            radius={999}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              ...(active && {
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
              }),
            }}
          >
            <Pressable onPress={() => onPress(it.key)}>
              <Text
                style={{
                  color: active ? colors.primary : colors.text,
                  fontWeight: "800",
                  letterSpacing: 0.2,
                }}
              >
                {it.label}
              </Text>
            </Pressable>
          </Glass>
        );
      })}
    </ScrollView>
  );
}
