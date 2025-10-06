import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/content/ThemeProvider";

export default function Reset() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function onReset() {
    setErr("");
    setOk("");
    if (!email.trim()) {
      setErr("Enter your email.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setOk("Reset link sent. Check your inbox.");
    } catch (e: any) {
      setErr(e?.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={
        isDark
          ? (["#080B12", "#0F1324", "#0C111C"] as const)
          : (["#F6FAFF", "#EEF3FF", "#F6FAFF"] as const)
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* ambient blobs */}
      <LinearGradient
        colors={
          isDark
            ? (["#2563EB22", "#22C55E22"] as const)
            : (["#2563EB33", "#22C55E33"] as const)
        }
        style={{
          position: "absolute",
          top: -60,
          right: -50,
          width: 240,
          height: 240,
          borderRadius: 999,
          transform: [{ rotate: "25deg" }],
        }}
      />
      <LinearGradient
        colors={
          isDark
            ? (["#A855F722", "#F59E0B22"] as const)
            : (["#A855F733", "#F59E0B33"] as const)
        }
        style={{
          position: "absolute",
          bottom: -70,
          left: -60,
          width: 280,
          height: 280,
          borderRadius: 999,
          transform: [{ rotate: "-15deg" }],
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
      >
        {/* Brand / headline */}
        <View style={{ alignItems: "center", marginBottom: 22 }}>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: isDark ? "#111827" : "#ffffff",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="flash-outline" size={16} color={colors.primary} />
            <Text style={{ fontWeight: "700", color: colors.text }}>
              MacroTrack
            </Text>
            <Text style={{ color: colors.muted }}>beta</Text>
          </View>

          <Text
            style={{
              marginTop: 14,
              fontSize: 30,
              fontWeight: "800",
              color: colors.text,
            }}
          >
            Reset password
          </Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>
            We’ll email you a reset link
          </Text>
        </View>

        {/* Glass card */}
        <BlurView
          intensity={isDark ? 30 : 20}
          tint={isDark ? "dark" : "light"}
          style={{
            alignSelf: "center",
            width: "100%",
            maxWidth: 460,
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              padding: 16,
              backgroundColor: isDark
                ? "rgba(0,0,0,0.35)"
                : "rgba(255,255,255,0.65)",
            }}
          >
            <Field
              icon="mail-outline"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {!!err && (
              <Text
                style={{ color: colors.danger, fontSize: 13, marginTop: 8 }}
              >
                {err}
              </Text>
            )}
            {!!ok && (
              <Text
                style={{ color: colors.success, fontSize: 13, marginTop: 8 }}
              >
                {ok}
              </Text>
            )}

            {/* CTA */}
            <Pressable
              onPress={onReset}
              disabled={loading || !email.trim()}
              style={({ pressed }) => [
                {
                  marginTop: 12,
                  height: 48,
                  borderRadius: 14,
                  overflow: "hidden",
                  opacity: pressed || loading ? 0.9 : 1,
                },
              ]}
            >
              <LinearGradient
                colors={
                  !email.trim()
                    ? (["#9CA3AF", "#9CA3AF"] as const)
                    : ([colors.primary, "#16a34a"] as const)
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    Send reset link
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Footer links */}
            <View
              style={{
                marginTop: 14,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Link href="/login" asChild>
                <Pressable>
                  <Text style={{ color: colors.muted, fontWeight: "600" }}>
                    Back to sign in
                  </Text>
                </Pressable>
              </Link>

              <Link href="/register" asChild>
                <Pressable>
                  <Text style={{ color: colors.muted, fontWeight: "600" }}>
                    Create account
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

/** Reusable field */
function Field(
  props: {
    icon: keyof typeof Ionicons.glyphMap;
  } & React.ComponentProps<typeof TextInput>
) {
  const { colors } = useTheme();
  const { icon, ...rest } = props;
  return (
    <View
      style={{
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.inputBg,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        marginTop: 10,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        placeholderTextColor={colors.placeholder}
        style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 16 }}
        {...rest}
      />
    </View>
  );
}
