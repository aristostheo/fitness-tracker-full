// components/accountCenter/AccountCenterSection.tsx
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";

function GlassPanel({
  children,
  pad = 14,
}: React.PropsWithChildren<{ pad?: number }>) {
  const { colors, isDark } = useTheme() as any;
  if (Platform.OS === "ios") {
    return (
      <View style={[styles.panelOuter, { borderColor: colors.border }]}>
        <BlurView
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          intensity={24}
          style={{ padding: pad }}
        >
          {children}
        </BlurView>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.panelOuter,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: pad,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function AccountCenterSection({
  title,
  subtitle,
  footer,
  children,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  footer?: string;
}>) {
  const { colors } = useTheme() as any;

  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ paddingHorizontal: 6, marginBottom: 10 }}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        )}
      </View>

      <GlassPanel pad={12}>
        <View style={{ gap: 10 }}>{children}</View>
        {!!footer && (
          <Text style={[styles.footer, { color: colors.muted }]}>{footer}</Text>
        )}
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  panelOuter: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  footer: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    paddingHorizontal: 2,
  },
});
