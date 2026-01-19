// components/scanMeal/AddFoodSheet.tsx
import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";
import type { DetectedFood } from "@/components/scanMeal/new/types";
import { clamp, roundTo } from "@/components/scanMeal/new/types";

export default function AddFoodSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (food: DetectedFood) => void;
}) {
  const { colors, isDark } = useTheme();

  const [name, setName] = useState("");
  const [amt, setAmt] = useState("1");
  const [unknownQty, setUnknownQty] = useState(false);

  const canAdd = useMemo(() => {
    if (!name.trim()) return false;
    if (unknownQty) return true;
    const amount = Number(amt);
    return Number.isFinite(amount) && amount > 0;
  }, [name, amt, unknownQty]);

  const commit = () => {
    const amount = unknownQty ? 1 : clamp(roundTo(Number(amt), 0.1), 0.1, 5000);
    const newFood: DetectedFood = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: name.trim(),
      confidence: "manual",
      portion: { amount, unit: "piece", multiplier: 1 },
      macros: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
      rationale: unknownQty ? "Added manually (qty unknown)" : "Added manually",
    };
    onAdd(newFood);
    setName("");
    setAmt("1");
    setUnknownQty(false);
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.wrap}>
        <BlurView
          tint={isDark ? "dark" : "light"}
          intensity={35}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
          style={styles.sheetWrap}
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.top}>
              <Text style={[styles.title, { color: colors.text }]}>
                Add item
              </Text>
              <Pressable
                onPress={onClose}
                style={[styles.close, { borderColor: colors.border }]}
              >
                <Ionicons name="close" size={16} color={colors.text} />
              </Pressable>
            </View>

            <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="E.g., sweet potato"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.03)",
                },
              ]}
            />

            <View style={styles.qtyRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.muted }]}>
                  Quantity
                </Text>
                <TextInput
                  value={amt}
                  onChangeText={setAmt}
                  keyboardType="decimal-pad"
                  editable={!unknownQty}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.03)",
                      opacity: unknownQty ? 0.6 : 1,
                    },
                  ]}
                />
              </View>
            </View>

            <Pressable
              onPress={() => setUnknownQty((v) => !v)}
              style={[
                styles.unknownRow,
                {
                  borderColor: colors.border,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <View
                style={[
                  styles.check,
                  {
                    borderColor: colors.border,
                    backgroundColor: unknownQty ? colors.primary : "transparent",
                  },
                ]}
              >
                {unknownQty ? (
                  <Ionicons name="checkmark" size={14} color="white" />
                ) : null}
              </View>
              <Text style={[styles.unknownText, { color: colors.text }]}>
                Quantity unknown
              </Text>
            </Pressable>

            <View style={styles.actions}>
              <Pressable
                onPress={commit}
                disabled={!canAdd}
                style={[
                  styles.add,
                  {
                    backgroundColor: canAdd ? colors.primary : colors.border,
                    opacity: canAdd ? 1 : 0.7,
                  },
                ]}
              >
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  sheetWrap: { width: "100%" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    paddingBottom: 18,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 15.5, fontWeight: "900" },
  close: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },

  label: { fontSize: 12, fontWeight: "800", marginBottom: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontWeight: "700",
  },

  qtyRow: { marginTop: 10 },
  unknownRow: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  unknownText: { fontSize: 13, fontWeight: "800" },

  actions: { marginTop: 14 },
  add: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: "white", fontSize: 13.5, fontWeight: "900" },
});
