// app/account/edit-profile.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { AccountSection } from "@/components/account(old)/AccountSection";
import { AccountRow } from "@/components/account(old)/AccountRow";

// Helper: lightweight hex -> rgba for nice gradients (no new theme tokens needed)
function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export default function EditProfile() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth() as any;

  const [name, setName] = useState<string>(user?.displayName ?? "");

  const gradTop = useMemo(() => {
    // calm, premium tinting: primary glow in dark; subtle in light
    const alpha = isDark ? 0.18 : 0.08;
    return hexToRgba(colors.primary, alpha);
  }, [colors.primary, isDark]);

  const gradBot = useMemo(() => {
    const alpha = isDark ? 0.06 : 0.04;
    return hexToRgba(colors.accent, alpha);
  }, [colors.accent, isDark]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Background: base + subtle accent glow */}
      <LinearGradient
        colors={[gradTop, colors.background, gradBot]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.8 }]}
        >
          <Text style={[styles.backText, { color: colors.muted }]}>Back</Text>
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Keep your account details up to date.
        </Text>

        <AccountSection title="Profile">
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={[styles.label, { color: colors.muted }]}>
              Display name
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.placeholder}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
              accessibilityLabel="Display name"
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <AccountRow
            icon="mail-outline"
            label="Email"
            value={user?.email ?? "—"}
            right="none"
            hint="Email changes are handled by your sign-in provider"
            disabled
          />
        </AccountSection>

        <Pressable
          onPress={async () => {
            try {
              await Haptics.selectionAsync();
            } catch {}

            // ✅ Wire later to: Firebase updateProfile(auth.currentUser, { displayName: name })
            // and/or your Firestore profile doc.
            Alert.alert(
              "Save",
              "Wire this to your profile update flow (Firebase updateProfile / Firestore)."
            );
          }}
          accessibilityRole="button"
          accessibilityLabel="Save profile"
          style={({ pressed }) => [
            styles.save,
            { backgroundColor: colors.buttonBg },
            pressed && { transform: [{ scale: 0.99 }], opacity: 0.92 },
          ]}
        >
          <Text style={[styles.saveText, { color: colors.buttonText }]}>
            Save Changes
          </Text>
        </Pressable>

        <View style={{ height: 26 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { paddingVertical: 8, paddingHorizontal: 6, alignSelf: "flex-start" },
  backText: { fontSize: 13, fontWeight: "800" },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.7, marginTop: 6 },
  subtitle: { marginTop: 6, marginBottom: 10, fontSize: 13, fontWeight: "700" },
  label: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "800",
  },
  save: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
});
