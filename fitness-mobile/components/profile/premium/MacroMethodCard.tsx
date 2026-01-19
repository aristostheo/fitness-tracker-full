// components/profile/premium/MacroMethodCard.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/content/ThemeProvider";
import { GlassCard } from "./GlassCard";
import { withAlpha } from "./ui";

type MacroMethod = "proteinPerKg" | "percent" | "cycling";

export function MacroMethodCard(props: {
  value: MacroMethod;
  onChange: (v: MacroMethod) => void;
  hideHeader?: boolean;
  proteinPerKg: string;
  onChangeProteinPerKg: (v: string) => void;
  proteinPct: string;
  carbPct: string;
  fatPct: string;
  onChangeProteinPct: (v: string) => void;
  onChangeCarbPct: (v: string) => void;
  onChangeFatPct: (v: string) => void;
  trainingCarbPct: string;
  restCarbPct: string;
  trainingFatPct: string;
  restFatPct: string;
  onChangeTrainingCarbPct: (v: string) => void;
  onChangeRestCarbPct: (v: string) => void;
  onChangeTrainingFatPct: (v: string) => void;
  onChangeRestFatPct: (v: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const inputBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#000000", 0.05);
  const inputBorder = isDark
    ? withAlpha("#FFFFFF", 0.12)
    : withAlpha("#000000", 0.08);

  const Item = ({
    k,
    title,
    subtitle,
    icon,
  }: {
    k: MacroMethod;
    title: string;
    subtitle: string;
    icon: any;
  }) => {
    const active = props.value === k;
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          props.onChange(k);
        }}
        style={({ pressed }) => [
          styles.item,
          {
            borderColor: active
              ? withAlpha(colors.primary, 0.35)
              : withAlpha(colors.border, 0.7),
            backgroundColor: active
              ? withAlpha(colors.primary, pressed ? 0.18 : 0.14)
              : withAlpha(
                  colors.card,
                  isDark ? (pressed ? 0.22 : 0.16) : pressed ? 0.75 : 0.6
                ),
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Macro method: ${title}`}
      >
        <View
          style={[
            styles.icon,
            { backgroundColor: withAlpha(colors.text, isDark ? 0.08 : 0.06) },
          ]}
        >
          <Ionicons name={icon} size={16} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>{title}</Text>
          <Text style={{ color: colors.muted, marginTop: 2, lineHeight: 16 }}>
            {subtitle}
          </Text>
        </View>
        {active ? (
          <Ionicons
            name="checkmark-circle-outline"
            size={18}
            color={colors.text}
          />
        ) : (
          <Ionicons
            name="ellipse-outline"
            size={18}
            color={withAlpha(colors.muted, 0.8)}
          />
        )}
      </Pressable>
    );
  };

  return (
    <GlassCard>
      {!props.hideHeader ? (
        <>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
            Macro method
          </Text>
          <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 18 }}>
            Choose how targets are derived. You can switch anytime — no “wrong”
            choice.
          </Text>
          <View style={{ height: 12 }} />
        </>
      ) : null}

      <View style={{ gap: 10 }}>
        <Item
          k="proteinPerKg"
          title="Protein-first"
          subtitle="Stable. Great for recomp, cut, and consistency."
          icon="nutrition-outline"
        />
        <Item
          k="percent"
          title="Macro percentages"
          subtitle="Flexible splits. Useful if you prefer ratios."
          icon="pie-chart-outline"
        />
        <Item
          k="cycling"
          title="Cycling"
          subtitle="Vary carbs/fats across days. More advanced."
          icon="sync-outline"
        />
      </View>

      {props.value === "proteinPerKg" ? (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: withAlpha(colors.card, 0.18),
              borderColor: withAlpha(colors.border, 0.32),
            },
          ]}
        >
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            Protein target
          </Text>
          <Text style={[styles.panelSub, { color: colors.muted }]}>
            Set grams per kg of bodyweight.
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              value={props.proteinPerKg}
              onChangeText={props.onChangeProteinPerKg}
              keyboardType="decimal-pad"
              placeholder="e.g. 1.8"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                },
              ]}
            />
            <Text style={[styles.unit, { color: colors.muted }]}>g/kg</Text>
          </View>
        </View>
      ) : null}

      {props.value === "percent" ? (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: withAlpha(colors.card, 0.18),
              borderColor: withAlpha(colors.border, 0.32),
            },
          ]}
        >
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            Macro split
          </Text>
          <Text style={[styles.panelSub, { color: colors.muted }]}>
            Set your preferred percentage split.
          </Text>
          <View style={styles.grid}>
            <LabeledInput
              label="Protein %"
              value={props.proteinPct}
              onChangeText={props.onChangeProteinPct}
              colors={{ text: colors.text, muted: colors.muted }}
              bg={inputBg}
              border={inputBorder}
            />
            <LabeledInput
              label="Carbs %"
              value={props.carbPct}
              onChangeText={props.onChangeCarbPct}
              colors={{ text: colors.text, muted: colors.muted }}
              bg={inputBg}
              border={inputBorder}
            />
            <LabeledInput
              label="Fat %"
              value={props.fatPct}
              onChangeText={props.onChangeFatPct}
              colors={{ text: colors.text, muted: colors.muted }}
              bg={inputBg}
              border={inputBorder}
            />
          </View>
        </View>
      ) : null}

      {props.value === "cycling" ? (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: withAlpha(colors.card, 0.18),
              borderColor: withAlpha(colors.border, 0.32),
            },
          ]}
        >
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            Cycling ratios
          </Text>
          <Text style={[styles.panelSub, { color: colors.muted }]}>
            Adjust carb/fat split for training vs rest days.
          </Text>
          <Text style={[styles.subHeader, { color: colors.muted }]}>
            Training day
          </Text>
          <View style={styles.grid}>
            <LabeledInput
              label="Carbs %"
              value={props.trainingCarbPct}
              onChangeText={props.onChangeTrainingCarbPct}
              colors={{ text: colors.text, muted: colors.muted }}
              bg={inputBg}
              border={inputBorder}
            />
            <LabeledInput
              label="Fat %"
              value={props.trainingFatPct}
              onChangeText={props.onChangeTrainingFatPct}
              colors={{ text: colors.text, muted: colors.muted }}
              bg={inputBg}
              border={inputBorder}
            />
          </View>
          <Text style={[styles.subHeader, { color: colors.muted }]}>
            Rest day
          </Text>
          <View style={styles.grid}>
            <LabeledInput
              label="Carbs %"
              value={props.restCarbPct}
              onChangeText={props.onChangeRestCarbPct}
              colors={{ text: colors.text, muted: colors.muted }}
              bg={inputBg}
              border={inputBorder}
            />
            <LabeledInput
              label="Fat %"
              value={props.restFatPct}
              onChangeText={props.onChangeRestFatPct}
              colors={{ text: colors.text, muted: colors.muted }}
              bg={inputBg}
              border={inputBorder}
            />
          </View>
        </View>
      ) : null}
    </GlassCard>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  colors,
  bg,
  border,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: { text: string; muted: string };
  bg: string;
  border: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: bg, borderColor: border },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  panel: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  panelTitle: { fontSize: 13.5, fontWeight: "900" },
  panelSub: { fontSize: 12.5, fontWeight: "600" },
  subHeader: { fontSize: 12, fontWeight: "800", marginTop: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontWeight: "800",
    minWidth: 110,
  },
  unit: { fontSize: 12.5, fontWeight: "800" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  field: { minWidth: 120, flex: 1 },
  fieldLabel: { fontSize: 11.5, fontWeight: "800", marginBottom: 6 },
});
