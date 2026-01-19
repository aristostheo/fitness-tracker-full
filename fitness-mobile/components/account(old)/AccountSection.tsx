// components/account/AccountSection.tsx
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";

type Props = {
  title?: string;
  footer?: string;
  children: React.ReactNode;
};

export function AccountSection({ title, footer, children }: Props) {
  const { isDark, colors } = useTheme();

  return (
    <View style={{ marginBottom: 14 }}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          {title}
        </Text>
      ) : null}

      <View style={styles.cardWrap}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={isDark ? 26 : 18}
            tint={isDark ? "dark" : "light"}
            style={[styles.card, { borderColor: colors.glassBorder }]}
          >
            {children}
          </BlurView>
        ) : (
          <View
            style={[
              styles.card,
              { borderColor: colors.glassBorder, backgroundColor: colors.card },
            ]}
          >
            {children}
          </View>
        )}
      </View>

      {footer ? (
        <Text style={[styles.footer, { color: colors.muted }]}>{footer}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginLeft: 6,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cardWrap: {
    borderRadius: 18,
    overflow: "hidden",
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: "hidden",
  },
  footer: {
    marginTop: 8,
    marginLeft: 6,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
});
