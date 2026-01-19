// app/body-twin/settings.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { withAlpha } from "@/lib/color";

import {
  loadBodyTwinState,
  updateBodyTwinPrivacy,
  saveBodyTwinState,
} from "@/services/profile/bodyTwin/new/store";

export default function BodyTwinSettings() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const uid = user?.uid ?? "local_demo";

  const [state, setState] = useState<any>(null);

  const load = useCallback(async () => {
    const s = await loadBodyTwinState(uid);
    setState(s);
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const card = withAlpha(
    colors.card ?? (isDark ? "#101426" : "#FFFFFF"),
    isDark ? 0.22 : 0.8
  );
  const border = withAlpha(colors.text, isDark ? 0.12 : 0.1);

  const toggle = async (key: string, v: boolean) => {
    Haptics.selectionAsync();
    const next = await updateBodyTwinPrivacy(uid, { [key]: v } as any);
    setState(next);
  };

  const pauseTwin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Pause Body Twin",
      "This hides the visual companion and stops updates. You can turn it back on anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pause",
          style: "destructive",
          onPress: async () => {
            const next = await updateBodyTwinPrivacy(uid, { enabled: false });
            setState(next);
          },
        },
      ]
    );
  };

  const resetTimeline = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Reset timeline",
      "This clears Body Twin snapshots from this device. Your avatar will start fresh visually.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            const s = await loadBodyTwinState(uid);
            const reset = {
              ...s,
              snapshots: s.snapshots?.length ? [s.snapshots[0]] : [],
              updatedAt: Date.now(),
            };
            await saveBodyTwinState(reset);
            setState(reset);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[
          isDark ? "#050713" : "#F6F7FB",
          isDark ? "#00010A" : "#EEF1F8",
        ]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            style={[
              styles.iconBtn,
              {
                backgroundColor: withAlpha(colors.card, 0.14),
                borderColor: border,
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={withAlpha(colors.text, 0.9)}
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={[styles.title, { color: withAlpha(colors.text, 0.96) }]}
            >
              Body Twin Settings
            </Text>
            <Text style={[styles.sub, { color: withAlpha(colors.text, 0.68) }]}>
              Privacy, comfort, and control.
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 14, gap: 12 }}>
          <BlurView
            intensity={18}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.card,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <Row
              title="Body Twin"
              subtitle="Visual companion on this device"
              right={
                <Switch
                  value={!!state?.privacy?.enabled}
                  onValueChange={(v) => toggle("enabled", v)}
                />
              }
            />
            <Divider border={border} />

            <Row
              title="Show on Profile card"
              subtitle="Keep it visible on your Profile"
              right={
                <Switch
                  value={!!state?.privacy?.showOnProfileCard}
                  onValueChange={(v) => toggle("showOnProfileCard", v)}
                />
              }
            />
          </BlurView>

          <BlurView
            intensity={18}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.card,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: withAlpha(colors.text, 0.92) },
              ]}
            >
              Privacy
            </Text>

            <Row
              title="Store on device only"
              subtitle="No cloud sync for Body Twin data (your app can enforce)"
              right={
                <Switch
                  value={!!state?.privacy?.storeOnDeviceOnly}
                  onValueChange={(v) => toggle("storeOnDeviceOnly", v)}
                />
              }
            />
            <Divider border={border} />
            <Row
              title="Allow screenshots"
              subtitle="Some OS versions can’t fully prevent screenshots — this is informational"
              right={
                <Switch
                  value={!!state?.privacy?.allowScreenshots}
                  onValueChange={(v) => toggle("allowScreenshots", v)}
                />
              }
            />

            <Text
              style={[styles.note, { color: withAlpha(colors.text, 0.62) }]}
            >
              Body Twin is designed to avoid “tracking pressure.” If you ever
              feel uneasy, pausing is a valid choice.
            </Text>
          </BlurView>

          <BlurView
            intensity={18}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.card,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: withAlpha(colors.text, 0.92) },
              ]}
            >
              Comfort tools
            </Text>

            <Pressable onPress={pauseTwin} style={styles.actionRow}>
              <Ionicons
                name="pause"
                size={18}
                color={withAlpha(colors.text, 0.86)}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: withAlpha(colors.text, 0.9) },
                ]}
              >
                Pause Body Twin
              </Text>
            </Pressable>

            <Divider border={border} />

            <Pressable onPress={resetTimeline} style={styles.actionRow}>
              <Ionicons
                name="refresh"
                size={18}
                color={withAlpha(colors.text, 0.86)}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: withAlpha(colors.text, 0.9) },
                ]}
              >
                Reset timeline snapshots
              </Text>
            </Pressable>
          </BlurView>

          <Text
            style={[styles.disclaimer, { color: withAlpha(colors.text, 0.58) }]}
          >
            Not a medical tool. Not a judgment. Just a calm visualization based
            on what you choose to share.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.rowTitle, { color: withAlpha(colors.text, 0.92) }]}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text
            style={[styles.rowSub, { color: withAlpha(colors.text, 0.62) }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

function Divider({ border }: { border: string }) {
  return (
    <View style={{ height: 1, backgroundColor: border, marginVertical: 10 }} />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.select({ ios: 56, android: 38 }) as number,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "900", letterSpacing: 0.2 },
  sub: { marginTop: 2, fontSize: 13, fontWeight: "700" },

  card: {
    borderRadius: 26,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: "900" },
  rowSub: { marginTop: 3, fontSize: 12, fontWeight: "600", lineHeight: 16 },

  note: { marginTop: 10, fontSize: 12, fontWeight: "600", lineHeight: 16 },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  actionText: { fontSize: 14, fontWeight: "800" },

  disclaimer: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    paddingHorizontal: 2,
  },
});
