// components/profile/bodyTwin/BodyTwinCustomizeSheet.tsx
import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";
import type {
  BodyTwinBaseAvatar,
  BodyTwinConsent,
} from "@/services/profile/bodyTwin/types";

const COLOR_PRESETS = [
  "#4B8DFF",
  "#7C5CFF",
  "#2BC48A",
  "#FF5C8A",
  "#FFB020",
  "#C7CEDB",
];

export function BodyTwinCustomizeSheet(props: {
  visible: boolean;
  onClose: () => void;
  base: BodyTwinBaseAvatar;
  consent: BodyTwinConsent;
  onChangeBase: (patch: Partial<BodyTwinBaseAvatar>) => void;
  onChangeConsent: (patch: Partial<BodyTwinConsent>) => void;
  onReset: () => void;
}) {
  const { colors, isDark } = useTheme();

  const surface = isDark
    ? withAlpha("#0B0B0F", 0.92)
    : withAlpha("#FFFFFF", 0.92);

  const sectionTitleColor = withAlpha(colors.text, isDark ? 0.78 : 0.7);

  const Row = (p: { title: string; desc?: string; right: React.ReactNode }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{p.title}</Text>
        {p.desc ? (
          <Text
            style={[styles.rowDesc, { color: withAlpha(colors.text, 0.6) }]}
          >
            {p.desc}
          </Text>
        ) : null}
      </View>
      {p.right}
    </View>
  );

  const Pill = (p: {
    label: string;
    selected?: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        p.onPress();
      }}
      style={[
        styles.pill,
        {
          backgroundColor: p.selected
            ? withAlpha(colors.primary ?? "#4B8DFF", isDark ? 0.26 : 0.16)
            : withAlpha(colors.text, 0.06),
          borderColor: p.selected
            ? withAlpha(colors.primary ?? "#4B8DFF", isDark ? 0.36 : 0.22)
            : withAlpha(colors.text, 0.1),
        },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          {
            color: p.selected
              ? colors.primary ?? "#4B8DFF"
              : withAlpha(colors.text, 0.85),
          },
        ]}
      >
        {p.label}
      </Text>
    </Pressable>
  );

  const Toggle = (p: { value: boolean; onChange: (v: boolean) => void }) => (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        p.onChange(!p.value);
      }}
      style={[
        styles.toggle,
        {
          backgroundColor: p.value
            ? withAlpha(colors.primary ?? "#4B8DFF", 0.85)
            : withAlpha(colors.text, 0.14),
        },
      ]}
    >
      <View
        style={[
          styles.toggleKnob,
          { transform: [{ translateX: p.value ? 18 : 0 }] },
        ]}
      />
    </Pressable>
  );

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: surface,
              borderColor: withAlpha(colors.text, isDark ? 0.1 : 0.08),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.hTitle, { color: colors.text }]}>
              Body Twin
            </Text>
            <Pressable
              onPress={props.onClose}
              style={[
                styles.close,
                { backgroundColor: withAlpha(colors.text, 0.08) },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: "800" }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 18 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.section, { color: sectionTitleColor }]}>
              Consent & Safety
            </Text>

            <Row
              title="Enable Body Twin"
              desc="Your avatar evolves gently with your metrics."
              right={
                <Toggle
                  value={props.consent.enabled}
                  onChange={(v) => props.onChangeConsent({ enabled: v })}
                />
              }
            />

            <Row
              title="Future Self preview"
              desc="Shows a preview overlay. It’s not a promise."
              right={
                <Toggle
                  value={props.consent.allowFutureSelf}
                  onChange={(v) =>
                    props.onChangeConsent({ allowFutureSelf: v })
                  }
                />
              }
            />

            <Row
              title="Hide numbers"
              desc="Avoid showing exact weight/measurements here."
              right={
                <Toggle
                  value={props.consent.hideNumbers}
                  onChange={(v) => props.onChangeConsent({ hideNumbers: v })}
                />
              }
            />

            <Row
              title="Achievement celebrations"
              desc="Unlock visual rewards for consistency."
              right={
                <Toggle
                  value={props.consent.allowAchievements}
                  onChange={(v) =>
                    props.onChangeConsent({ allowAchievements: v })
                  }
                />
              }
            />

            <Text style={[styles.section, { color: sectionTitleColor }]}>
              Style
            </Text>

            <Text
              style={[
                styles.subSection,
                { color: withAlpha(colors.text, 0.7) },
              ]}
            >
              Skin tone
            </Text>
            <View style={styles.pillRow}>
              {(["porcelain", "light", "medium", "tan", "deep"] as const).map(
                (t) => (
                  <Pill
                    key={t}
                    label={t}
                    selected={props.base.skinTone === t}
                    onPress={() => props.onChangeBase({ skinTone: t })}
                  />
                )
              )}
            </View>

            <Text
              style={[
                styles.subSection,
                { color: withAlpha(colors.text, 0.7) },
              ]}
            >
              Hair
            </Text>
            <View style={styles.pillRow}>
              {(["buzz", "short", "medium", "long", "bun"] as const).map(
                (t) => (
                  <Pill
                    key={t}
                    label={t}
                    selected={props.base.hair === t}
                    onPress={() => props.onChangeBase({ hair: t })}
                  />
                )
              )}
            </View>

            <Text
              style={[
                styles.subSection,
                { color: withAlpha(colors.text, 0.7) },
              ]}
            >
              Outfit
            </Text>
            <View style={styles.pillRow}>
              {(["minimal", "athleisure", "hoodie"] as const).map((t) => (
                <Pill
                  key={t}
                  label={t}
                  selected={props.base.outfit === t}
                  onPress={() => props.onChangeBase({ outfit: t })}
                />
              ))}
            </View>

            <Text
              style={[
                styles.subSection,
                { color: withAlpha(colors.text, 0.7) },
              ]}
            >
              Presentation
            </Text>
            <View style={styles.pillRow}>
              {(["neutral", "athletic", "soft"] as const).map((t) => (
                <Pill
                  key={t}
                  label={t}
                  selected={props.base.presentation === t}
                  onPress={() => props.onChangeBase({ presentation: t })}
                />
              ))}
            </View>

            <Text
              style={[
                styles.subSection,
                { color: withAlpha(colors.text, 0.7) },
              ]}
            >
              Accent color
            </Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((c) => {
                const selected =
                  props.base.outfitColorHex.toLowerCase() === c.toLowerCase();
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      Haptics.selectionAsync();
                      props.onChangeBase({ outfitColorHex: c });
                    }}
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: c,
                        borderColor: selected
                          ? withAlpha(colors.primary ?? "#4B8DFF", 0.95)
                          : withAlpha("#000000", 0.12),
                        transform: [{ scale: selected ? 1.06 : 1 }],
                      },
                    ]}
                  />
                );
              })}
            </View>

            <Text style={[styles.section, { color: sectionTitleColor }]}>
              Reset
            </Text>
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning
                );
                props.onReset();
              }}
              style={[
                styles.reset,
                {
                  backgroundColor: withAlpha("#FF3B30", isDark ? 0.18 : 0.1),
                  borderColor: withAlpha("#FF3B30", 0.22),
                },
              ]}
            >
              <Text style={[styles.resetText, { color: "#FF3B30" }]}>
                Reset Body Twin
              </Text>
            </Pressable>

            <Text
              style={[styles.note, { color: withAlpha(colors.text, 0.52) }]}
            >
              Body Twin is a stylized visualization for motivation. It is not a
              medical assessment or an exact body representation.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  hTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  subSection: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
  },
  row: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  rowDesc: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 16,
    padding: 3,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
    textTransform: "lowercase",
  },
  colorRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 28,
    borderWidth: 2,
  },
  reset: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  resetText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    paddingBottom: 10,
  },
});
