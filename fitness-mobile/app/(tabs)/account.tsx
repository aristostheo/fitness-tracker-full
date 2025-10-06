// app/(tabs)/account.tsx
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import Card from "../../components/Card";
import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import { auth } from "@/lib/firebase";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { updateProfile as updateProfileDoc } from "@/services/profile";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function AccountScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  const created = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleString()
    : "—";
  const lastSignIn = user?.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString()
    : "—";
  const providers =
    (user?.providerData || []).map((p) => p.providerId).join(", ") ||
    "password";

  const grad = isDark
    ? ["#0B1220", "#0E1526", "#0B1220"]
    : ["#F7FAFF", "#EEF2FF", "#F7FAFF"];

  async function onSaveName() {
    if (!user?.uid) return;
    const name = displayName.trim();
    setSaving(true);
    try {
      await updateAuthProfile(auth.currentUser!, {
        displayName: name || (null as any),
      });
      await updateProfileDoc(user.uid, { displayName: name || null } as any);
      Alert.alert("Saved", "Your display name was updated.");
    } catch (e: any) {
      Alert.alert("Update failed", e?.message || "Couldn't update name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* Hero */}
      <LinearGradient
        colors={grad as [string, string, string]}
        style={{
          borderRadius: 20,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              backgroundColor: colors.card,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons
              name="person-outline"
              size={26}
              color={colors.text as string}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, marginBottom: 2 }}>
              Account
            </Text>
            <Text
              style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}
            >
              {user?.email || "—"}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>
              UID: {user?.uid?.slice(0, 6)}…{user?.uid?.slice(-4)}
            </Text>
          </View>
          <Pressable onPress={() => router.back()}>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: colors.text }}>Done</Text>
            </View>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Editable: Display name */}
      <Card style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontWeight: "700", color: colors.text }}>
          Profile name
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.inputBorder,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.inputBg,
            color: colors.text,
          }}
          placeholder="Your display name"
          placeholderTextColor={colors.placeholder}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <View style={{ alignItems: "flex-end" }}>
          <Pressable
            onPress={onSaveName}
            disabled={saving}
            style={{
              backgroundColor: colors.buttonBg,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              opacity: saving ? 0.85 : 1,
            }}
          >
            <Text style={{ color: colors.buttonText, fontWeight: "700" }}>
              {saving ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Read-only: Email, providers, timestamps */}
      <Card style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontWeight: "700", color: colors.text }}>
          Account details
        </Text>
        <InfoRow label="Email" value={user?.email || "—"} />
        <InfoRow label="Providers" value={providers} />
        <InfoRow label="Created" value={created} />
        <InfoRow label="Last sign-in" value={lastSignIn} />
        <InfoRow label="UID" value={user?.uid || "—"} mono />
        <View
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.muted }}>
            Changing <Text style={{ fontWeight: "700" }}>email</Text> or{" "}
            <Text style={{ fontWeight: "700" }}>password</Text> isn’t supported
            here. Use your email provider’s verification/reset flow.
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <Text style={{ flex: 0.9, color: colors.muted }}>{label}</Text>
      <Text
        selectable
        style={{
          flex: 2,
          color: colors.text,
          fontFamily: mono
            ? Platform.OS === "ios"
              ? "Menlo"
              : "monospace"
            : undefined,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
