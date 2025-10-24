import React from "react";
import { View, Text, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { BADGES, BadgeId } from "@/services/badges";

export default function BadgeCelebrate({
  ids,
  open,
  onClose,
}: {
  ids: BadgeId[];
  open: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  if (!open || !ids.length) return null;

  const items = ids.map((id) => BADGES[id]);

  return (
    <Modal transparent animationType="fade" visible={open}>
      <Pressable
        style={{ flex: 1, backgroundColor: "#0008" }}
        onPress={onClose}
      >
        <View
          style={{
            margin: 24,
            marginTop: 100,
            borderRadius: 20,
            padding: 16,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontWeight: "900",
              fontSize: 18,
              textAlign: "center",
            }}
          >
            🎉 Badge unlocked!
          </Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            {items.map((b) => (
              <View
                key={b.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: `${b.color}22`,
                    borderWidth: 1,
                    borderColor: `${b.color}55`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={b.icon} size={18} color={b.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    {b.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {b.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={{
              marginTop: 14,
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: colors.buttonBg,
            }}
          >
            <Text style={{ color: colors.buttonText, fontWeight: "900" }}>
              Nice!
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
