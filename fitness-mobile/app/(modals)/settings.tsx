// app/(modals)/settings.tsx
// Drop-in ✅ Premium Settings modal (Apple Health x luxury vibe)
// Depends on: expo-router, expo-linear-gradient, expo-blur, expo-haptics, react-native-reanimated
// Optional: @react-native-async-storage/async-storage (recommended)
//
// Uses your ThemeProvider: useTheme() -> { colors, isDark, ...maybe setMode/mode }
// If your ThemeProvider doesn't expose theme mode setters, this still works (stores locally).

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useTheme } from "@/content/ThemeProvider";
import { withAlpha } from "@/lib/color";

import {
  SettingsSection,
  SettingsRow,
  SettingsPill,
  SettingsDivider,
} from "@/components/settings/SettingsPrimitives";
import { PremiumSheet } from "@/components/settings/PremiumSheet";
import {
  ThemeModeSheet,
  type ThemeMode,
} from "@/components/settings/ThemeModeSheet";
import {
  useSettingBool,
  useSettingString,
} from "@/services/settings/settingsStore";

const hit = { top: 12, bottom: 12, left: 12, right: 12 };

export default function SettingsModal() {
  const router = useRouter();
  const theme: any = useTheme();
  const { colors, isDark } = theme;

  // Theme mode support (Light/Dark/System)
  const ctxMode: ThemeMode | undefined =
    theme?.mode ?? theme?.themeMode ?? theme?.appearanceMode;
  const ctxSetMode: ((m: ThemeMode) => void) | undefined =
    theme?.setMode ?? theme?.setThemeMode ?? theme?.setAppearanceMode;

  const [themeSheetOpen, setThemeSheetOpen] = useState(false);

  // Local persisted settings (safe defaults)
  const [lowPowerMode, setLowPowerMode, lowPowerLoading] = useSettingBool(
    "settings.lowPowerMode",
    false
  );
  const [reduceMotion, setReduceMotion, reduceMotionLoading] = useSettingBool(
    "settings.reduceMotion",
    false
  );
  const [hapticsEnabled, setHapticsEnabled, hapticsLoading] = useSettingBool(
    "settings.hapticsEnabled",
    true
  );
  const [privateOnLock, setPrivateOnLock, privateOnLockLoading] =
    useSettingBool("settings.privacyHideOnLock", true);

  const [units, setUnits, unitsLoading] = useSettingString(
    "settings.units",
    "metric" // metric | imperial
  );
  const [weekStartsOn, setWeekStartsOn, weekStartsLoading] = useSettingString(
    "settings.weekStartsOn",
    "monday" // monday | sunday
  );

  const [coachTone, setCoachTone, coachToneLoading] = useSettingString(
    "settings.coachTone",
    "calm" // calm | direct | hype
  );

  const loadingAny =
    lowPowerLoading ||
    reduceMotionLoading ||
    hapticsLoading ||
    privateOnLockLoading ||
    unitsLoading ||
    weekStartsLoading ||
    coachToneLoading;

  const chrome = useMemo(() => {
    const border = withAlpha(colors.text, isDark ? 0.1 : 0.12);
    const card = withAlpha(colors.card, isDark ? 0.72 : 0.82);
    const sub = withAlpha(colors.text, isDark ? 0.65 : 0.7);
    const hairline = withAlpha(colors.text, isDark ? 0.1 : 0.12);
    const danger = "#ff4d4d";
    return { border, card, sub, hairline, danger };
  }, [colors, isDark]);

  const taptic = async (kind: "soft" | "light" | "medium" = "soft") => {
    if (!hapticsEnabled) return;
    try {
      if (kind === "soft")
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      else if (kind === "light")
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const close = () => {
    taptic("soft");
    router.back();
  };

  const themeValue: ThemeMode =
    ctxMode ?? (theme?.storedMode as ThemeMode) ?? "system";
  const themeLabel =
    themeValue === "system"
      ? "System"
      : themeValue === "dark"
      ? "Dark"
      : "Light";

  const openNotReady = (title: string) => {
    taptic("light");
    Alert.alert(title, "Wire this to your app logic when ready.");
  };

  const confirmReset = () => {
    taptic("medium");
    Alert.alert(
      "Reset settings?",
      "This restores defaults on this device. Your logged data stays untouched.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            // Minimal reset – extend as you add more settings keys
            setLowPowerMode(false);
            setReduceMotion(false);
            setHapticsEnabled(true);
            setPrivateOnLock(true);
            setUnits("metric");
            setWeekStartsOn("monday");
            setCoachTone("calm");
            taptic("soft");
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[
          withAlpha(colors.accent ?? "#7c5cff", isDark ? 0.18 : 0.12),
          withAlpha(colors.background, 0.0),
          withAlpha(colors.background, 0.0),
          withAlpha(colors.accent ?? "#7c5cff", isDark ? 0.08 : 0.06),
        ]}
        locations={[0, 0.45, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top chrome */}
      <View style={[styles.topBar, { borderBottomColor: chrome.hairline }]}>
        <Pressable onPress={close} hitSlop={hit} style={styles.topBtn}>
          <Ionicons
            name="chevron-down"
            size={20}
            color={withAlpha(colors.text, 0.9)}
          />
        </Pressable>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: chrome.sub }]}>
            Calm controls. No clutter.
          </Text>
        </View>

        <Pressable
          onPress={() => {
            taptic("soft");
            Alert.alert(
              "Search",
              "Optional: add a settings search here later."
            );
          }}
          hitSlop={hit}
          style={styles.topBtn}
        >
          <Ionicons
            name="search"
            size={20}
            color={withAlpha(colors.text, 0.85)}
          />
        </Pressable>
      </View>

      {loadingAny ? (
        <View style={styles.loadingWrap}>
          <BlurView
            intensity={22}
            tint={isDark ? "dark" : "light"}
            style={styles.loadingCard}
          >
            <ActivityIndicator />
            <Text style={[styles.loadingText, { color: chrome.sub }]}>
              Loading preferences…
            </Text>
          </BlurView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Account */}
          <Animated.View entering={FadeInDown.duration(220).springify()}>
            <SettingsSection
              title="Account"
              subtitle="Your identity, sync, and access."
              colors={colors}
              isDark={isDark}
            >
              <SettingsRow
                icon="person-circle"
                title="Profile"
                value="Edit name, goals, units"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Profile")}
              />
              <SettingsRow
                icon="shield-checkmark"
                title="Subscription"
                value="Manage plan and benefits"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Subscription")}
              />
              <SettingsRow
                icon="cloud"
                title="Sync"
                value="Backups and cross-device"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Sync")}
              />
            </SettingsSection>
          </Animated.View>

          {/* Appearance */}
          <Animated.View
            entering={FadeInDown.delay(40).duration(220).springify()}
          >
            <SettingsSection
              title="Appearance"
              subtitle="Visual comfort, not noise."
              colors={colors}
              isDark={isDark}
              footer="Tip: System mode follows your device settings."
            >
              <SettingsRow
                icon="contrast"
                title="Theme"
                value={themeLabel}
                colors={colors}
                isDark={isDark}
                onPress={async () => {
                  await taptic("soft");
                  setThemeSheetOpen(true);
                }}
              />
              <SettingsRow
                icon="sparkles"
                title="Low Power UI"
                value="Less glow, fewer effects"
                colors={colors}
                isDark={isDark}
                right={
                  <Switch
                    value={lowPowerMode}
                    onValueChange={async (v) => {
                      await taptic("light");
                      setLowPowerMode(v);
                    }}
                    trackColor={{
                      false: withAlpha(colors.text, 0.18),
                      true: withAlpha(colors.accent ?? "#7c5cff", 0.55),
                    }}
                    thumbColor={Platform.OS === "android" ? undefined : "#fff"}
                  />
                }
              />
              <SettingsRow
                icon="walk"
                title="Reduce Motion"
                value="Softer transitions"
                colors={colors}
                isDark={isDark}
                right={
                  <Switch
                    value={reduceMotion}
                    onValueChange={async (v) => {
                      await taptic("light");
                      setReduceMotion(v);
                    }}
                    trackColor={{
                      false: withAlpha(colors.text, 0.18),
                      true: withAlpha(colors.accent ?? "#7c5cff", 0.55),
                    }}
                    thumbColor={Platform.OS === "android" ? undefined : "#fff"}
                  />
                }
              />
            </SettingsSection>
          </Animated.View>

          {/* Notifications */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(220).springify()}
          >
            <SettingsSection
              title="Notifications"
              subtitle="Helpful, never spammy."
              colors={colors}
              isDark={isDark}
            >
              <SettingsRow
                icon="water"
                title="Hydration nudges"
                value="Gentle reminders"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Hydration nudges")}
              />
              <SettingsRow
                icon="nutrition"
                title="Meal logging"
                value="Streak + time-based prompts"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Meal logging notifications")}
              />
              <SettingsRow
                icon="barbell"
                title="Workout prompts"
                value="Plan + recovery check-ins"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Workout prompts")}
              />
              <SettingsRow
                icon="time"
                title="Quiet hours"
                value="Respect focus and sleep"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Quiet hours")}
              />
            </SettingsSection>
          </Animated.View>

          {/* Goals & Units */}
          <Animated.View
            entering={FadeInDown.delay(120).duration(220).springify()}
          >
            <SettingsSection
              title="Goals & units"
              subtitle="Make numbers feel human."
              colors={colors}
              isDark={isDark}
            >
              <SettingsRow
                icon="analytics"
                title="Units"
                value={
                  units === "metric" ? "Metric (kg, cm)" : "Imperial (lb, ft)"
                }
                colors={colors}
                isDark={isDark}
                onPress={async () => {
                  await taptic("light");
                  Alert.alert(
                    "Units",
                    "Choose your default measurement system.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Metric",
                        onPress: () => {
                          setUnits("metric");
                          taptic("soft");
                        },
                      },
                      {
                        text: "Imperial",
                        onPress: () => {
                          setUnits("imperial");
                          taptic("soft");
                        },
                      },
                    ]
                  );
                }}
              />
              <SettingsRow
                icon="calendar"
                title="Week starts on"
                value={weekStartsOn === "monday" ? "Monday" : "Sunday"}
                colors={colors}
                isDark={isDark}
                onPress={async () => {
                  await taptic("light");
                  Alert.alert(
                    "Week starts on",
                    "Affects trends and weekly summaries.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Monday",
                        onPress: () => {
                          setWeekStartsOn("monday");
                          taptic("soft");
                        },
                      },
                      {
                        text: "Sunday",
                        onPress: () => {
                          setWeekStartsOn("sunday");
                          taptic("soft");
                        },
                      },
                    ]
                  );
                }}
              />
              <SettingsRow
                icon="speedometer"
                title="Goal engine"
                value="Targets and recalculation"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Goal engine")}
              />
            </SettingsSection>
          </Animated.View>

          {/* Nutrition */}
          <Animated.View
            entering={FadeInDown.delay(160).duration(220).springify()}
          >
            <SettingsSection
              title="Nutrition"
              subtitle="Preferences, scanning, and scoring."
              colors={colors}
              isDark={isDark}
              footer="We keep nutrition language supportive and non-judgmental."
            >
              <SettingsRow
                icon="restaurant"
                title="Diet preferences"
                value="Restrictions, likes, allergies"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Diet preferences")}
              />
              <SettingsRow
                icon="scan"
                title="Scan-a-Meal"
                value="Camera, AI, and limits"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Scan-a-Meal")}
              />
              <SettingsRow
                icon="barcode"
                title="Barcode"
                value="Quick logging settings"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Barcode")}
              />
              <SettingsRow
                icon="sparkles"
                title="Meal score"
                value="What affects your score"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Meal score")}
              />
            </SettingsSection>
          </Animated.View>

          {/* Workouts */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(220).springify()}
          >
            <SettingsSection
              title="Workouts"
              subtitle="Logging style and intelligence."
              colors={colors}
              isDark={isDark}
            >
              <SettingsRow
                icon="timer"
                title="Rest timer"
                value="Defaults + auto-start"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Rest timer")}
              />
              <SettingsRow
                icon="repeat"
                title="Auto-progression"
                value="Smart suggestions"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Auto-progression")}
              />
              <SettingsRow
                icon="body"
                title="RPE / Effort"
                value="How you rate sets"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("RPE / Effort")}
              />
            </SettingsSection>
          </Animated.View>

          {/* Integrations */}
          <Animated.View
            entering={FadeInDown.delay(240).duration(220).springify()}
          >
            <SettingsSection
              title="Integrations"
              subtitle="Bring your signals together."
              colors={colors}
              isDark={isDark}
              footer="We only request permissions that unlock clear value."
            >
              <SettingsRow
                icon="heart"
                title="Apple Health"
                value="Read/write metrics"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Apple Health")}
              />
              <SettingsRow
                icon="watch"
                title="Wearables"
                value="Steps, HR, recovery"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Wearables")}
              />
            </SettingsSection>
          </Animated.View>

          {/* Privacy & Safety */}
          <Animated.View
            entering={FadeInDown.delay(280).duration(220).springify()}
          >
            <SettingsSection
              title="Privacy & safety"
              subtitle="Control, clarity, and consent."
              colors={colors}
              isDark={isDark}
              footer="Your data is yours. We aim for transparency over persuasion."
            >
              <SettingsRow
                icon="lock-closed"
                title="Hide on lock screen"
                value="Blur sensitive values"
                colors={colors}
                isDark={isDark}
                right={
                  <Switch
                    value={privateOnLock}
                    onValueChange={async (v) => {
                      await taptic("light");
                      setPrivateOnLock(v);
                    }}
                    trackColor={{
                      false: withAlpha(colors.text, 0.18),
                      true: withAlpha(colors.accent ?? "#7c5cff", 0.55),
                    }}
                    thumbColor={Platform.OS === "android" ? undefined : "#fff"}
                  />
                }
              />
              <SettingsRow
                icon="hand-left"
                title="Permissions"
                value="Camera, photos, notifications"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Permissions")}
              />
              <SettingsRow
                icon="document-text"
                title="Privacy policy"
                value="Read how we handle data"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Privacy policy")}
              />
              <SettingsRow
                icon="sparkles"
                title="AI features"
                value="What gets sent, what stays local"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("AI features")}
              />
            </SettingsSection>
          </Animated.View>

          {/* Accessibility */}
          <Animated.View
            entering={FadeInDown.delay(320).duration(220).springify()}
          >
            <SettingsSection
              title="Accessibility"
              subtitle="Comfort is a feature."
              colors={colors}
              isDark={isDark}
            >
              <SettingsRow
                icon="pulse"
                title="Haptics"
                value={hapticsEnabled ? "On" : "Off"}
                colors={colors}
                isDark={isDark}
                right={
                  <Switch
                    value={hapticsEnabled}
                    onValueChange={async (v) => {
                      // Note: allow haptic toggle even if currently off
                      try {
                        await Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light
                        );
                      } catch {}
                      setHapticsEnabled(v);
                    }}
                    trackColor={{
                      false: withAlpha(colors.text, 0.18),
                      true: withAlpha(colors.accent ?? "#7c5cff", 0.55),
                    }}
                    thumbColor={Platform.OS === "android" ? undefined : "#fff"}
                  />
                }
              />
              <SettingsRow
                icon="chatbubble-ellipses"
                title="Coach tone"
                value={
                  coachTone === "calm"
                    ? "Calm"
                    : coachTone === "direct"
                    ? "Direct"
                    : "Hype"
                }
                colors={colors}
                isDark={isDark}
                onPress={async () => {
                  await taptic("light");
                  Alert.alert(
                    "Coach tone",
                    "Choose the vibe you want from guidance.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Calm",
                        onPress: () => {
                          setCoachTone("calm");
                          taptic("soft");
                        },
                      },
                      {
                        text: "Direct",
                        onPress: () => {
                          setCoachTone("direct");
                          taptic("soft");
                        },
                      },
                      {
                        text: "Hype",
                        onPress: () => {
                          setCoachTone("hype");
                          taptic("soft");
                        },
                      },
                    ]
                  );
                }}
              />
              <SettingsRow
                icon="text"
                title="Text size"
                value="Follow system settings"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Text size")}
              />
            </SettingsSection>
          </Animated.View>

          {/* Data */}
          <Animated.View
            entering={FadeInDown.delay(360).duration(220).springify()}
          >
            <SettingsSection
              title="Data"
              subtitle="Export, reset, and device storage."
              colors={colors}
              isDark={isDark}
            >
              <SettingsRow
                icon="download"
                title="Export data"
                value="CSV / JSON"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Export data")}
              />
              <SettingsRow
                icon="trash"
                title="Clear cache"
                value="Local thumbnails and temp files"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Clear cache")}
              />
              <SettingsRow
                icon="refresh"
                title="Reset settings"
                value="Restore defaults"
                colors={colors}
                isDark={isDark}
                onPress={confirmReset}
                danger
              />
            </SettingsSection>
          </Animated.View>

          {/* Support & About */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(220).springify()}
          >
            <SettingsSection
              title="Support"
              subtitle="Fast help, human tone."
              colors={colors}
              isDark={isDark}
            >
              <SettingsRow
                icon="help-circle"
                title="Help center"
                value="Guides and FAQs"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Help center")}
              />
              <SettingsRow
                icon="mail"
                title="Contact us"
                value="Send feedback"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("Contact us")}
              />
              <SettingsRow
                icon="information-circle"
                title="About"
                value="Version, credits"
                colors={colors}
                isDark={isDark}
                onPress={() => openNotReady("About")}
              />
            </SettingsSection>
          </Animated.View>

          <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
            <SettingsPill
              colors={colors}
              isDark={isDark}
              text="We design settings to feel calm: clear defaults, fewer toggles, and advanced controls tucked away until you need them."
            />
          </View>
        </ScrollView>
      )}

      {/* Theme sheet */}
      <PremiumSheet
        open={themeSheetOpen}
        onClose={() => setThemeSheetOpen(false)}
        colors={colors}
        isDark={isDark}
        title="Theme"
        subtitle="Choose what feels right."
      >
        <ThemeModeSheet
          value={themeValue}
          onChange={async (m) => {
            await taptic("light");
            // Prefer ThemeProvider setter if available; also store locally via sheet impl
            ctxSetMode?.(m);
          }}
          colors={colors}
          isDark={isDark}
        />
        <SettingsDivider colors={colors} isDark={isDark} />
        <Pressable
          onPress={async () => {
            await taptic("soft");
            setThemeSheetOpen(false);
          }}
          style={({ pressed }) => [
            styles.sheetDone,
            {
              backgroundColor: withAlpha(colors.text, isDark ? 0.08 : 0.06),
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <Text style={[styles.sheetDoneText, { color: colors.text }]}>
            Done
          </Text>
        </Pressable>
      </PremiumSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingTop: Platform.OS === "android" ? 14 : 12,
    paddingBottom: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBtn: {
    width: 44,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", letterSpacing: 0.2 },
  subtitle: { fontSize: 12, marginTop: 2 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 420,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  loadingText: { fontSize: 13, fontWeight: "600" },
  sheetDone: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDoneText: { fontSize: 15, fontWeight: "700" },
});
