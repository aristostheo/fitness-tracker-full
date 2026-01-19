// app/account/privacy.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Switch,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "@/content/ThemeProvider";
import { AccountSection } from "@/components/account(old)/AccountSection";
import { AccountRow } from "@/components/account(old)/AccountRow";

export default function Privacy() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [profilePublic, setProfilePublic] = useState(false);
  const [shareActivity, setShareActivity] = useState(true);

  const bgTop = colors.background ?? (isDark ? "#0b0d12" : "#f6f7fb");
  const bgBot = colors.background ?? (isDark ? "#07090d" : "#eef1f6");
  const text = colors?.text ?? (isDark ? "#fff" : "#111");
  const sub =
    colors.muted ?? (isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)");

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient colors={[bgTop, bgBot]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.8 }]}
        >
          <Text style={[styles.backText, { color: sub }]}>Back</Text>
        </Pressable>

        <Text style={[styles.title, { color: text }]}>Privacy</Text>
        <Text style={[styles.subtitle, { color: sub }]}>
          You control what you share.
        </Text>

        <AccountSection
          title="Visibility"
          footer="Private by default. Share only what you intend to."
        >
          <AccountRow
            icon="people-outline"
            label="Public Profile"
            hint="Allow others to find your profile"
            toggle
            right="none"
            toggleValue={profilePublic}
            onToggleChange={(v) => setProfilePublic(v)}
          />
          <AccountRow
            icon="pulse-outline"
            label="Share Activity"
            hint="Let friends see workout and nutrition highlights"
            toggle
            right="none"
            toggleValue={shareActivity}
            onToggleChange={(v) => setShareActivity(v)}
          />
        </AccountSection>

        <AccountSection
          title="Data"
          footer="Requests may take time depending on data volume."
        >
          <AccountRow
            icon="download-outline"
            label="Request Data Export"
            hint="Receive a download link by email"
            onPress={() => Alert.alert("Export", "Wire to your export flow.")}
          />
          <AccountRow
            icon="trash-outline"
            label="Request Data Deletion"
            hint="We’ll guide you through a secure process"
            danger
            onPress={() =>
              Alert.alert(
                "Deletion",
                "Recommend: re-auth + server-side deletion + retention policy notes."
              )
            }
          />
        </AccountSection>

        <View style={{ height: 26 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { paddingVertical: 8, paddingHorizontal: 6, alignSelf: "flex-start" },
  backText: { fontSize: 13, fontWeight: "700" },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.7, marginTop: 6 },
  subtitle: { marginTop: 6, marginBottom: 10, fontSize: 13, fontWeight: "600" },
});
