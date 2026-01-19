// components/settings/premium/SettingsPrimitives.tsx
// Drop-in ✅ Section + Row primitives with premium glass styling

import React, { ReactNode, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { withAlpha } from "@/lib/color";

const hit = { top: 10, bottom: 10, left: 10, right: 10 };

export function SettingsSection({
  title,
  subtitle,
  footer,
  children,
  colors,
  isDark,
}: {
  title: string;
  subtitle?: string;
  footer?: string;
  children: ReactNode;
  colors: any;
  isDark: boolean;
}) {
  const chrome = useMemo(() => {
    const card = withAlpha(colors.card, isDark ? 0.7 : 0.85);
    const border = withAlpha(colors.text, isDark ? 0.1 : 0.12);
    const sub = withAlpha(colors.text, isDark ? 0.62 : 0.7);
    return { card, border, sub };
  }, [colors, isDark]);

  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
      <View style={{ paddingHorizontal: 4, marginBottom: 8 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.sectionSub, { color: chrome.sub }]}>
            {subtitle}
          </Text>
        )}
      </View>

      <BlurView
        intensity={22}
        tint={isDark ? "dark" : "light"}
        style={[styles.sectionCard, { borderColor: chrome.border }]}
      >
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: chrome.card }]}
        />
        {children}
      </BlurView>

      {!!footer && (
        <Text style={[styles.footer, { color: chrome.sub }]}>{footer}</Text>
      )}
    </View>
  );
}

export function SettingsRow({
  icon,
  title,
  value,
  onPress,
  right,
  colors,
  isDark,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  colors: any;
  isDark: boolean;
  danger?: boolean;
}) {
  const scale = useSharedValue(1);

  const a = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const chrome = useMemo(() => {
    const hair = withAlpha(colors.text, isDark ? 0.1 : 0.12);
    const sub = withAlpha(colors.text, isDark ? 0.62 : 0.7);
    const iconBg = withAlpha(colors.text, isDark ? 0.08 : 0.06);
    const chev = withAlpha(colors.text, isDark ? 0.55 : 0.5);
    const dangerColor = "#ff4d4d";
    return { hair, sub, iconBg, chev, dangerColor };
  }, [colors, isDark]);

  const clickable = !!onPress;

  return (
    <Animated.View style={a}>
      <Pressable
        disabled={!clickable}
        onPress={async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
          } catch {}
          onPress?.();
        }}
        onPressIn={() => {
          if (!clickable) return;
          scale.value = withSpring(0.98, { damping: 18, stiffness: 220 });
        }}
        onPressOut={() => {
          if (!clickable) return;
          scale.value = withSpring(1, { damping: 18, stiffness: 220 });
        }}
        style={({ pressed }) => [
          styles.row,
          { opacity: pressed && clickable ? 0.94 : 1 },
        ]}
        hitSlop={hit}
      >
        <View style={[styles.iconWrap, { backgroundColor: chrome.iconBg }]}>
          <Ionicons
            name={icon}
            size={18}
            color={danger ? chrome.dangerColor : withAlpha(colors.text, 0.9)}
          />
        </View>

        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            style={[
              styles.rowTitle,
              { color: danger ? chrome.dangerColor : colors.text },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!!value && (
            <Text
              style={[styles.rowValue, { color: chrome.sub }]}
              numberOfLines={1}
            >
              {value}
            </Text>
          )}
        </View>

        {!!right ? (
          <View style={{ marginLeft: 8 }}>{right}</View>
        ) : clickable ? (
          <Ionicons name="chevron-forward" size={16} color={chrome.chev} />
        ) : null}
      </Pressable>

      <View style={[styles.hairline, { backgroundColor: chrome.hair }]} />
    </Animated.View>
  );
}

export function SettingsDivider({
  colors,
  isDark,
}: {
  colors: any;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: withAlpha(colors.text, isDark ? 0.1 : 0.12),
        marginVertical: 10,
      }}
    />
  );
}

export function SettingsPill({
  text,
  colors,
  isDark,
}: {
  text: string;
  colors: any;
  isDark: boolean;
}) {
  const bg = withAlpha(colors.text, isDark ? 0.06 : 0.05);
  const sub = withAlpha(colors.text, isDark ? 0.65 : 0.72);
  const border = withAlpha(colors.text, isDark ? 0.1 : 0.1);
  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <Text style={{ color: sub, fontSize: 12.5, lineHeight: 17 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
  sectionSub: { fontSize: 12, marginTop: 2 },
  sectionCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  footer: {
    fontSize: 11.5,
    marginTop: 8,
    paddingHorizontal: 6,
    lineHeight: 16,
  },
  row: {
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14.5, fontWeight: "700" },
  rowValue: { fontSize: 12.5, marginTop: 2 },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
    marginRight: 14,
  },
});
