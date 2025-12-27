import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase";
import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/components/workouts/utils/withAlpha";
import { LinearGradient } from "expo-linear-gradient";
import { useEntitlements } from "@/content/useEntitlements";

const STRIPE_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID;

export default function PaywallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPro, loading } = useEntitlements();
  const [working, setWorking] = useState(false);

  const benefits = [
    "AI meal description & calorie estimates",
    "AI meal generator",
    "Coach Spark workout generator",
    "Workout templates & apply",
    "AI exercise calorie estimates",
    "AI suggestions on Home",
  ];

  async function startCheckout() {
    if (!STRIPE_PRICE_ID) {
      Alert.alert("Missing config", "Add EXPO_PUBLIC_STRIPE_PRICE_ID to your env.");
      return;
    }
    try {
      setWorking(true);
      const createSession = httpsCallable(functions, "createCheckoutSession");
      const res: any = await createSession({ priceId: STRIPE_PRICE_ID });
      const url = res?.data?.url;
      if (!url) throw new Error("No checkout URL returned");
      await WebBrowser.openBrowserAsync(url);
    } catch (e: any) {
      console.warn(e);
      Alert.alert("Checkout error", e?.message || "Could not start checkout.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <LinearGradient
      colors={[withAlpha(colors.primary, 0.2), colors.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 18,
          paddingTop: 48,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.35),
            backgroundColor: withAlpha(colors.primary, pressed ? 0.18 : 0.1),
          })}
        >
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "800" }}>Back</Text>
        </Pressable>

        <LinearGradient
          colors={[withAlpha(colors.card, 0.96), withAlpha(colors.card, 0.9)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.3),
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "900", fontSize: 22 }}>
                Go Pro
              </Text>
              <Text style={{ color: colors.muted, fontWeight: "700" }}>
                Unlock AI features, templates, and premium generators.
              </Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {benefits.map((b) => (
              <View
                key={b}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: withAlpha(colors.text, 0.05),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.border, 0.8),
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: "800" }}>{b}</Text>
              </View>
            ))}
          </View>

          <Pressable
            disabled={working || loading || isPro}
            onPress={startCheckout}
            style={({ pressed }) => ({
              marginTop: 8,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: withAlpha(colors.primary, pressed ? 0.85 : 1),
              alignItems: "center",
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.4),
              opacity: working || loading ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.background, fontWeight: "900", fontSize: 16 }}>
              {isPro ? "You already have Pro" : working ? "Starting checkout..." : "Start Pro"}
            </Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              try {
                await auth.currentUser?.getIdToken(true);
                Alert.alert("Refreshed", "If you have Pro, it should unlock now.");
              } catch (e: any) {
                Alert.alert("Could not refresh", e?.message || "");
              }
            }}
            style={{
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.muted, fontWeight: "700" }}>Restore / Refresh access</Text>
          </Pressable>
        </LinearGradient>
      </ScrollView>
    </LinearGradient>
  );
}
