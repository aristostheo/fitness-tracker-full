// app/body-twin/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { withAlpha } from "@/lib/color";

// If you already have a profile service, you can swap this to subscribeProfile.
// For now, we read nothing “live” and just evolve based on whatever you pass in.
import type {
  BodyMetrics,
  Accomplishment,
  FutureSelfTarget,
  BodyTwinSnapshot,
  BodyTwinStyle,
  BodyTwinState,
} from "@/services/profile/bodyTwin/new/types";
import {
  loadBodyTwinState,
  ingestMetricsAndEvolve,
  updateBodyTwinStyle,
} from "@/services/profile/bodyTwin/new/store";
import {
  computeFutureTargetShape,
  evolvesPercent,
  metricsToTargetShape,
} from "@/services/profile/bodyTwin/new/evolution";

import { AvatarStage } from "@/components/profile/premium/bodyTwin/AvatarStage";
import { CustomizationSheet } from "@/components/profile/premium/bodyTwin/CustomizationSheet";

const DEFAULT_TWIN_STYLE: BodyTwinStyle = {
  skinTone: "medium",
  hair: "short",
  outfit: "athleisure",
  vibe: "sleek",
};

function formatKg(kg?: number) {
  if (kg == null || Number.isNaN(kg)) return "—";
  return `${Math.round(kg)} kg`;
}
function fmtPct(v?: number) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v)}%`;
}
function fmtCm(v?: number) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v)} cm`;
}

function daysAgo(ts: number) {
  const d = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (d < 1) return "Today";
  if (d < 2) return "Yesterday";
  if (d < 7) return `${Math.floor(d)}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function buildAccomplishments(snapshots: BodyTwinSnapshot[]): Accomplishment[] {
  // Lightweight “feel-good” milestones (no body judgment).
  const acc: Accomplishment[] = [];
  if (snapshots.length >= 4) {
    acc.push({
      id: "consistency_4",
      title: "Consistency streak",
      subtitle: "You’ve checked in 4+ times. Small updates matter.",
      icon: "flame",
      at: snapshots[snapshots.length - 1].at,
    });
  }
  if (snapshots.length >= 10) {
    acc.push({
      id: "timeline_10",
      title: "A real timeline",
      subtitle: "You’re building a story — not a snapshot.",
      icon: "time",
      at: snapshots[snapshots.length - 1].at,
    });
  }
  return acc;
}

/**
 * OPTIONAL:
 * If you have metrics in Profile already, pass them via route params or load from profile.
 * Here we keep it safe: if no metrics, the twin still exists & feels calm.
 */
export default function BodyTwinScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const uid = user?.uid ?? "local_demo";

  const [refreshing, setRefreshing] = useState(false);

  // “Latest metrics” — plug in your real source:
  const [metrics, setMetrics] = useState<BodyMetrics | undefined>(undefined);

  const [state, setState] = useState<BodyTwinState | null>(null);
  // compare mode
  const [compareOn, setCompareOn] = useState(false);
  const [thenSnap, setThenSnap] = useState<BodyTwinSnapshot | null>(null);

  // future self preview
  const [futureOn, setFutureOn] = useState(false);
  const [futureStrength, setFutureStrength] = useState(0.6); // 0..1, purely visual blend
  const [futureTarget, setFutureTarget] = useState<FutureSelfTarget>({
    targetWeightKg: undefined,
    targetBodyFatPct: undefined,
    targetWaistCm: undefined,
  });

  const params = useLocalSearchParams<{
    weightKg?: string;
    heightCm?: string;
    bodyFatPct?: string;
    waistCm?: string;
  }>();
  const [paramsReady, setParamsReady] = useState(false);

  const clean = (n?: number) =>
    Number.isFinite(n as any) && (n as number) > 0 ? (n as number) : undefined;

  useEffect(() => {
    const w = clean(params.weightKg ? Number(params.weightKg) : undefined);
    const h = clean(params.heightCm ? Number(params.heightCm) : undefined);
    const bf = clean(params.bodyFatPct ? Number(params.bodyFatPct) : undefined);
    const waist = clean(params.waistCm ? Number(params.waistCm) : undefined);

    // Only set metrics if at least one meaningful value exists.
    if (w || h || bf || waist) {
      setMetrics({
        weightKg: w,
        heightCm: h,
        bodyFatPct: bf,
        waistCm: waist,
        updatedAt: Date.now(),
      });
    }

    setParamsReady(true);
  }, [params.weightKg, params.heightCm, params.bodyFatPct, params.waistCm]);

  // customization sheet
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      // evolve based on latest metrics (if any)
      const s1 = await ingestMetricsAndEvolve({
        uid,
        metrics,
        halfLifeDays: 14, // slow + safe
      });

      setState(s1);
      if (!thenSnap) {
        setThenSnap(
          s1.snapshots?.[Math.max(0, s1.snapshots.length - 2)] ?? null
        );
      }
    } finally {
    }
  }, [uid, metrics, thenSnap]);

  useEffect(() => {
    if (!paramsReady) return;
    load();
  }, [load, paramsReady]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setRefreshing(false);
    }
  }, [load]);
  const twinStyle = useMemo<BodyTwinStyle>(() => {
    return state?.style ?? DEFAULT_TWIN_STYLE;
  }, [state?.style]);

  const accent = colors.accent ?? "#D7B36A";
  const bgTop = isDark ? "#050713" : "#F6F7FB";
  const bgBottom = isDark ? "#00010A" : "#EEF1F8";

  const cardGlass = withAlpha(
    colors.card ?? (isDark ? "#101426" : "#FFFFFF"),
    isDark ? 0.22 : 0.78
  );
  const border = withAlpha(colors.text, isDark ? 0.12 : 0.1);

  const targetShape = useMemo(() => {
    if (!state) return metricsToTargetShape(metrics);
    return state.targetShape;
  }, [state, metrics]);

  const baselineShape = useMemo(() => {
    if (!state) return undefined;
    return state.snapshots?.[0]?.shape ?? state.currentShape;
  }, [state]);

  const evolves = useMemo(() => {
    if (!state || !baselineShape) return 0;
    return evolvesPercent({
      baseline: baselineShape,
      current: state.currentShape,
      target: targetShape,
    });
  }, [state, baselineShape, targetShape]);

  const accomplishments = useMemo(
    () => buildAccomplishments(state?.snapshots ?? []),
    [state]
  );

  const thenShape = useMemo(() => {
    if (!compareOn || !thenSnap) return undefined;
    return thenSnap.shape;
  }, [compareOn, thenSnap]);

  const futureShape = useMemo(() => {
    if (!futureOn) return undefined;

    // We compute a “future target” using optional goal metrics:
    const fTarget = computeFutureTargetShape({
      currentMetrics: metrics,
      future: futureTarget,
    });

    // Then we blend current -> futureTarget by slider strength:
    const cur = state?.currentShape ?? targetShape;
    const t = futureStrength;

    return {
      mass: cur.mass + (fTarget.mass - cur.mass) * t,
      waist: cur.waist + (fTarget.waist - cur.waist) * t,
      shoulders: cur.shoulders + (fTarget.shoulders - cur.shoulders) * t,
      posture: cur.posture + (fTarget.posture - cur.posture) * t,
    };
  }, [futureOn, futureStrength, metrics, futureTarget, state, targetShape]);

  const stageShape = useMemo(() => {
    if (compareOn && thenShape) return thenShape;
    return state?.currentShape ?? targetShape;
  }, [compareOn, thenShape, state, targetShape]);

  const stageLabel = useMemo(() => {
    if (futureOn) return "Future (preview)";
    if (compareOn) return "Then";
    return "Now";
  }, [futureOn, compareOn]);

  const toggleCompare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompareOn((v) => !v);
    setFutureOn(false);
  };

  const toggleFuture = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFutureOn((v) => !v);
    setCompareOn(false);
  };

  const openCustomize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!state) return; // or load() first
    setCustomizeOpen(true);
  };

  const onChangeStyle = async (patch: any) => {
    const next = await updateBodyTwinStyle(uid, patch);
    setState(next);
  };

  const pickThenSnapshot = (snap: BodyTwinSnapshot) => {
    Haptics.selectionAsync();
    setThenSnap(snap);
    if (!compareOn) setCompareOn(true);
    setFutureOn(false);
  };

  const safeTitle = "Body Twin";
  const safeSubtitle = "A calm visual companion";

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[bgTop, bgBottom]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={withAlpha(colors.text, 0.6)}
          />
        }
      >
        {/* Header */}
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
              {safeTitle}
            </Text>
            <Text style={[styles.sub, { color: withAlpha(colors.text, 0.68) }]}>
              {safeSubtitle}
            </Text>
          </View>

          <Pressable
            onPress={openCustomize}
            style={[
              styles.iconBtn,
              {
                backgroundColor: withAlpha(colors.card, 0.14),
                borderColor: border,
              },
            ]}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={withAlpha(colors.text, 0.9)}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/body-twin/settings");
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
              name="settings-outline"
              size={18}
              color={withAlpha(colors.text, 0.9)}
            />
          </Pressable>
        </View>

        {/* Avatar stage */}
        <View style={{ paddingHorizontal: 14 }}>
          <Animated.View entering={FadeIn.duration(240)}>
            <AvatarStage
              shape={stageShape}
              style={twinStyle}
              futureShape={futureShape}
              modeLabel={stageLabel}
            />
          </Animated.View>

          {/* Stats row (mirrors your card vibe) */}
          <View style={styles.statsRow}>
            <BlurView
              intensity={18}
              tint={isDark ? "dark" : "light"}
              style={[
                styles.statCard,
                { backgroundColor: cardGlass, borderColor: border },
              ]}
            >
              <Text
                style={[
                  styles.statLabel,
                  { color: withAlpha(colors.text, 0.62) },
                ]}
              >
                Evolves
              </Text>
              <Text
                style={[
                  styles.statValue,
                  { color: withAlpha(colors.text, 0.96) },
                ]}
              >
                {Math.round(evolves * 100)}%
              </Text>
            </BlurView>

            <BlurView
              intensity={18}
              tint={isDark ? "dark" : "light"}
              style={[
                styles.statCard,
                { backgroundColor: cardGlass, borderColor: border },
              ]}
            >
              <Text
                style={[
                  styles.statLabel,
                  { color: withAlpha(colors.text, 0.62) },
                ]}
              >
                Weight
              </Text>
              <Text
                style={[
                  styles.statValue,
                  { color: withAlpha(colors.text, 0.96) },
                ]}
              >
                {formatKg(metrics?.weightKg)}
              </Text>
            </BlurView>
          </View>

          {/* Mode controls */}
          <BlurView
            intensity={18}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.modeBar,
              { backgroundColor: cardGlass, borderColor: border },
            ]}
          >
            <Pressable
              onPress={toggleCompare}
              style={[
                styles.modeBtn,
                compareOn && {
                  backgroundColor: withAlpha(accent, 0.12),
                  borderColor: withAlpha(accent, 0.24),
                },
              ]}
            >
              <Ionicons
                name="swap-horizontal"
                size={16}
                color={withAlpha(colors.text, 0.86)}
              />
              <Text
                style={[
                  styles.modeText,
                  { color: withAlpha(colors.text, 0.86) },
                ]}
              >
                Then vs Now
              </Text>
            </Pressable>

            <Pressable
              onPress={toggleFuture}
              style={[
                styles.modeBtn,
                futureOn && {
                  backgroundColor: withAlpha(accent, 0.12),
                  borderColor: withAlpha(accent, 0.24),
                },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={16}
                color={withAlpha(colors.text, 0.86)}
              />
              <Text
                style={[
                  styles.modeText,
                  { color: withAlpha(colors.text, 0.86) },
                ]}
              >
                Future Self
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  "How it works",
                  "Body Twin evolves with gentle smoothing. Small changes won’t cause sudden jumps.\n\nIt’s a visual companion — not an evaluation."
                );
              }}
              style={styles.modeBtn}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={withAlpha(colors.text, 0.86)}
              />
              <Text
                style={[
                  styles.modeText,
                  { color: withAlpha(colors.text, 0.86) },
                ]}
              >
                About
              </Text>
            </Pressable>
          </BlurView>

          {/* Then vs Now: timeline */}
          {compareOn && (
            <Animated.View
              entering={FadeInDown.duration(220)}
              style={{ marginTop: 14 }}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: withAlpha(colors.text, 0.9) },
                ]}
              >
                Timeline snapshots
              </Text>
              <Text
                style={[
                  styles.sectionSub,
                  { color: withAlpha(colors.text, 0.66) },
                ]}
              >
                Tap a snapshot to compare. This is about noticing time — not
                judging days.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
              >
                <View
                  style={{ flexDirection: "row", gap: 10, paddingRight: 10 }}
                >
                  {(state?.snapshots ?? [])
                    .slice()
                    .reverse()
                    .map((s: BodyTwinSnapshot) => {
                      const active = thenSnap?.id === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => pickThenSnapshot(s)}
                          style={[
                            styles.snapChip,
                            {
                              borderColor: active
                                ? withAlpha(accent, 0.3)
                                : border,
                              backgroundColor: active
                                ? withAlpha(accent, 0.1)
                                : cardGlass,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.snapTop,
                              { color: withAlpha(colors.text, 0.9) },
                            ]}
                          >
                            {s.label ?? "Snapshot"}
                          </Text>
                          <Text
                            style={[
                              styles.snapBot,
                              { color: withAlpha(colors.text, 0.62) },
                            ]}
                          >
                            {daysAgo(s.at)}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              </ScrollView>

              <BlurView
                intensity={16}
                tint={isDark ? "dark" : "light"}
                style={[
                  styles.compareCard,
                  { backgroundColor: cardGlass, borderColor: border },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.compareTitle,
                        { color: withAlpha(colors.text, 0.92) },
                      ]}
                    >
                      Then
                    </Text>
                    <Text
                      style={[
                        styles.compareVal,
                        { color: withAlpha(colors.text, 0.82) },
                      ]}
                    >
                      {formatKg(thenSnap?.metrics?.weightKg)} ·{" "}
                      {fmtPct(thenSnap?.metrics?.bodyFatPct)} ·{" "}
                      {fmtCm(thenSnap?.metrics?.waistCm)}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 1,
                      backgroundColor: border,
                      marginHorizontal: 12,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.compareTitle,
                        { color: withAlpha(colors.text, 0.92) },
                      ]}
                    >
                      Now
                    </Text>
                    <Text
                      style={[
                        styles.compareVal,
                        { color: withAlpha(colors.text, 0.82) },
                      ]}
                    >
                      {formatKg(metrics?.weightKg)} ·{" "}
                      {fmtPct(metrics?.bodyFatPct)} · {fmtCm(metrics?.waistCm)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.compareNote,
                    { color: withAlpha(colors.text, 0.62) },
                  ]}
                >
                  Visual changes are smoothed on purpose. You’re allowed to
                  change without feeling observed.
                </Text>
              </BlurView>
            </Animated.View>
          )}

          {/* Future Self */}
          {futureOn && (
            <Animated.View
              entering={FadeInDown.duration(220)}
              style={{ marginTop: 14 }}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: withAlpha(colors.text, 0.9) },
                ]}
              >
                Future Self (preview)
              </Text>
              <Text
                style={[
                  styles.sectionSub,
                  { color: withAlpha(colors.text, 0.66) },
                ]}
              >
                This is a gentle “what-if.” It won’t change your Body Twin
                unless you choose to save goals elsewhere.
              </Text>

              <BlurView
                intensity={16}
                tint={isDark ? "dark" : "light"}
                style={[
                  styles.futureCard,
                  { backgroundColor: cardGlass, borderColor: border },
                ]}
              >
                <View style={styles.futureRow}>
                  <Text
                    style={[
                      styles.futureLabel,
                      { color: withAlpha(colors.text, 0.86) },
                    ]}
                  >
                    Preview strength
                  </Text>
                  <Text
                    style={[
                      styles.futureValue,
                      { color: withAlpha(colors.text, 0.86) },
                    ]}
                  >
                    {Math.round(futureStrength * 100)}%
                  </Text>
                </View>

                {/* Simple stepped slider (no dependency) */}
                <View style={styles.sliderTrack}>
                  {Array.from({ length: 9 }).map((_, i) => {
                    const t = i / 8;
                    const active = t <= futureStrength + 1e-6;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setFutureStrength(t);
                        }}
                        style={[
                          styles.sliderTick,
                          {
                            backgroundColor: active
                              ? withAlpha(accent, 0.42)
                              : withAlpha(colors.text, 0.1),
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text
                    style={[
                      styles.futureMini,
                      { color: withAlpha(colors.text, 0.66) },
                    ]}
                  >
                    Optional goal inputs (for preview only)
                  </Text>

                  <View style={styles.futureInputs}>
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setFutureTarget((p) => ({
                          ...p,
                          targetWeightKg:
                            (p.targetWeightKg ?? metrics?.weightKg ?? 90) - 2,
                        }));
                      }}
                      style={[
                        styles.smallBtn,
                        {
                          borderColor: border,
                          backgroundColor: withAlpha(colors.card, 0.1),
                        },
                      ]}
                    >
                      <Ionicons
                        name="remove"
                        size={16}
                        color={withAlpha(colors.text, 0.9)}
                      />
                      <Text
                        style={[
                          styles.smallBtnText,
                          { color: withAlpha(colors.text, 0.9) },
                        ]}
                      >
                        Weight
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setFutureTarget((p) => ({
                          ...p,
                          targetWeightKg:
                            (p.targetWeightKg ?? metrics?.weightKg ?? 90) + 2,
                        }));
                      }}
                      style={[
                        styles.smallBtn,
                        {
                          borderColor: border,
                          backgroundColor: withAlpha(colors.card, 0.1),
                        },
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={16}
                        color={withAlpha(colors.text, 0.9)}
                      />
                      <Text
                        style={[
                          styles.smallBtnText,
                          { color: withAlpha(colors.text, 0.9) },
                        ]}
                      >
                        Weight
                      </Text>
                    </Pressable>

                    <View style={{ flex: 1 }} />

                    <Text
                      style={[
                        styles.futureReadout,
                        { color: withAlpha(colors.text, 0.86) },
                      ]}
                    >
                      {formatKg(
                        futureTarget.targetWeightKg ?? metrics?.weightKg
                      )}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.compareNote,
                    { color: withAlpha(colors.text, 0.62), marginTop: 10 },
                  ]}
                >
                  Tip: Keep this as a calm compass, not a deadline.
                </Text>
              </BlurView>
            </Animated.View>
          )}

          {/* Accomplishments */}
          <Animated.View
            entering={FadeInDown.duration(220)}
            style={{ marginTop: 14 }}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: withAlpha(colors.text, 0.9) },
              ]}
            >
              Accomplishments
            </Text>
            <Text
              style={[
                styles.sectionSub,
                { color: withAlpha(colors.text, 0.66) },
              ]}
            >
              Tiny wins that respect your pace.
            </Text>

            <View style={{ marginTop: 10, gap: 10 }}>
              {accomplishments.length === 0 ? (
                <BlurView
                  intensity={14}
                  tint={isDark ? "dark" : "light"}
                  style={[
                    styles.emptyCard,
                    { backgroundColor: cardGlass, borderColor: border },
                  ]}
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={withAlpha(colors.text, 0.7)}
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      { color: withAlpha(colors.text, 0.7) },
                    ]}
                  >
                    Your first accomplishment will appear after a few gentle
                    check-ins.
                  </Text>
                </BlurView>
              ) : (
                accomplishments.map((a) => (
                  <BlurView
                    key={a.id}
                    intensity={14}
                    tint={isDark ? "dark" : "light"}
                    style={[
                      styles.achCard,
                      { backgroundColor: cardGlass, borderColor: border },
                    ]}
                  >
                    <View style={styles.achIcon}>
                      <Ionicons
                        name={(a.icon as any) ?? "trophy"}
                        size={18}
                        color={withAlpha(accent, 0.9)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.achTitle,
                          { color: withAlpha(colors.text, 0.92) },
                        ]}
                      >
                        {a.title}
                      </Text>
                      {!!a.subtitle && (
                        <Text
                          style={[
                            styles.achSub,
                            { color: withAlpha(colors.text, 0.62) },
                          ]}
                        >
                          {a.subtitle}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.achTime,
                        { color: withAlpha(colors.text, 0.52) },
                      ]}
                    >
                      {daysAgo(a.at)}
                    </Text>
                  </BlurView>
                ))
              )}
            </View>
          </Animated.View>

          {/* Emotionally safe disclaimers */}
          <View style={{ marginTop: 16 }}>
            <Text
              style={[
                styles.disclaimer,
                { color: withAlpha(colors.text, 0.58) },
              ]}
            >
              Body Twin is not a medical tool and doesn’t measure health. It’s a
              supportive visualization based on the metrics you choose to enter.
              If this ever feels stressful, you can pause or hide it in
              Settings.
            </Text>
          </View>
        </View>
      </ScrollView>

      <CustomizationSheet
        visible={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        style={twinStyle}
        onChangeStyle={onChangeStyle}
      />
    </View>
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
  title: { fontSize: 22, fontWeight: "900", letterSpacing: 0.2 },
  sub: { marginTop: 2, fontSize: 13, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  statCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  statLabel: { fontSize: 12, fontWeight: "800" },
  statValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  modeBar: {
    marginTop: 12,
    borderRadius: 22,
    padding: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    overflow: "hidden",
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  modeText: { fontSize: 13, fontWeight: "800" },

  sectionTitle: { marginTop: 2, fontSize: 16, fontWeight: "900" },
  sectionSub: { marginTop: 6, fontSize: 13, fontWeight: "600", lineHeight: 18 },

  snapChip: {
    width: 120,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
  },
  snapTop: { fontSize: 13, fontWeight: "900" },
  snapBot: { marginTop: 6, fontSize: 12, fontWeight: "700" },

  compareCard: {
    marginTop: 10,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  compareTitle: { fontSize: 13, fontWeight: "900" },
  compareVal: { marginTop: 6, fontSize: 13, fontWeight: "700" },
  compareNote: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },

  futureCard: {
    marginTop: 10,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  futureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  futureLabel: { fontSize: 13, fontWeight: "900" },
  futureValue: { fontSize: 13, fontWeight: "900" },
  sliderTrack: { marginTop: 12, flexDirection: "row", gap: 8 },
  sliderTick: { flex: 1, height: 10, borderRadius: 999 },

  futureMini: { fontSize: 12, fontWeight: "800" },
  futureInputs: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  smallBtnText: { fontSize: 13, fontWeight: "900" },
  futureReadout: { fontSize: 14, fontWeight: "900" },

  emptyCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  emptyText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },

  achCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  achIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  achTitle: { fontSize: 14, fontWeight: "900" },
  achSub: { marginTop: 3, fontSize: 12, fontWeight: "600", lineHeight: 16 },
  achTime: { fontSize: 12, fontWeight: "800" },

  disclaimer: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    paddingHorizontal: 4,
  },
});
