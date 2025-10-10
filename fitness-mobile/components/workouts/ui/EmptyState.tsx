// components/workouts/ui/EmptyState.tsx
import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/Card";
import { useTheme } from "@/content/ThemeProvider";

export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <Card style={{ alignItems: "center", gap: 6, paddingVertical: 28 }}>
      <Text style={{ fontSize: 36 }}>🗓️</Text>
      <Text style={{ color: colors.text, fontWeight: "800" }}>{title}</Text>
      {!!subtitle && <Text style={{ color: colors.muted }}>{subtitle}</Text>}
    </Card>
  );
}
