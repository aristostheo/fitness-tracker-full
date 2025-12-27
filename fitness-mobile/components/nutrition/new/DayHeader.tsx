import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { alpha, formatPrettyDate, parseDateKey, dateKey } from "./utils";
import type { NutritionColors } from "./NutritionTheme";

type Props = {
  colors: NutritionColors;
  isDark: boolean;
  dateKey: string;
  onPrev: () => void;
  onNext: () => void;
  onPickDate: (nextKey: string) => void;
};

export default function DayHeader({
  colors,
  isDark,
  dateKey: dk,
  onPrev,
  onNext,
  onPickDate,
}: Props) {
  const [open, setOpen] = useState(false);

  const isToday = useMemo(() => dk === dateKey(new Date()), [dk]);

  const pretty = useMemo(
    () => (isToday ? "Today" : formatPrettyDate(dk)),
    [dk, isToday]
  );

  return (
    <>
      <View style={styles.row}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onPrev();
          }}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: alpha(colors.card, isDark ? 0.1 : 0.65) },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Choose date"
          style={({ pressed }) => [
            styles.pill,
            {
              borderColor: alpha(colors.text, isDark ? 0.14 : 0.1),
              backgroundColor: alpha(colors.card, isDark ? 0.1 : 0.75),
            },
            pressed && { transform: [{ scale: 0.985 }] },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{pretty}</Text>
          <Ionicons
            name="calendar"
            size={16}
            color={alpha(colors.text, 0.75)}
            style={{ marginLeft: 8 }}
          />
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onNext();
          }}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: alpha(colors.card, isDark ? 0.1 : 0.65) },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      <DatePickerModal
        colors={colors}
        isDark={isDark}
        visible={open}
        dateKey={dk}
        onClose={() => setOpen(false)}
        onPick={(key) => {
          setOpen(false);
          onPickDate(key);
        }}
      />
    </>
  );
}

function DatePickerModal({
  colors,
  isDark,
  visible,
  dateKey: dk,
  onClose,
  onPick,
}: {
  colors: NutritionColors;
  isDark: boolean;
  visible: boolean;
  dateKey: string;
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  const [temp, setTemp] = useState(parseDateKey(dk));

  // Keep in sync when opening
  React.useEffect(() => {
    if (visible) setTemp(parseDateKey(dk));
  }, [visible, dk]);

  // Simple cross-platform: use a minimal “stepper” style picker (no native DatePicker dependency)
  const label = temp.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        accessibilityLabel="Close date picker"
        accessibilityRole="button"
      >
        <Pressable
          style={[
            styles.modal,
            {
              backgroundColor: alpha(colors.card, isDark ? 0.9 : 0.95),
              borderColor: alpha(colors.text, 0.1),
            },
          ]}
          onPress={() => {}}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Choose a day
          </Text>

          <View
            style={[
              styles.dateBox,
              {
                borderColor: alpha(colors.text, 0.1),
                backgroundColor: alpha(colors.bg, isDark ? 0.55 : 0.85),
              },
            ]}
          >
            <Text style={[styles.dateLabel, { color: colors.text }]}>
              {label}
            </Text>
          </View>

          <View style={styles.modalRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                const d = new Date(temp);
                d.setDate(d.getDate() - 1);
                setTemp(d);
              }}
              style={({ pressed }) => [
                styles.modalBtn,
                { backgroundColor: alpha(colors.primary, 0.14) },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Move back one day"
            >
              <Ionicons name="remove" size={18} color={colors.primary} />
              <Text style={[styles.modalBtnText, { color: colors.primary }]}>
                Day
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                const d = new Date(temp);
                d.setDate(d.getDate() + 1);
                setTemp(d);
              }}
              style={({ pressed }) => [
                styles.modalBtn,
                { backgroundColor: alpha(colors.primary, 0.14) },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Move forward one day"
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={[styles.modalBtnText, { color: colors.primary }]}>
                Day
              </Text>
            </Pressable>
          </View>

          <View style={styles.modalRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                onPick(dateKey(temp));
              }}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Confirm date"
            >
              <Text style={[styles.primaryBtnText, { color: "#fff" }]}>
                Use this day
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: alpha(colors.text, 0.14) },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                Cancel
              </Text>
            </Pressable>
          </View>

          {Platform.OS === "web" ? (
            <Text
              style={{
                color: alpha(colors.text, 0.65),
                marginTop: 8,
                fontSize: 12,
              }}
            >
              Tip: You can also navigate days with the arrows.
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 18,
    justifyContent: "center",
  },
  modal: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  dateBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: 110,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
