// components/scanMeal/PhotoCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import type { ScanState } from "@/components/scanMeal/new/types";

export default function PhotoCard({
  state,
  photoUri,
  onTakePhoto,
  onPickLibrary,
  onScan,
}: {
  state: ScanState;
  photoUri: string | null;
  onTakePhoto: () => void;
  onPickLibrary: () => void;
  onScan: () => void;
}) {
  const { colors, isDark } = useTheme();

  const helper = useMemo(() => {
    if (!photoUri) return "Take a clear photo with the full plate in frame.";
    if (state === "photo_ready")
      return "Ready to scan. You’ll review before logging.";
    if (state === "review") return "Review detected items and adjust anything.";
    return " ";
  }, [photoUri, state]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          <Ionicons name="camera-outline" size={14} color={colors.muted} />
          <Text style={[styles.badgeText, { color: colors.muted }]}>Photo</Text>
        </View>
        <Text
          style={[styles.helper, { color: colors.muted }]}
          numberOfLines={2}
        >
          {helper}
        </Text>
      </View>

      <View style={[styles.preview, { borderColor: colors.border }]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.image} />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="image-outline" size={28} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No photo yet
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onTakePhoto}
          style={[styles.btn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
        >
          <Ionicons name="camera" size={16} color={colors.text} />
          <Text style={[styles.btnText, { color: colors.text }]}>Camera</Text>
        </Pressable>

        <Pressable
          onPress={onPickLibrary}
          style={[styles.btn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Choose from library"
        >
          <Ionicons name="images" size={16} color={colors.text} />
          <Text style={[styles.btnText, { color: colors.text }]}>Library</Text>
        </Pressable>

        <Pressable
          onPress={onScan}
          disabled={!photoUri || state === "analyzing" || state === "saving"}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: photoUri ? colors.primary : colors.border,
              opacity: !photoUri ? 0.6 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Scan with AI"
        >
          <Ionicons name="sparkles" size={16} color={"white"} />
          <Text style={[styles.primaryText]}>Scan</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { marginLeft: 6, fontSize: 12, fontWeight: "700" },
  helper: {
    flex: 1,
    textAlign: "right",
    marginLeft: 10,
    fontSize: 12.5,
    fontWeight: "600",
  },

  preview: {
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
    height: 210,
  },
  image: { width: "100%", height: "100%" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { marginTop: 8, fontSize: 12.5, fontWeight: "600" },

  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  btn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnText: { fontSize: 13, fontWeight: "800" },

  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { fontSize: 13, fontWeight: "900", color: "white" },
});
