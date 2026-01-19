// app/account/subscription.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "@/content/ThemeProvider";
import { AccountSection } from "@/components/account(old)/AccountSection";
import { AccountRow } from "@/components/account(old)/AccountRow";

export default function Subscription() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

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

        <Text style={[styles.title, { color: text }]}>Subscription</Text>
        <Text style={[styles.subtitle, { color: sub }]}>
          Manage your plan and billing.
        </Text>

        <AccountSection
          title="Plan"
          footer="Premium features stay active until the end of the current billing period."
        >
          <AccountRow
            icon="sparkles-outline"
            label="Current Plan"
            value="Premium"
            right="none"
          />
          <AccountRow
            icon="calendar-outline"
            label="Renews"
            value="Monthly"
            right="none"
          />
          <AccountRow
            icon="card-outline"
            label="Manage Billing"
            hint="Update payment method or cancel"
            onPress={() =>
              Alert.alert(
                "Billing",
                "Wire to RevenueCat / Stripe / App Store subscriptions flow."
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
