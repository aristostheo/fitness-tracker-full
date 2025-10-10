// components/profile/AccordionCard.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import Glass from "./ui/Glass";

export default function AccordionCard({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
}>) {
  const { colors, isDark } = useTheme();
  const a = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(a, {
      toValue: open ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [open]);

  const rotate = a.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  return (
    <Glass
      tint={isDark ? "dark" : "light"}
      intensity={30}
      style={{ borderRadius: 20 }}
    >
      {/* Header (always visible) */}
      <Pressable
        onPress={onToggle}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>{title}</Text>
          {!!subtitle && (
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {subtitle}
            </Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Animated.View>
      </Pressable>

      {/* Body (mount only when open so the card truly collapses) */}
      {open ? (
        <Animated.View
          style={{
            paddingHorizontal: 14,
            paddingBottom: 14,
            gap: 12,
            opacity: a,
            transform: [{ scaleY: a }],
          }}
        >
          {children}
        </Animated.View>
      ) : null}
    </Glass>
  );
}
