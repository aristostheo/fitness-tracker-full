// app/(tabs)/profile.tsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { useEntitlements } from "@/content/useEntitlements";

import {
  ensureProfile,
  subscribeProfile,
  updateProfile,
  type Profile,
} from "@/services/profile";
import { kgToLb, lbToKg } from "@/utils/units";

import ThemeToggle from "@/components/ThemeToggle";

import { PremiumProfileHeader } from "@/components/profile/premium/PremiumProfileHeader";
import { MetricsCard } from "@/components/profile/premium/MetricsCard";
import { LongTermProgressCard } from "@/components/profile/premium/TrendsCard";
import { BodyTwinEvolveCard } from "@/components/profile/premium/BodyTwinEvolveCard";
import { BadgesPreviewCard } from "@/components/profile/premium/BadgesPreviewReviewCard";
import { FriendsPreviewCard } from "@/components/profile/premium/FriendsPreviewCard";
import { GlassCard } from "@/components/profile/premium/GlassCard";
import { EmptyState } from "@/components/profile/premium/EmptyState";
import { withAlpha } from "@/components/profile/premium/ui";
import MacroGoalsCard from "@/components/profile/MacroGoalsCard";

import { AppearanceCard } from "@/components/profile/premium/AppearenceCard";
import { loadUnlocksLocal, loadFeaturedLocal } from "@/services/badges/store";
import type { UnlockMap } from "@/services/badges/types";
import {
  subscribeFriends,
  subscribeFriendRequests,
  type FriendEdge,
} from "@/services/friends/friends";
import { DietPreferencesCard } from "@/components/profile/cards/DietPreferencesCard";
import {
  connectedCount,
  subscribeIntegrations,
  syncHealth,
  type IntegrationSnapshot,
} from "@/services/integrations";
import { buildGoalInputsFromProfile } from "@/services/macroCalculator";

export type GoalUILabel = "maintain" | "cut" | "lean_bulk" | "bulk";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "athlete";

const initialsFrom = (displayName?: string | null, email?: string | null) => {
  const source = (displayName || email || "You").trim();
  const parts = source
    .replace(/@.*/, "")
    .split(/\s|[._-]/)
    .filter(Boolean);
  return `${(parts[0]?.[0] || "Y").toUpperCase()}${(
    parts[1]?.[0] ||
    parts[0]?.[1] ||
    "U"
  ).toUpperCase()}`;
};

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isPro } = useEntitlements();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Core editable state
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("25");
  const [heightCm, setHeightCm] = useState("175");
  const [weightInput, setWeightInput] = useState("75");
  const [targetWeightInput, setTargetWeightInput] = useState("70");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goalType, setGoalType] = useState<GoalUILabel>("maintain");

  // Save / dirty
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | "ok" | "err">(null);

  const lastMetricsRef = useRef<{
    weightUnit?: "kg" | "lb";
    weightKg?: number;
    targetWeightKg?: number;
    heightCm?: number;
    bodyFatPct?: number;
    waistCm?: number;
  } | null>(null);
  const [badgePreviewIds, setBadgePreviewIds] = useState<string[]>([]);
  const [badgeUnlockedCount, setBadgeUnlockedCount] = useState(0);
  const [friendsPreview, setFriendsPreview] = useState<
    Array<{ name?: string | null; email?: string | null }>
  >([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendsPings, setFriendsPings] = useState(0);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationSnapshot | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Profile",
      headerShadowVisible: false,
    });
  }, [navigation]);

  const refreshBadgesPreview = useCallback(async () => {
    const unlocks = (await loadUnlocksLocal()) as UnlockMap;
    const featured = await loadFeaturedLocal();

    const unlockedIds = Object.entries(unlocks)
      .filter(([, v]) => !!v?.unlockedAt)
      .sort((a, b) => (b[1]?.unlockedAt ?? 0) - (a[1]?.unlockedAt ?? 0))
      .map(([id]) => id);

    const preview = (featured?.length ? featured : unlockedIds).slice(0, 3);
    setBadgePreviewIds(preview);
    setBadgeUnlockedCount(Object.keys(unlocks || {}).length);
  }, []);

  useEffect(() => {
    refreshBadgesPreview().catch(() => {});
  }, [refreshBadgesPreview]);

  useFocusEffect(
    useCallback(() => {
      refreshBadgesPreview().catch(() => {});
    }, [refreshBadgesPreview])
  );

  useEffect(() => subscribeIntegrations(setIntegrations), []);

  useEffect(() => {
    if (!user?.uid) {
      setFriendsPreview([]);
      setFriendsCount(0);
      setFriendsPings(0);
      return;
    }

    const unsubFriends = subscribeFriends(
      user.uid,
      (rows: FriendEdge[]) => {
        const accepted = rows.filter((r) => r.status === "accepted");
        setFriendsCount(accepted.length);
        setFriendsPreview(
          accepted.slice(0, 3).map((r) => ({
            name: r.friendDisplayName,
            email: r.friendEmail,
          }))
        );
      },
      ["accepted"]
    );

    const unsubRequests = subscribeFriendRequests(user.uid, (rows) => {
      setFriendsPings(rows.length);
    });

    return () => {
      unsubFriends?.();
      unsubRequests?.();
    };
  }, [user?.uid]);

  // ✅ Old behavior: ensureProfile safety
  useEffect(() => {
    if (!user?.uid) return;
    ensureProfile(user.uid).catch(() => {});
  }, [user?.uid]);

  // Hydrate from backend
  useEffect(() => {
    if (!user?.uid) return;

    return subscribeProfile(user.uid, (p) => {
      setProfile(p);

      if (!hydrated && p) {
        const unit = p?.weightUnit === "lb" ? "lb" : "kg";
        setWeightUnit(unit);

        setSex((p?.sex as any) || "male");
        setAge(String(p?.age ?? 25));
        setHeightCm(String(p?.heightCm ?? 175));

        const wkg = Number(p?.weightKg ?? 75);
        const tkg = Number(p?.targetWeightKg ?? 70);

        setWeightInput(
          unit === "lb"
            ? String(Math.round(kgToLb(wkg)))
            : String(Math.round(wkg))
        );
        setTargetWeightInput(
          unit === "lb"
            ? String(Math.round(kgToLb(tkg)))
            : String(Math.round(tkg))
        );

        setActivityLevel((p?.activityLevel as ActivityLevel) || "moderate");
        setGoalType(
          ((p as any)?.goalInputs?.mode as GoalUILabel) ||
            ((p as any)?.goal as GoalUILabel) ||
            "maintain"
        );
        setHydrated(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, hydrated]);

  useEffect(() => {
    if (!profile) return;

    const next = {
      weightUnit: profile.weightUnit,
      weightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      heightCm: profile.heightCm,
      bodyFatPct: (profile as any)?.bodyFatPct,
      waistCm: (profile as any)?.waistCm,
    };

    const last = lastMetricsRef.current;
    const changed =
      !last ||
      last.weightUnit !== next.weightUnit ||
      last.weightKg !== next.weightKg ||
      last.targetWeightKg !== next.targetWeightKg ||
      last.heightCm !== next.heightCm ||
      last.bodyFatPct !== next.bodyFatPct ||
      last.waistCm !== next.waistCm;

    if (!changed) return;
    lastMetricsRef.current = next;

    const nextUnit = next.weightUnit ?? weightUnit;
    if (nextUnit !== weightUnit) setWeightUnit(nextUnit);

    if (Number.isFinite(next.weightKg)) {
      const w =
        nextUnit === "lb"
          ? Math.round(kgToLb(next.weightKg as number))
          : Math.round(next.weightKg as number);
      setWeightInput(String(w));
    }

    if (Number.isFinite(next.targetWeightKg)) {
      const tw =
        nextUnit === "lb"
          ? Math.round(kgToLb(next.targetWeightKg as number))
          : Math.round(next.targetWeightKg as number);
      setTargetWeightInput(String(tw));
    }

    if (Number.isFinite(next.heightCm)) {
      setHeightCm(String(Math.round(next.heightCm as number)));
    }
  }, [profile, weightUnit]);

  useEffect(() => {
    if (!profile) return;
    const nextGoal =
      ((profile as any)?.goalInputs?.mode as GoalUILabel) ||
      ((profile as any)?.goal as GoalUILabel) ||
      "maintain";
    if (nextGoal !== goalType) setGoalType(nextGoal);
    const nextActivity =
      ((profile as any)?.goalInputs?.activityLevel as ActivityLevel) ||
      ((profile as any)?.activityLevel as ActivityLevel) ||
      "moderate";
    if (nextActivity !== activityLevel) setActivityLevel(nextActivity);
  }, [activityLevel, goalType, profile]);

  const weightKg = useMemo(() => {
    const n = Number(weightInput || 0);
    return weightUnit === "lb" ? lbToKg(n) : n;
  }, [weightInput, weightUnit]);

  const targetWeightKg = useMemo(() => {
    const n = Number(targetWeightInput || 0);
    return weightUnit === "lb" ? lbToKg(n) : n;
  }, [targetWeightInput, weightUnit]);

  const initials = initialsFrom(
    profile?.displayName || user?.displayName,
    user?.email
  );

  const onToggleUnit = useCallback(async () => {
    if (!user?.uid) return;

    const nextUnit = weightUnit === "kg" ? "lb" : "kg";

    const w = Number(weightInput || 0);
    const tw = Number(targetWeightInput || 0);

    const nextW =
      nextUnit === "lb"
        ? Math.round(kgToLb(weightUnit === "kg" ? w : lbToKg(w)))
        : Math.round(lbToKg(weightUnit === "lb" ? w : kgToLb(w)));

    const nextTW =
      nextUnit === "lb"
        ? Math.round(kgToLb(weightUnit === "kg" ? tw : lbToKg(tw)))
        : Math.round(lbToKg(weightUnit === "lb" ? tw : kgToLb(tw)));

    setWeightUnit(nextUnit);
    setWeightInput(String(nextW));
    setTargetWeightInput(String(nextTW));

    setDirty(true);
    Haptics.selectionAsync();

    try {
      await updateProfile(user.uid, { weightUnit: nextUnit });
    } catch {}
  }, [user?.uid, weightInput, targetWeightInput, weightUnit]);

  const onChangeProfilePhoto = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Photos access needed", "Allow photo access to choose a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await updateProfile(user.uid, { photoURL: result.assets[0].uri });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Photo update failed", "Couldn’t update your profile photo right now.");
    }
  }, [user?.uid]);

  // ✅ Save now includes the “old features” fields too
  const onSave = useCallback(async () => {
    if (!user?.uid) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      await updateProfile(user.uid, {
        // body basics
        sex,
        age: Number(age || 0),
        heightCm: Number(heightCm || 0),
        weightUnit,
        weightKg: Number(weightKg || 0),
        targetWeightKg: Number(targetWeightKg || 0),

        // goal meta
        goal: goalType,
        activityLevel,

        updatedAt: Date.now(),
      } as any);

      setSaveStatus("ok");
      setDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setSaveStatus("err");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 1200);
    }
  }, [
    user?.uid,
    sex,
    age,
    heightCm,
    weightUnit,
    weightKg,
    targetWeightKg,
    goalType,
    activityLevel,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    setTimeout(() => setRefreshing(false), 650);
  }, []);

  // Trend series placeholder (same as before)
  const trendSeries = useMemo(() => {
    const w = Number(weightKg || 0);
    if (!w) return [];
    const base = w;
    return Array.from({ length: 24 }).map((_, i) => {
      const t = i / 23;
      const wave = Math.sin(t * Math.PI * 2) * 0.6;
      const drift = (t - 0.5) * 0.8;
      return Number((base + wave + drift).toFixed(1));
    });
  }, [weightKg]);

  if (!profile) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={[colors.background, colors.background]}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: colors.muted, fontWeight: "800" }}>
            Loading…
          </Text>
        </View>
      </View>
    );
  }

  const gradient = [colors.background, colors.background, colors.background] as [string, string, string];

  const savePill = (
    <Pressable
      onPress={() => {
        if (!dirty) return;
        onSave();
      }}
      style={({ pressed }: { pressed: boolean }) => ({
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: dirty
          ? withAlpha(colors.primary, pressed ? 0.22 : 0.18)
          : withAlpha(colors.success, 0.16),
        borderWidth: 1,
        borderColor: dirty
          ? withAlpha(colors.primary, 0.35)
          : withAlpha(colors.success, 0.38),
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      })}
      accessibilityRole="button"
      accessibilityLabel={dirty ? "Save profile changes" : "No changes to save"}
    >
      {!dirty && saveStatus !== "err" ? (
        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
      ) : null}
      <Text
        style={{
          color: dirty ? colors.text : saveStatus === "err" ? colors.danger : colors.success,
          fontWeight: "900",
          fontSize: 12,
        }}
      >
        {saving
          ? "Saving…"
          : saveStatus === "ok"
          ? "Saved"
          : saveStatus === "err"
          ? "Try again"
          : dirty
          ? "Save changes"
          : "Up to date"}
      </Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={gradient}
        style={{ position: "absolute", inset: 0 }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 16,
          gap: 14,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.muted}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <PremiumProfileHeader
          initials={initials}
          name={profile.displayName || user?.displayName || "You"}
          subtitle={user?.email || ""}
          isPro={isPro}
          weightKg={Number(weightKg || 0)}
          targetWeightKg={Number(targetWeightKg || 0)}
          unit={weightUnit}
          goalType={goalType}
          activityLevel={activityLevel}
          onToggleUnit={onToggleUnit}
          onPressSettings={() => router.push("(modals)/control-center")}
          onPressAvatar={onChangeProfilePhoto}
          onPressGoPro={() => router.push("/paywall")}
          photoURL={(profile as any)?.photoURL || user?.photoURL || null}
          rightSlot={savePill}
        />

        <QuickStatsRow
          colors={colors}
          isDark={isDark}
          goalType={goalType}
          targetWeightKg={Number(targetWeightKg || 0)}
          weightKg={Number(weightKg || 0)}
          unit={weightUnit}
          proteinGoal={Number(
            (profile as any)?.goalResult?.protein ??
              profile?.proteinGoal ??
              profile?.dailyProteinTarget ??
              150
          )}
          onPressStreak={() => router.push("/profile/insights-progress")}
          onPressGoal={() => router.push("/profile/goal-setup")}
          onPressProtein={() => router.push("/profile/goal-setup")}
        />

        <InsightsEntryCard
          colors={colors}
          isDark={isDark}
          values={trendSeries.slice(-7)}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/profile/insights-progress");
          }}
        />

        <IntegrationsEntryCard
          colors={colors}
          isDark={isDark}
          snapshot={integrations}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/profile/integrations");
          }}
        />

        <StepsHistoryEntryCard
          colors={colors}
          isDark={isDark}
          stepsMap={(((profile as any)?.steps ?? {}) as Record<string, number>) || {}}
          stepsGoal={Number((profile as any)?.stepsGoal ?? 8000)}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/profile/steps-history");
          }}
        />

        <SectionLabel title="Your Stats" colors={colors} />

        {/* <QuickActionsRow
          onScanMeal={() => router.push("/scan-meal")}
          onLogWorkout={() => router.push("/workouts")}
          onAddCheckIn={() => {
            Haptics.selectionAsync();
            Alert.alert(
              "Add a check-in",
              "Wire this to your check-in flow (weight, photos, measurements).",
              [{ text: "OK" }]
            );
          }}
          onBadges={() => router.push("/badges")}
          onFriends={() => router.push("/friends")}
        /> */}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <MetricsCard
              unit={weightUnit}
              weightKg={Number(weightKg || 0)}
              targetWeightKg={Number(targetWeightKg || 0)}
              heightCm={Number(heightCm || 0)}
              bodyFatPct={(profile as any)?.bodyFatPct}
              waistCm={(profile as any)?.waistCm}
              restingHeartRateBpm={(profile as any)?.restingHeartRateBpm}
              lastUpdatedVia={(profile as any)?.healthLastUpdatedVia}
              lastUpdatedAt={(profile as any)?.healthLastUpdatedAt}
              onPressAdd={() => {
                Haptics.selectionAsync();

                router.push({
                  pathname: "/(modals)/body-metrics",
                  params: {
                    unit: weightUnit, // "lb" | "kg"
                    weightKg: String(weightKg ?? ""),
                    targetWeightKg: String(targetWeightKg ?? ""),
                    heightCm: String(heightCm ?? ""),
                    bodyFatPct: String((profile as any)?.bodyFatPct ?? ""),
                    waistCm: String((profile as any)?.waistCm ?? ""),
                  },
                });
              }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <BodyTwinEvolveCard
              isDark={isDark}
              weightKg={Number(weightKg || 0)}
              targetWeightKg={Number(targetWeightKg || 0)}
              unit={weightUnit}
              heightCm={Number(heightCm || 0)}
              goalType={goalType}
              trendHint={
                trendSeries.length
                  ? trendSeries[trendSeries.length - 1] - trendSeries[0]
                  : 0
              }
              onPressCustomize={() => {
                Haptics.selectionAsync();
                router.push({
                  pathname: "/(modals)/bodyTwin",
                  params: {
                    weightKg: String(weightKg ?? ""),
                    heightCm: String(heightCm ?? ""),
                    // optional extras if you have them:
                    bodyFatPct: String((profile as any)?.bodyFatPct ?? ""),
                    waistCm: String((profile as any)?.waistCm ?? ""),
                  },
                });
              }}
            />
          </View>
        </View>

        <LongTermProgressCard
          unit={weightUnit} // "lb" | "kg"
          initialRange="6m"
          showConfidence
          onPressAddCheckIn={() => {
            // push your body metrics editor/modal
            router.push("/(modals)/long-term-progress");
          }}
        />

        {/* ✅ Meal schedule (old feature, premium skin) */}
        {/* <MealSchedulePremiumCard
          mealsPerDay={mealsPerDay}
          setMealsPerDay={(v) => {
            setMealsPerDay(v);
            setDirty(true);
          }}
          breakfastTime={breakfastTime}
          setBreakfastTime={(v) => {
            setBreakfastTime(v);
            setDirty(true);
          }}
          lastMealTime={lastMealTime}
          setLastMealTime={(v) => {
            setLastMealTime(v);
            setDirty(true);
          }}
        /> */}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <BadgesPreviewCard
              onPressAll={() => router.push("/badges")}
              unlockedCount={badgeUnlockedCount}
              previewIds={badgePreviewIds}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FriendsPreviewCard
              onPressAll={() => router.push("/friends")}
              friendsCount={friendsCount}
              streakPings={friendsPings}
              previewFriends={friendsPreview}
            />
          </View>
        </View>

        <SectionLabel title="Settings" colors={colors} />

        <AppearanceCard>
          <ThemeToggle />
        </AppearanceCard>

        <GlassCard>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/profile/friend-visibility");
            }}
            accessibilityRole="button"
            accessibilityLabel="Open Friend Visibility settings"
            style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 }}
          >
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14 }}>
                👁 What friends can see
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12.5 }}>
                Control what your friends can see
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </GlassCard>

        <DietPreferencesCard
          value={(profile as any)?.dietPreferences}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(modals)/diet-preferences");
          }}
        />

        <MacroGoalsCard
          inputs={buildGoalInputsFromProfile(profile ?? {})}
          result={(profile as any)?.goalResult ?? null}
          onPress={() => router.push("/profile/goal-setup")}
        />

        <GlassCard>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setPrivacyOpen((v) => !v);
            }}
            accessibilityRole="button"
            accessibilityLabel="Toggle Privacy and Safety"
            style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
          >
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 14, flex: 1 }}>
              🔒 Privacy & Safety
            </Text>
            <Ionicons
              name={privacyOpen ? "chevron-up" : "chevron-forward"}
              size={18}
              color={colors.muted}
            />
          </Pressable>
          {privacyOpen ? (
            <>
              <Text style={{ color: colors.muted, marginTop: 6, lineHeight: 18 }}>
                Your progress is yours. This page avoids shame language, hides
                sensitive signals by default, and uses neutral, supportive copy.
              </Text>

              <View style={{ height: 10 }} />
              <View style={{ gap: 10 }}>
                <EmptyState
                  title="Private by default"
                  message="Friends see what you choose to share — never raw weight or calories unless you opt in."
                  icon="lock-closed-outline"
                />
                <EmptyState
                  title="Accessibility aware"
                  message="Large touch targets, readable contrast, reduced motion friendly interactions."
                  icon="eye-outline"
                />
                <EmptyState
                  title="Emotionally safe"
                  message="Trends are framed as information — not judgment. You’re in control."
                  icon="heart-outline"
                />
              </View>
            </>
          ) : null}
        </GlassCard>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Optional: “always visible” save prompt in premium style (keeps your save pill too) */}
      {dirty ? (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + 52,
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={onSave}
            style={({ pressed }: { pressed: boolean }) => ({
              height: 52,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              backgroundColor: withAlpha(colors.primary, pressed ? 0.22 : 0.16),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            })}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              {saving
                ? "Saving…"
                : saveStatus === "ok"
                ? "Saved"
                : "Save changes"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={{ paddingTop: 6, paddingHorizontal: 2 }}>
      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          fontWeight: "900",
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function QuickStatsRow({
  colors,
  isDark,
  goalType,
  targetWeightKg,
  weightKg,
  unit,
  proteinGoal,
  onPressStreak,
  onPressGoal,
  onPressProtein,
}: {
  colors: any;
  isDark: boolean;
  goalType: GoalUILabel;
  targetWeightKg: number;
  weightKg: number;
  unit: "kg" | "lb";
  proteinGoal: number;
  onPressStreak: () => void;
  onPressGoal: () => void;
  onPressProtein: () => void;
}) {
  const remainingKg = Math.abs((weightKg || 0) - (targetWeightKg || 0));
  const remaining =
    unit === "kg" ? `${Math.round(remainingKg)} kg` : `${Math.round(kgToLb(remainingKg))} lb`;
  const goalLabel =
    goalType === "cut"
      ? "Cut"
      : goalType === "lean_bulk"
      ? "Lean bulk"
      : goalType === "bulk"
      ? "Bulk"
      : "Maintain";
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 6 }}>
      <StatChip colors={colors} isDark={isDark} icon="flame-outline" label="7 day streak" onPress={onPressStreak} />
      <StatChip
        colors={colors}
        isDark={isDark}
        icon="locate-outline"
        label={`${goalLabel} · ${targetWeightKg && weightKg ? `${remaining} to go` : "set target"}`}
        onPress={onPressGoal}
      />
      <StatChip
        colors={colors}
        isDark={isDark}
        icon="flash-outline"
        label={`${Math.round(proteinGoal || 185)}g protein goal`}
        onPress={onPressProtein}
      />
    </ScrollView>
  );
}

function StatChip({
  colors,
  isDark,
  icon,
  label,
  onPress,
}: {
  colors: any;
  isDark: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 32,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface1,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Ionicons name={icon} size={14} color={colors.textTertiary} />
      <Text style={{ color: colors.textSecondary, fontWeight: "500", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

function InsightsEntryCard({
  colors,
  isDark,
  values,
  onPress,
}: {
  colors: any;
  isDark: boolean;
  values: number[];
  onPress: () => void;
}) {
  const safeValues = values.length ? values : [3, 5, 4, 6, 5, 7, 6];
  const max = Math.max(...safeValues, 1);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open Insights and Progress"
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
      })}
    >
      <LinearGradient
        colors={[
          withAlpha(colors.primary, isDark ? 0.28 : 0.16),
          withAlpha(colors.accent, isDark ? 0.18 : 0.1),
          withAlpha(colors.accent, isDark ? 0.08 : 0.06),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, 0.38),
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          shadowColor: colors.primary,
          shadowOpacity: isDark ? 0.22 : 0.1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 3,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>
            Insights & Progress
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 12.5 }}>
            Weekly trends, streaks, and nutrition patterns
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 42 }}>
          {safeValues.map((v, idx) => (
            <View
              key={`${v}-${idx}`}
              style={{
                width: 6,
                height: 10 + Math.round((v / max) * 28),
                borderRadius: 999,
                backgroundColor:
                  idx === safeValues.length - 1
                    ? colors.accent
                    : withAlpha(colors.accent, 0.55),
              }}
            />
          ))}
        </View>
        <Text style={{ color: colors.text, fontWeight: "900" }}>View →</Text>
      </LinearGradient>
    </Pressable>
  );
}

function IntegrationsEntryCard({
  colors,
  isDark,
  snapshot,
  onPress,
}: {
  colors: any;
  isDark: boolean;
  snapshot: IntegrationSnapshot | null;
  onPress: () => void;
}) {
  const count = snapshot ? connectedCount(snapshot) : 0;
  const health = snapshot ? syncHealth(snapshot) : "none";
  const chipColor =
    health === "error" ? colors.danger : count > 0 ? colors.success : colors.muted;
  const chipText = health === "error" ? "Sync error" : count > 0 ? `${count} connected` : "Not set up";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open Integrations"
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
      })}
    >
      <View
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, isDark ? 0.28 : 0.18),
          backgroundColor: isDark ? "rgba(26,26,36,0.92)" : colors.surface,
          padding: 15,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(colors.primary, 0.18),
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.28),
          }}
        >
          <Ionicons name="link-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>
            Integrations
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "800", marginTop: 3 }}>
            Connect health apps to auto-sync your data
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: withAlpha(chipColor, 0.32),
            backgroundColor: withAlpha(chipColor, 0.12),
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          {health === "error" ? (
            <Ionicons name="warning-outline" size={12} color={chipColor} />
          ) : null}
          <Text style={{ color: chipColor, fontWeight: "500", fontSize: 11 }}>
            {chipText}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function StepsHistoryEntryCard({
  colors,
  isDark,
  stepsMap,
  stepsGoal,
  onPress,
}: {
  colors: any;
  isDark: boolean;
  stepsMap: Record<string, number>;
  stepsGoal: number;
  onPress: () => void;
}) {
  const today = new Date();
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const last7 = Array.from({ length: 7 }, (_, i) => ymd(addDays(today, -6 + i)));
  const values = last7.map((d) => Number(stepsMap[d] || 0));
  const max = Math.max(...values, stepsGoal || 1, 1);
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const todaySteps = values[values.length - 1] || 0;
  const hitDays = values.filter((v) => v >= stepsGoal).length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open steps history"
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
      })}
    >
      <View
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface1,
          padding: 16,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface3,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="footsteps-outline" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>
              Steps History
            </Text>
            <Text style={{ color: colors.muted, fontWeight: "800", marginTop: 3 }}>
              Daily trend, goal hits, and your recent pace
            </Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: "900" }}>View →</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <MiniStatCard
            colors={colors}
            label="Today"
            value={todaySteps.toLocaleString()}
            tint={colors.accent}
          />
          <MiniStatCard
            colors={colors}
            label="7-day avg"
            value={avg.toLocaleString()}
            tint={colors.primary}
          />
          <MiniStatCard
            colors={colors}
            label="Goal hits"
            value={`${hitDays}/7`}
            tint={colors.success}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 70 }}>
          {values.map((v, idx) => {
            const h = 12 + Math.round((v / max) * 48);
            const hit = v >= stepsGoal;
            return (
              <View key={`${last7[idx]}-${v}`} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    width: "100%",
                    maxWidth: 26,
                    height: h,
                    borderRadius: 999,
                    backgroundColor: hit
                      ? colors.accent
                      : colors.surface3,
                  }}
                />
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>
                  {new Date(`${last7[idx]}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "narrow",
                  })}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

function MiniStatCard({
  colors,
  label,
  value,
  tint,
}: {
  colors: any;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        padding: 12,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
      }}
    >
      <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 11 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>{value}</Text>
    </View>
  );
}
