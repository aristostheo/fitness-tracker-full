import React, { useEffect, useMemo, useState, useLayoutEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Switch,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";

import { auth, db } from "@/lib/firebase";
import {
  signOut,
  updateProfile as updateAuthProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Optional niceties (loaded only if available)
let Clipboard: any = null;
let Haptics: any = null;
try {
  Clipboard = require("expo-clipboard");
} catch {}
try {
  Haptics = require("expo-haptics");
} catch {}

export default function AccountScreen() {
  const { colors, isDark, primary } = useTheme() as any;
  const { user } = useAuth();
  const router = useRouter();
  const nav = useNavigation();

  // ── Header (pinned under Dynamic Island)
  useLayoutEffect(() => {
    nav.setOptions({
      headerLargeTitle: Platform.OS === "ios",
      headerTitle: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${primary || colors.primary}20`,
              borderWidth: 1,
              borderColor: `${primary || colors.primary}55`,
            }}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.text as string}
            />
          </View>
          <View>
            <Text
              style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}
            >
              Account
            </Text>
            {!!user?.email && (
              <Text
                numberOfLines={1}
                style={{ color: colors.muted, fontSize: 12 }}
              >
                {user.email}
              </Text>
            )}
          </View>
        </View>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => router.back()}
          style={{ borderRadius: 999, overflow: "hidden" }}
        >
          <BlurView
            intensity={16}
            tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          >
            <Text
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                color: colors.text,
                fontWeight: "800",
              }}
            >
              Done
            </Text>
          </BlurView>
        </Pressable>
      ),
    });
  }, [nav, user?.email]);

  // Profile editing
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  // “Remember me” device toggle
  const [rememberMe, setRememberMe] = useState(true);
  useEffect(() => {
    (async () => {
      const flag = await AsyncStorage.getItem("@rememberMe");
      setRememberMe(flag !== "0");
    })();
  }, []);
  async function onToggleRemember(v: boolean) {
    setRememberMe(v);
    await AsyncStorage.setItem("@rememberMe", v ? "1" : "0");
  }

  // extra profile info
  const [profileDoc, setProfileDoc] = useState<any>(null);
  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfileDoc(snap.data());
    })();
  }, [user?.uid]);

  const providers =
    (user?.providerData || [])
      .map((p) => p.providerId.replace(".com", ""))
      .join(", ") || "password";

  const createdUTC = user?.metadata?.creationTime || "";
  const lastSignInUTC = user?.metadata?.lastSignInTime || "";

  const createdLocal = createdUTC ? new Date(createdUTC).toLocaleString() : "—";
  const lastSignInLocal = lastSignInUTC
    ? new Date(lastSignInUTC).toLocaleString()
    : "—";

  const lastSeenAgo = useMemo(
    () => (lastSignInUTC ? timeAgo(new Date(lastSignInUTC)) : "—"),
    [lastSignInUTC]
  );

  async function onSaveName() {
    if (!user?.uid) return;
    const name = displayName.trim();
    setSaving(true);
    try {
      await updateAuthProfile(auth.currentUser!, {
        displayName: name || (null as any),
      });
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Your display name was updated.");
    } catch (e: any) {
      Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Update failed", e?.message || "Couldn't update name");
    } finally {
      setSaving(false);
    }
  }

  async function onSendVerify() {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      Haptics?.selectionAsync?.();
      Alert.alert(
        "Verification sent",
        "Check your inbox to verify your email."
      );
    } catch (e: any) {
      Alert.alert("Couldn’t send", e?.message || "Please try again later.");
    }
  }

  async function onResetPassword() {
    if (!user?.email) {
      Alert.alert("Email not found", "This account has no email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      Haptics?.selectionAsync?.();
      Alert.alert("Reset link sent", "Check your inbox to set a new password.");
    } catch (e: any) {
      Alert.alert("Couldn’t send", e?.message || "Please try again later.");
    }
  }

  function confirmLogout() {
    Alert.alert("Log out", "Are you sure you want to log out of this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.dismissAll();
            router.replace("/(auth)/login");
          } catch (e: any) {
            Alert.alert("Sign out failed", e?.message || "Please try again.");
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
    >
      {/* PROFILE NAME / EDIT */}
      <GlassPanel>
        <SectionHeader icon="person-outline" title="Profile" />
        <Text style={{ color: colors.muted }}>Display name</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.inputBorder,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.inputBg,
            color: colors.text,
            marginTop: 6,
          }}
          placeholder="Your display name"
          placeholderTextColor={colors.placeholder}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <Row style={{ justifyContent: "flex-end", marginTop: 10 }}>
          <PrimaryButton
            onPress={onSaveName}
            disabled={saving}
            label={saving ? "Saving…" : "Save"}
          />
        </Row>
      </GlassPanel>

      {/* SECURITY */}
      <GlassPanel>
        <SectionHeader icon="shield-checkmark-outline" title="Security" />
        <ListRow
          label="Email verification"
          value={user?.emailVerified ? "Verified" : "Not verified"}
          valueTone={user?.emailVerified ? "success" : "warning"}
          trailing={
            !user?.emailVerified ? (
              <TinyButton
                icon="mail-outline"
                label="Verify"
                onPress={onSendVerify}
              />
            ) : null
          }
        />
        <ListRow
          label="Password"
          value={mask("•", 10)}
          trailing={
            <TinyButton
              icon="key-outline"
              label="Reset"
              onPress={onResetPassword}
            />
          }
        />
        <ListRow
          label="Stay signed in (this device)"
          value=""
          trailing={
            <Switch value={rememberMe} onValueChange={onToggleRemember} />
          }
        />
      </GlassPanel>

      {/* ACCOUNT DETAILS */}
      <GlassPanel>
        <SectionHeader
          icon="information-circle-outline"
          title="Account details"
        />
        <ListRow label="Email" value={user?.email || "—"} />
        <ListRow label="UID" value={user?.uid || "—"} mono />
        <ListRow label="Auth providers" value={providers} />
        <ListRow label="Created" value={createdLocal} />
        <ListRow
          label="Last sign-in"
          value={`${lastSignInLocal} (${lastSeenAgo})`}
        />
      </GlassPanel>

      {/* DEVICES / SESSIONS */}
      <GlassPanel>
        <SectionHeader
          icon="phone-portrait-outline"
          title="Device & sessions"
        />
        <Text style={{ color: colors.muted }}>
          You’re signed in on this device. If you didn’t mean to stay signed in,
          turn off <Text style={{ fontWeight: "800" }}>Stay signed in</Text>{" "}
          above or tap <Text style={{ fontWeight: "800" }}>Log out</Text> below.
        </Text>
      </GlassPanel>

      {/* LOG OUT */}
      <View style={{ borderRadius: 16, overflow: "hidden" }}>
        <Pressable onPress={confirmLogout}>
          <BlurView
            intensity={22}
            tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.35)",
            }}
          >
            <Row gap={10}>
              <IconBadge color="#ef4444">
                <Ionicons name="log-out-outline" size={16} color="#ef4444" />
              </IconBadge>
              <Text style={{ color: "#ef4444", fontWeight: "900" }}>
                Log out
              </Text>
            </Row>
          </BlurView>
        </Pressable>
      </View>

      {/* Small footer */}
      <View style={{ alignItems: "center", marginTop: 6 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          v{profileDoc?.appVersion ?? "—"} • {Platform.OS} {Platform.Version}
        </Text>
      </View>
    </ScrollView>
  );
}

/* ─────────────── Helpers & UI bits ─────────────── */
function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d2 = Math.floor(h / 24);
  if (d2 > 0) return `${d2}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}
function mask(ch: string, n: number) {
  return Array.from({ length: n })
    .map(() => ch)
    .join("");
}

function StatusBadge({
  label,
  tone = "info",
}: {
  label: string;
  tone?: "info" | "success" | "warning";
}) {
  const { isDark } = useTheme();
  const palette =
    tone === "success"
      ? {
          border: "rgba(34,197,94,0.35)",
          bg: "rgba(34,197,94,0.12)",
          text: "#22c55e",
        }
      : tone === "warning"
      ? {
          border: "rgba(234,179,8,0.35)",
          bg: "rgba(234,179,8,0.12)",
          text: "#eab308",
        }
      : {
          border: "rgba(59,130,246,0.35)",
          bg: "rgba(59,130,246,0.12)",
          text: isDark ? "#dbeafe" : "#1f2937",
        };
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: palette.text, fontWeight: "800", fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

function IconBadge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `${color}20`,
        borderWidth: 1,
        borderColor: `${color}59`,
      }}
    >
      {children}
    </View>
  );
}

function Row({
  children,
  gap = 0,
  between = false,
  style,
}: React.PropsWithChildren<{ gap?: number; between?: boolean; style?: any }>) {
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap },
        between && { justifyContent: "space-between" },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function GlassPanel({ children }: React.PropsWithChildren) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={{
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <BlurView
        intensity={22}
        tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
        style={{ padding: 14 }}
      >
        {children}
      </BlurView>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  const { colors } = useTheme();
  return (
    <Row gap={8} style={{ marginBottom: 8 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name={icon} size={16} color={colors.text as string} />
      </View>
      <Text style={{ color: colors.text, fontWeight: "900" }}>{title}</Text>
    </Row>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={!disabled ? onPress : undefined}
      style={{
        borderRadius: 12,
        overflow: "hidden",
        opacity: disabled ? 0.8 : 1,
      }}
    >
      <LinearGradient
        colors={["#6366F1", "#8B5CF6"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900" }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function TinyButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ borderRadius: 999, overflow: "hidden" }}
    >
      <BlurView intensity={16} tint="light">
        <Row
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
          }}
          gap={6}
        >
          <Ionicons name={icon} size={12} color={colors.text as string} />
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>
            {label}
          </Text>
        </Row>
      </BlurView>
    </Pressable>
  );
}

function ListRow({
  label,
  value,
  mono,
  trailing,
  valueTone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  trailing?: React.ReactNode;
  valueTone?: "success" | "warning";
}) {
  const { colors } = useTheme();
  const toneColor =
    valueTone === "success"
      ? "#22c55e"
      : valueTone === "warning"
      ? "#eab308"
      : (colors.text as string);
  return (
    <Row
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingVertical: 10,
        alignItems: "center",
      }}
      between
    >
      <Text style={{ color: colors.muted, flex: 1.2 }}>{label}</Text>
      <View style={{ flex: 2, alignItems: "flex-end", gap: 6 }}>
        {!!value && (
          <Text
            selectable
            style={{
              color: toneColor,
              textAlign: "right",
              fontFamily: mono
                ? Platform.OS === "ios"
                  ? "Menlo"
                  : "monospace"
                : undefined,
            }}
          >
            {value}
          </Text>
        )}
        {trailing}
      </View>
    </Row>
  );
}
