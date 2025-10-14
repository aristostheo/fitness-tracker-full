import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";

const palettes: Record<string, { a: string; b: string; ink: string }> = {
  primary: { a: "#3B82F6", b: "#60A5FA", ink: "#0b0f18" },
  violet: { a: "#8B5CF6", b: "#C084FC", ink: "#0b0f18" },
  cyan: { a: "#06B6D4", b: "#22D3EE", ink: "#0b0f18" },
  green: { a: "#22C55E", b: "#86EFAC", ink: "#0b0f18" },
};

export default function InsightCard({
  title,
  icon,
  primary,
  secondary,
  accent = "primary",
  footer,
  onPress,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  primary: string;
  secondary?: string;
  accent?: keyof typeof palettes;
  footer?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  const { colors, isDark } = useTheme();
  const pal = palettes[accent];

  const Container = ({ children: inner }: any) =>
    Platform.OS === "ios" ? (
      <BlurView
        intensity={20}
        tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
        style={{
          borderRadius: 18,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <LinearGradient
          colors={[pal.a + "22", pal.b + "22"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: "absolute", inset: 0 }}
        />
        <View style={{ padding: 14, gap: 8 }}>{inner}</View>
      </BlurView>
    ) : (
      <LinearGradient
        colors={[pal.a + "22", pal.b + "22"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
        }}
      >
        {inner}
      </LinearGradient>
    );

  const content = (
    <Container>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pal.a + "33",
            borderWidth: 1,
            borderColor: pal.a + "66",
          }}
        >
          <Ionicons name={icon} size={16} color={pal.a} />
        </View>
        <Text style={{ color: colors.text, fontWeight: "800" }}>{title}</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
          {primary}
        </Text>
        {!!secondary && (
          <Text style={{ color: colors.muted, fontWeight: "600" }}>
            {secondary}
          </Text>
        )}
      </View>

      {children}

      {!!footer && (
        <Text style={{ color: colors.muted, fontSize: 12 }}>{footer}</Text>
      )}
    </Container>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}
