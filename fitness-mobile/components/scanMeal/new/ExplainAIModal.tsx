// components/scanMeal/ExplainAIModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "@/content/ThemeProvider";

function Bullet({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bullet}>
      <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.bTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.bBody, { color: colors.muted }]}>{body}</Text>
      </View>
    </View>
  );
}

export default function ExplainAIModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.wrap}>
        <BlurView
          tint={isDark ? "dark" : "light"}
          intensity={35}
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.top}>
            <View
              style={[
                styles.icon,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Scanning, explained
              </Text>
              <Text style={[styles.sub, { color: colors.muted }]}>
                Calm, transparent AI — with you in control.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.close, { borderColor: colors.border }]}
            >
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <Bullet
              title="We detect items, then you confirm"
              body="The scan suggests foods + portions. Nothing is logged until you review and press Confirm."
            />
            <Bullet
              title="Confidence labels are shown"
              body="High/Medium/Low helps you decide what to keep, edit, or remove."
            />
            <Bullet
              title="You can edit anything"
              body="Change item name, portion, units, or macros — or add missing items manually."
            />
            <Bullet
              title="Why results can vary"
              body="Lighting, angle, hidden ingredients, and portion visibility can affect detection."
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.footer, { color: colors.muted }]}>
              Tip: For best results, include the whole plate and avoid harsh
              shadows.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  sheet: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15.5, fontWeight: "900" },
  sub: { fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },

  bullet: { flexDirection: "row", gap: 10, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 99, marginTop: 6 },
  bTitle: { fontSize: 13.5, fontWeight: "900" },
  bBody: { fontSize: 12.5, lineHeight: 17, marginTop: 3 },

  divider: { height: StyleSheet.hairlineWidth, marginTop: 8, marginBottom: 10 },
  footer: { fontSize: 12.25, lineHeight: 16 },
});
