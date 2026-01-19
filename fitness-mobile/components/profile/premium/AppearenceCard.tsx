// components/profile/premium/AppearanceCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";

export function AppearanceCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <GlassCard>
      <View style={styles.row}>
        <Ionicons name="color-palette-outline" size={16} color={colors.text} />
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
          Appearance
        </Text>
        <Text style={{ color: colors.muted, marginLeft: "auto", fontSize: 12 }}>
          System / Light / Dark
        </Text>
      </View>

      <View style={{ height: 10 }} />
      {children}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
