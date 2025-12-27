// app/(modals)/coach-spark.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/content/AuthContext";
import { subscribeWorkouts, type Workout } from "@/services/workouts";

// ✅ CHANGE THIS IMPORT to YOUR firebase auth export path
// Example options you might have:
// import { auth } from "@/services/firebase";
// import { auth } from "@/firebase";
// import { auth } from "@/config/firebase";
import { auth } from "@/lib/firebase";

type PlanItem = {
  exercise: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  notes?: string;
};

type Plan = null | { items: PlanItem[]; rationale?: string };

const withAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
};

function createdAtMs(r: any) {
  const c = r?.createdAt;
  if (!c) return 0;
  if (typeof c === "number") return c;
  if (typeof c?.toMillis === "function") return c.toMillis();
  if (typeof c?.seconds === "number") return c.seconds * 1000;
  return 0;
}

/** Match your old helper: recentHistory(workouts, 12) */
function recentHistory(workouts: any[], n = 12) {
  const rows = (workouts || []).slice().sort((a, b) => {
    // Prefer date desc then createdAt desc
    const ad = String((a as any).date || "");
    const bd = String((b as any).date || "");
    if (ad !== bd) return bd.localeCompare(ad);
    return createdAtMs(b) - createdAtMs(a);
  });
  return rows.slice(0, Math.max(0, n));
}

/** Replace with your real profileContext(profile) if you want */
function profileContext(profile: any) {
  return profile ?? {};
}

/**
 * ✅ YOUR EXISTING function (drop-in)
 */
async function generatePlanWithOpenAI(args: {
  dayText: string;
  profile: any;
  recent: any[];
  regenToken?: string | number;
}) {
  const url = process.env.EXPO_PUBLIC_AI_DESCRIBE_URL;
  if (!url) throw new Error("Missing EXPO_PUBLIC_AI_DESCRIBE_URL");

  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error("Not signed in (no ID token)");

  const payload = {
    mode: "workout_plan:v1",
    today: args.dayText,
    profile: args.profile ?? {},
    recent: args.recent ?? [],
    regenToken: args.regenToken ?? Date.now(),
    system: undefined,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Describe API error ${res.status}: ${t}`);
  }

  const ct = res.headers.get("content-type") || "";
  let raw: any = ct.includes("application/json")
    ? await res.json()
    : await res.text();
  let plan: any = null;

  if (raw && raw.items && Array.isArray(raw.items)) plan = raw;
  else if (raw && raw.data && raw.data.items) plan = raw.data;
  else if (typeof raw === "string") {
    const m = raw.match(/\{[\s\S]*\}$/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        if (parsed && Array.isArray(parsed.items)) plan = parsed;
      } catch {}
    }
  }
  return plan ?? { items: [], rationale: "" };
}

/**
 * Optional: your old ensurePro gate.
 * If you already have it, import and use it instead.
 * For now this allows everyone (so it won't break builds).
 */
function ensurePro(_reason: string) {
  return true;
}

function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.9 },
      ]}
    >
      {!!icon && (
        <Ionicons
          name={icon}
          size={14}
          color={
            selected ? withAlpha("#111", 0.92) : withAlpha("#FFFFFF", 0.82)
          }
        />
      )}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function GlassCard({
  children,
  style,
  intensity = 34,
}: {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
}) {
  return (
    <View style={[styles.cardWrap, style]}>
      <View style={styles.cardBorder} pointerEvents="none" />
      <BlurView intensity={intensity} tint="dark" style={styles.cardBlur}>
        <LinearGradient
          colors={[
            withAlpha("#FFFFFF", 0.1),
            withAlpha("#FFFFFF", 0.06),
            withAlpha("#000000", 0.06),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardInner}
        >
          {children}
        </LinearGradient>
      </BlurView>
    </View>
  );
}

export default function CoachSparkModal() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid;

  const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

  const presets = useMemo(
    () => ["push", "pull", "legs", "upper", "lower", "full body"],
    []
  );
  const [dayText, setDayText] = useState("");

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan>(null);

  // for “Added” feedback + selection set
  const [addedMap, setAddedMap] = useState<Record<number, boolean>>({});
  const [selectedIdx, setSelectedIdx] = useState<Record<number, boolean>>({});

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [profile, setProfile] = useState<any>(null); // optional if you want

  // if you want to hydrate profile from storage (optional)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!uid) return;
      try {
        const raw = await AsyncStorage.getItem(`profile:snapshot:${uid}`);
        if (!mounted) return;
        if (raw) setProfile(JSON.parse(raw));
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [uid]);

  // get workouts for recentHistory(workouts, 12)
  useEffect(() => {
    if (!uid) {
      setWorkouts([]);
      return;
    }
    return subscribeWorkouts(
      uid,
      (rows: Workout[]) => setWorkouts(rows || []),
      { max: 200 }
    );
  }, [uid]);

  const seedKey = (u: string) => `workout:templateSeed:${u}`;

  const haptic = async (kind: "light" | "select" = "select") => {
    try {
      if (kind === "light")
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else await Haptics.selectionAsync();
    } catch {}
  };

  const onClose = () => router.back();

  const pickPreset = (p: string) => {
    setDayText(p);
    void haptic("select");
  };

  // ✅ Your old handleGenerate (wired to this screen)
  async function handleGenerate() {
    if (!ensurePro("Coach Spark workout generator")) return;
    if (!dayText.trim()) return;

    try {
      setLoading(true);
      const res = await generatePlanWithOpenAI({
        dayText: dayText.trim(),
        profile: profileContext(profile),
        recent: recentHistory(workouts, 12),
        regenToken: Date.now(),
      });
      setPlan(res);
      setAddedMap({});
      setSelectedIdx({});
    } catch (e) {
      console.warn(e);
      Alert.alert(
        "Could not generate workout",
        (e as any)?.message || "Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRegenerate() {
    void handleGenerate();
  }

  function handleClear() {
    setPlan(null);
    setAddedMap({});
    setSelectedIdx({});
  }

  // Instead of inserting into a form, we “pick” items to start session with.
  function handleAdd(it: PlanItem, idx: number) {
    setSelectedIdx((m) => ({ ...m, [idx]: true }));
    setAddedMap((m) => ({ ...m, [idx]: true }));
    setTimeout(() => {
      setAddedMap((m) => {
        const n = { ...m };
        delete n[idx];
        return n;
      });
    }, 1500);
  }

  const selectedItems = useMemo(() => {
    if (!plan?.items?.length) return [];
    return Object.keys(selectedIdx)
      .filter((k) => selectedIdx[Number(k)])
      .map((k) => plan.items[Number(k)])
      .filter(Boolean);
  }, [plan, selectedIdx]);

  const startSessionWithItems = async (items: PlanItem[]) => {
    if (!uid) return;
    if (!items.length) return;

    await haptic("select");

    const title = `Coach Spark • ${dayText.trim() || "Workout"}`;
    const seed = {
      title,
      exercises: items.map((it) => ({
        name: it.exercise,
        sets: Math.max(1, Number(it.sets ?? 3)),
        reps: Math.max(1, Number(it.reps ?? 10)),
        weightKg: Number(it.weight_kg ?? 0),
        note: (it.notes || "").trim(),
      })),
    };

    await AsyncStorage.setItem(seedKey(uid), JSON.stringify(seed));
    router.replace({
      pathname: "/workouts/session",
      params: { coachSpark: "1", prompt: dayText.trim() },
    } as any);
  };

  const startWithAll = () => startSessionWithItems(plan?.items ?? []);
  const startWithSelected = () => startSessionWithItems(selectedItems);

  const hasPlan = !!plan?.items?.length;
  const canGenerate = !loading && !!dayText.trim();
  const canRegen = !loading && hasPlan;
  const canClear = !loading && hasPlan;

  const accent = "#68D7FF";
  const accent2 = "#8B7CFF";

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#070A12", "#050711", "#03040A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={{ paddingTop: topInset + 10, paddingHorizontal: 12 }}>
        <BlurView intensity={28} tint="dark" style={styles.headerBlur}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={withAlpha("#FFFFFF", 0.92)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Coach Spark</Text>
              <Text style={styles.sub}>Generate a smart plan for today</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close Coach Spark"
            >
              <Ionicons
                name="close"
                size={18}
                color={withAlpha("#FFFFFF", 0.86)}
              />
            </Pressable>
          </View>
        </BlurView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Input + presets */}
        <GlassCard intensity={34} style={{ borderRadius: 22 }}>
          <View style={{ gap: 12 }}>
            <View style={styles.fieldWrap}>
              <View style={styles.fieldIcon}>
                <Ionicons
                  name="flash-outline"
                  size={16}
                  color={withAlpha("#FFFFFF", 0.84)}
                />
              </View>
              <TextInput
                value={dayText}
                onChangeText={setDayText}
                placeholder='e.g. "push", "legs", "upper"'
                placeholderTextColor={withAlpha("#FFFFFF", 0.42)}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.fieldInput}
                returnKeyType="go"
                onSubmitEditing={() => (canGenerate ? handleGenerate() : null)}
              />
              {!!dayText && (
                <Pressable
                  onPress={() => setDayText("")}
                  hitSlop={10}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={withAlpha("#FFFFFF", 0.6)}
                  />
                </Pressable>
              )}
            </View>

            <View style={styles.presetRow}>
              {presets.map((p) => {
                const selected = dayText.trim().toLowerCase() === p;
                return (
                  <Chip
                    key={p}
                    label={p}
                    selected={selected}
                    onPress={() => pickPreset(p)}
                    icon="sparkles-outline"
                  />
                );
              })}
            </View>

            {/* Primary */}
            <Pressable
              onPress={handleGenerate}
              disabled={!canGenerate}
              style={({ pressed }) => [
                styles.primaryBtn,
                !canGenerate && { opacity: 0.55 },
                pressed && canGenerate && { opacity: 0.92 },
              ]}
            >
              <LinearGradient
                colors={[
                  withAlpha(accent, 0.42),
                  withAlpha(accent2, 0.22),
                  withAlpha("#FFFFFF", 0.08),
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryInner}
              >
                {loading ? (
                  <ActivityIndicator color={withAlpha("#FFFFFF", 0.9)} />
                ) : (
                  <Ionicons
                    name="sparkles"
                    size={18}
                    color={withAlpha("#FFFFFF", 0.95)}
                  />
                )}
                <Text style={styles.primaryText}>
                  {loading ? "Generating…" : "Generate Today’s Workout"}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Secondary row */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={handleRegenerate}
                disabled={!canRegen}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  !canRegen && { opacity: 0.55 },
                  pressed && canRegen && { opacity: 0.9 },
                ]}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={withAlpha("#FFFFFF", 0.86)}
                />
                <Text style={styles.secondaryText}>Regenerate</Text>
              </Pressable>

              <Pressable
                onPress={handleClear}
                disabled={!canClear}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  !canClear && { opacity: 0.55 },
                  pressed && canClear && { opacity: 0.9 },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={withAlpha("#FF5C6A", 0.95)}
                />
                <Text style={styles.dangerText}>Clear</Text>
              </Pressable>
            </View>
          </View>
        </GlassCard>

        {/* Loading / Result */}
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={accent} />
            <Text style={styles.loadingText}>Cooking something good…</Text>
          </View>
        ) : hasPlan ? (
          <View style={{ marginTop: 12 }}>
            <GlassCard intensity={30} style={{ borderRadius: 22 }}>
              <View style={{ gap: 10 }}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>Your plan</Text>
                  <View style={styles.resultMetaPill}>
                    <Ionicons
                      name="layers-outline"
                      size={14}
                      color={withAlpha("#FFFFFF", 0.82)}
                    />
                    <Text style={styles.resultMetaText}>
                      {plan!.items.length} exercises
                    </Text>
                  </View>
                </View>

                {!!plan?.rationale && (
                  <Text style={styles.rationale}>{plan.rationale}</Text>
                )}

                <View style={{ gap: 10 }}>
                  {plan!.items.map((it, idx) => {
                    const added = !!addedMap[idx];
                    const picked = !!selectedIdx[idx];

                    const meta =
                      `${it.sets ?? "—"}×${it.reps ?? "—"}` +
                      (typeof it.weight_kg === "number"
                        ? ` • ${Math.round(it.weight_kg)} kg`
                        : "") +
                      (it.notes ? ` • ${it.notes}` : "");

                    return (
                      <View
                        key={`${it.exercise}-${idx}`}
                        style={styles.itemRow}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {it.exercise}
                          </Text>
                          <Text style={styles.itemSub} numberOfLines={2}>
                            {meta}
                          </Text>
                        </View>

                        {added ? (
                          <View style={styles.addedPill}>
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={withAlpha(accent, 0.95)}
                            />
                            <Text style={styles.addedText}>Added</Text>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleAdd(it, idx)}
                            style={({ pressed }) => [
                              styles.addBtn,
                              picked && styles.addBtnPicked,
                              pressed && { opacity: 0.9 },
                            ]}
                          >
                            <Text style={styles.addBtnText}>
                              {picked ? "Picked" : "Add"}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                  <Pressable
                    onPress={startWithAll}
                    style={({ pressed }) => [
                      styles.startAllBtn,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <Ionicons
                      name="play"
                      size={16}
                      color={withAlpha("#111", 0.92)}
                    />
                    <Text style={styles.startAllText}>Start with plan</Text>
                  </Pressable>

                  <Pressable
                    onPress={startWithSelected}
                    disabled={selectedItems.length === 0}
                    style={({ pressed }) => [
                      styles.startSelectedBtn,
                      selectedItems.length === 0 && { opacity: 0.55 },
                      pressed && selectedItems.length > 0 && { opacity: 0.92 },
                    ]}
                  >
                    <Ionicons
                      name="checkbox-outline"
                      size={16}
                      color={withAlpha("#FFFFFF", 0.9)}
                    />
                    <Text style={styles.startSelectedText}>
                      Start ({selectedItems.length || 0})
                    </Text>
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          </View>
        ) : null}

        <Text style={styles.footerHint}>
          Tip: type “push” then hit Generate — or just tap a preset.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05060C" },

  cardWrap: { borderRadius: 18, overflow: "hidden" },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    zIndex: 2,
  },
  cardBlur: { borderRadius: 18, overflow: "hidden" },
  cardInner: { padding: 14 },

  headerBlur: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  headerRow: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.07),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  title: { color: withAlpha("#FFFFFF", 0.94), fontSize: 16, fontWeight: "900" },
  sub: {
    marginTop: 2,
    color: withAlpha("#FFFFFF", 0.6),
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },

  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  fieldInput: {
    flex: 1,
    color: withAlpha("#FFFFFF", 0.92),
    fontWeight: "800",
    fontSize: 14,
    paddingVertical: 0,
  },

  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  chipSelected: {
    backgroundColor: withAlpha("#68D7FF", 0.88),
    borderColor: withAlpha("#68D7FF", 0.85),
  },
  chipText: {
    color: withAlpha("#FFFFFF", 0.86),
    fontSize: 12,
    fontWeight: "900",
  },
  chipTextSelected: { color: withAlpha("#111", 0.92) },

  primaryBtn: { borderRadius: 18, overflow: "hidden" },
  primaryInner: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.16),
  },
  primaryText: {
    color: withAlpha("#FFFFFF", 0.94),
    fontSize: 14,
    fontWeight: "900",
  },

  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: { color: withAlpha("#FFFFFF", 0.9), fontWeight: "900" },

  dangerBtn: {
    width: 110,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FF5C6A", 0.1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FF5C6A", 0.28),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  dangerText: { color: withAlpha("#FF5C6A", 0.95), fontWeight: "900" },

  loadingBlock: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  loadingText: {
    marginTop: 10,
    color: withAlpha("#FFFFFF", 0.6),
    fontWeight: "800",
  },

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultTitle: {
    color: withAlpha("#FFFFFF", 0.92),
    fontSize: 14,
    fontWeight: "900",
  },
  resultMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  resultMetaText: {
    color: withAlpha("#FFFFFF", 0.82),
    fontWeight: "800",
    fontSize: 12,
  },

  rationale: {
    marginTop: 6,
    color: withAlpha("#FFFFFF", 0.62),
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.05),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.12),
  },
  itemTitle: { color: withAlpha("#FFFFFF", 0.92), fontWeight: "900" },
  itemSub: {
    marginTop: 3,
    color: withAlpha("#FFFFFF", 0.6),
    fontSize: 12,
    fontWeight: "700",
  },

  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: withAlpha("#68D7FF", 0.14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#68D7FF", 0.28),
  },
  addBtnPicked: {
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderColor: withAlpha("#FFFFFF", 0.14),
  },
  addBtnText: { color: withAlpha("#FFFFFF", 0.92), fontWeight: "900" },

  addedPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: withAlpha("#68D7FF", 0.12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#68D7FF", 0.28),
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addedText: { color: withAlpha("#68D7FF", 0.95), fontWeight: "900" },

  startAllBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.92),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  startAllText: { color: withAlpha("#111", 0.92), fontWeight: "900" },

  startSelectedBtn: {
    width: 140,
    height: 46,
    borderRadius: 16,
    backgroundColor: withAlpha("#FFFFFF", 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha("#FFFFFF", 0.14),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  startSelectedText: { color: withAlpha("#FFFFFF", 0.9), fontWeight: "900" },

  footerHint: {
    marginTop: 12,
    color: withAlpha("#FFFFFF", 0.5),
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
});
