import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { NutritionColors } from "./NutritionTheme";
import type { MealType, Macros } from "./NutritionTypes";
import { alpha } from "./utils";
import { GlassCard } from "./Glass";

type Props = {
  colors: NutritionColors;
  isDark: boolean;
  visible: boolean;
  defaultType?: MealType;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    amount?: string;
    mealType: MealType;
    macros: Macros;
    notes?: string;
  }) => void;
};

const TYPE_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

export default function AddMealSheet({
  colors,
  isDark,
  visible,
  defaultType,
  onClose,
  onSave,
}: Props) {
  const [mealType, setMealType] = useState<MealType>(defaultType ?? "lunch");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cal, setCal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (visible) {
      setMealType(defaultType ?? "lunch");
      setName("");
      setAmount("");
      setCal("");
      setP("");
      setC("");
      setF("");
      setNotes("");
    }
  }, [visible, defaultType]);

  const canSave = useMemo(
    () => name.trim().length >= 2 && Number(cal) >= 0,
    [name, cal]
  );

  const presets = useMemo(
    () => [
      {
        name: "Greek yogurt + berries",
        macros: { calories: 240, protein: 20, carbs: 26, fat: 6 },
      },
      {
        name: "Chicken bowl",
        macros: { calories: 620, protein: 45, carbs: 58, fat: 18 },
      },
      {
        name: "Protein shake",
        macros: { calories: 190, protein: 30, carbs: 6, fat: 3 },
      },
      {
        name: "Salmon + rice",
        macros: { calories: 720, protein: 45, carbs: 70, fat: 25 },
      },
    ],
    []
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close add meal sheet"
      >
        <Pressable
          style={[
            styles.sheet,
            {
              borderColor: alpha(colors.text, 0.1),
              backgroundColor: isDark
                ? alpha(colors.card, 0.18)
                : alpha(colors.card, 0.94),
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: colors.text }]}>Add meal</Text>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: alpha(colors.card, isDark ? 0.1 : 0.7) },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.kicker, { color: alpha(colors.text, 0.7) }]}>
              MEAL TYPE
            </Text>
            <View style={styles.typeRow}>
              {TYPE_ORDER.map((t) => {
                const active = t === mealType;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMealType(t);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set meal type to ${t}`}
                    style={({ pressed }) => [
                      styles.typePill,
                      {
                        borderColor: active
                          ? alpha(colors.primary, 0.45)
                          : alpha(colors.text, 0.1),
                        backgroundColor: active
                          ? alpha(colors.primary, 0.14)
                          : alpha(colors.card, isDark ? 0.08 : 0.65),
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.typeText, { color: colors.text }]}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={[
                styles.kicker,
                { color: alpha(colors.text, 0.7), marginTop: 14 },
              ]}
            >
              DETAILS
            </Text>

            <GlassCard
              colors={colors}
              isDark={isDark}
              style={{
                backgroundColor: alpha(colors.card, isDark ? 0.65 : 0.9),
              }}
              intensity={18}
            >
              <LabeledInput
                colors={colors}
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g., Chicken burrito"
              />
              <View style={{ height: 10 }} />
              <LabeledInput
                colors={colors}
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g., 1 bowl / 250g"
              />

              <View style={{ height: 12 }} />
              <Text style={[styles.kicker, { color: alpha(colors.text, 0.7) }]}>
                MACROS
              </Text>

              <View style={styles.macroGrid}>
                <SmallNumber
                  colors={colors}
                  label="Calories"
                  value={cal}
                  onChangeText={setCal}
                  placeholder="0"
                />
                <SmallNumber
                  colors={colors}
                  label="Protein (g)"
                  value={p}
                  onChangeText={setP}
                  placeholder="0"
                />
                <SmallNumber
                  colors={colors}
                  label="Carbs (g)"
                  value={c}
                  onChangeText={setC}
                  placeholder="0"
                />
                <SmallNumber
                  colors={colors}
                  label="Fat (g)"
                  value={f}
                  onChangeText={setF}
                  placeholder="0"
                />
              </View>

              <View style={{ height: 10 }} />
              <LabeledInput
                colors={colors}
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="How did it feel? Any cravings?"
                multiline
              />
            </GlassCard>

            <Text
              style={[
                styles.kicker,
                { color: alpha(colors.text, 0.7), marginTop: 14 },
              ]}
            >
              QUICK PICKS
            </Text>
            <View style={styles.presetRow}>
              {presets.map((pr) => (
                <Pressable
                  key={pr.name}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setName(pr.name);
                    setCal(String(pr.macros.calories));
                    setP(String(pr.macros.protein));
                    setC(String(pr.macros.carbs));
                    setF(String(pr.macros.fat));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Use preset ${pr.name}`}
                  style={({ pressed }) => [
                    styles.preset,
                    {
                      borderColor: alpha(colors.text, 0.1),
                      backgroundColor: alpha(colors.card, isDark ? 0.1 : 0.7),
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[styles.presetName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {pr.name}
                  </Text>
                  <Text
                    style={[
                      styles.presetMeta,
                      { color: alpha(colors.text, 0.65) },
                    ]}
                  >
                    {pr.macros.calories} kcal
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.bottomRow}>
              <Pressable
                onPress={() => {
                  if (!canSave) return;
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  onSave({
                    name,
                    amount: amount.trim() ? amount : undefined,
                    mealType,
                    macros: {
                      calories: Number(cal) || 0,
                      protein: Number(p) || 0,
                      carbs: Number(c) || 0,
                      fat: Number(f) || 0,
                    },
                    notes: notes.trim() ? notes : undefined,
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="Save meal"
                disabled={!canSave}
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: canSave
                      ? colors.primary
                      : alpha(colors.primary, 0.35),
                  },
                  pressed && canSave && { opacity: 0.85 },
                ]}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveText}>Save</Text>
              </Pressable>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={({ pressed }) => [
                  styles.cancelBtn,
                  { borderColor: alpha(colors.text, 0.14) },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LabeledInput({
  colors,
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  colors: NutritionColors;
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={[styles.label, { color: alpha(colors.text, 0.7) }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={alpha(colors.text, 0.35)}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: alpha(colors.text, 0.1),
            backgroundColor: alpha(colors.card, 0.45),
          },
          multiline && {
            height: 92,
            paddingTop: 12,
            textAlignVertical: "top" as any,
          },
        ]}
        multiline={multiline}
        accessibilityLabel={label}
      />
    </View>
  );
}

function SmallNumber({
  colors,
  label,
  value,
  onChangeText,
  placeholder,
}: {
  colors: NutritionColors;
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ flex: 1, minWidth: 120 }}>
      <Text style={[styles.label, { color: alpha(colors.text, 0.7) }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^\d.]/g, ""))}
        placeholder={placeholder}
        placeholderTextColor={alpha(colors.text, 0.35)}
        keyboardType="numeric"
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: alpha(colors.text, 0.1),
            backgroundColor: alpha(colors.card, 0.45),
          },
        ]}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    padding: 16,
    justifyContent: "flex-end",
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  kicker: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typePill: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  typeText: { fontSize: 13, fontWeight: "900", textTransform: "capitalize" },

  label: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800",
  },

  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },

  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  preset: { borderWidth: 1, borderRadius: 16, padding: 12, width: "48%" },
  presetName: { fontSize: 13, fontWeight: "900" },
  presetMeta: { marginTop: 4, fontSize: 12, fontWeight: "700" },

  bottomRow: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 8 },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  cancelBtn: {
    width: 110,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "900" },
});
