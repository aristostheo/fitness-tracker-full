// components/friends/premium/FriendsAddSheet.tsx
// Drop-in ✅ privacy-first add flow (no public directory)
// Input: email or UID + optional display name

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

export function FriendsAddSheet({
  open,
  onClose,
  onSend,
  sending,
  disabled,
  privacyNote,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (target: string, displayName: string) => Promise<void>;
  sending: boolean;
  disabled?: boolean;
  privacyNote?: string;
}) {
  const { colors, isDark } = useTheme();
  const [target, setTarget] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!open) return;
    setTarget("");
    setDisplayName("");
  }, [open]);

  const canSend = useMemo(() => {
    const t = target.trim();
    if (!t) return false;
    if (disabled) return false;
    return true;
  }, [target, disabled]);

  if (!open) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(140)}
      style={[
        styles.overlay,
        { backgroundColor: withAlpha(colors.text, isDark ? 0.45 : 0.18) },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View
          entering={FadeInDown.duration(260)}
          exiting={FadeOutDown.duration(220)}
          style={styles.sheetWrap}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.glass,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <BlurView
              intensity={30}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFillObject}
            />

            <View
              style={[
                styles.handle,
                { backgroundColor: withAlpha(colors.text, 0.18) },
              ]}
            />

            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Add friend
                </Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>
                  {privacyNote || "Private by default."}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    backgroundColor: withAlpha(colors.text, pressed ? 0.12 : 0.08),
                    borderColor: colors.glassBorder,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: colors.muted }]}>
              Email or UID
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={colors.muted} />
              <TextInput
                value={target}
                onChangeText={setTarget}
                placeholder="name@email.com or user UID"
                placeholderTextColor={withAlpha(colors.muted, 0.7)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            <View style={{ height: 10 }} />

            <Text style={[styles.label, { color: colors.muted }]}>
              Display name (optional)
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Ionicons name="person-outline" size={16} color={colors.muted} />
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How you want them to see you"
                placeholderTextColor={withAlpha(colors.muted, 0.7)}
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            <View style={{ height: 14 }} />

            <Pressable
              disabled={!canSend || sending}
              onPress={async () => {
                Haptics.selectionAsync();
                await onSend(target, displayName);
              }}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  opacity: !canSend || sending ? 0.5 : 1,
                  backgroundColor: withAlpha(
                    colors.primary || "#6ee7ff",
                    pressed ? 0.24 : 0.18
                  ),
                  borderColor: withAlpha(colors.primary || "#6ee7ff", 0.28),
                },
              ]}
            >
              <BlurView
                intensity={18}
                tint="dark"
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons
                name="paper-plane-outline"
                size={16}
                color={colors.text}
              />
              <Text style={[styles.sendText, { color: colors.text }]}>
                {sending ? "Sending…" : "Send request"}
              </Text>
            </Pressable>

            <Text style={[styles.privacyHint, { color: colors.muted }]}>
              Tip: Share your UID privately with someone you trust. No public
              directory.
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheetWrap: {
    width: "100%",
  },
  sheet: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    padding: 14,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  subtitle: { marginTop: 4, fontSize: 12.5, fontWeight: "600" },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 14, fontWeight: "700" },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sendText: { fontSize: 13, fontWeight: "900", letterSpacing: -0.2 },
  privacyHint: {
    marginTop: 10,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    fontWeight: "600",
  },
});
