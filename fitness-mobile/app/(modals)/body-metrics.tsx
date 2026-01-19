// app/(modals)/body-metrics.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/content/AuthContext";
import { updateProfile } from "@/services/profile";

import { useTheme } from "@/content/ThemeProvider";
import BodyMetricRow from "@/components/profile/premium/bodyMetrics/BodyMetricRow";
import MetricPickerSheet from "@/components/profile/premium/bodyMetrics/MetricPickerSheet";
import TrendMini from "@/components/profile/premium/bodyMetrics/TrendMini";

import {
  appendBodyMetricsHistory,
  loadBodyMetrics,
  loadBodyMetricsHistory,
  saveBodyMetrics,
  type BodyMetrics,
} from "@/services/profile/bodyMetrics";

function lbToKg(lb: number) {
  return lb * 0.45359237;
}
function kgToLb(kg: number) {
  return kg / 0.45359237;
}

function computeBMI(weightLb?: number, heightCm?: number) {
  if (!weightLb || !heightCm) return null;
  const kg = lbToKg(weightLb);
  const m = heightCm / 100;
  if (m <= 0) return null;
  return kg / (m * m);
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

type UnitMode = "lb" | "kg";

export default function BodyMetricsEditorScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [unitMode, setUnitMode] = useState<UnitMode>("lb"); // simple toggle, default lb

  const [original, setOriginal] = useState<BodyMetrics | null>(null);
  const [draft, setDraft] = useState<BodyMetrics>({
    weightLb: 216,
    targetWeightLb: 210,
    heightCm: 192,
    bodyFatPct: undefined,
    waistCm: undefined,
  });

  const [history, setHistory] = useState<
    { t: number; weightLb?: number; waistCm?: number; bodyFatPct?: number }[]
  >([]);

  const params = useLocalSearchParams<{
    unit?: "lb" | "kg";
    weightKg?: string;
    targetWeightKg?: string;
    heightCm?: string;
    bodyFatPct?: string;
    waistCm?: string;
  }>();
  useEffect(() => {
    // apply params once (when page opens from card)
    const unit = params.unit === "kg" ? "kg" : "lb";
    setUnitMode(unit);

    const wKg = Number(params.weightKg ?? NaN);
    const tKg = Number(params.targetWeightKg ?? NaN);
    const hCm = Number(params.heightCm ?? NaN);
    const bf = Number(params.bodyFatPct ?? NaN);
    const waist = Number(params.waistCm ?? NaN);

    setDraft((d) => ({
      ...d,
      weightLb: Number.isFinite(wKg) ? kgToLb(wKg) : d.weightLb,
      targetWeightLb: Number.isFinite(tKg) ? kgToLb(tKg) : d.targetWeightLb,
      heightCm: Number.isFinite(hCm) ? hCm : d.heightCm,
      bodyFatPct: Number.isFinite(bf) ? bf : d.bodyFatPct,
      waistCm: Number.isFinite(waist) ? waist : d.waistCm,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasParams =
    params.weightKg != null ||
    params.targetWeightKg != null ||
    params.heightCm != null ||
    params.bodyFatPct != null ||
    params.waistCm != null;

  // sheets
  const [sheet, setSheet] = useState<
    null | "weight" | "target" | "height" | "bodyfat" | "waist"
  >(null);

  const dirty = useMemo(() => {
    if (!original) return false;
    const keys: (keyof BodyMetrics)[] = [
      "weightLb",
      "targetWeightLb",
      "heightCm",
      "bodyFatPct",
      "waistCm",
    ];
    return keys.some((k) => (original[k] ?? null) !== (draft[k] ?? null));
  }, [original, draft]);

  const bmi = useMemo(
    () => computeBMI(draft.weightLb, draft.heightCm),
    [draft.weightLb, draft.heightCm]
  );

  const weightLabel = useMemo(() => {
    const w = draft.weightLb;
    if (!w) return "—";
    if (unitMode === "lb") return `${Math.round(w)} lb`;
    return `${round1(lbToKg(w))} kg`;
  }, [draft.weightLb, unitMode]);

  const targetLabel = useMemo(() => {
    const w = draft.targetWeightLb;
    if (!w) return "—";
    if (unitMode === "lb") return `${Math.round(w)} lb`;
    return `${round1(lbToKg(w))} kg`;
  }, [draft.targetWeightLb, unitMode]);

  const heightLabel = useMemo(() => {
    const h = draft.heightCm;
    if (!h) return "—";
    return `${Math.round(h)} cm`;
  }, [draft.heightCm]);

  const bodyFatLabel = useMemo(() => {
    const v = draft.bodyFatPct;
    if (v == null) return "—";
    return `${round1(v)}%`;
  }, [draft.bodyFatPct]);

  const waistLabel = useMemo(() => {
    const v = draft.waistCm;
    if (v == null) return "—";
    return `${round1(v)} cm`;
  }, [draft.waistCm]);

  const last30WeightPoints = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return history
      .filter((p) => p.t >= cutoff && typeof p.weightLb === "number")
      .map((p) => Math.round(p.weightLb as number));
  }, [history]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const m = await loadBodyMetrics();
        const h = await loadBodyMetricsHistory();
        if (!mounted) return;

        if (m && !hasParams) {
          setOriginal(m);
          setDraft({
            weightLb: m.weightLb,
            targetWeightLb: m.targetWeightLb,
            heightCm: m.heightCm,
            bodyFatPct: m.bodyFatPct,
            waistCm: m.waistCm,
          });
        } else {
          // first time: treat current draft as original so dirty=false initially
          setOriginal({
            weightLb: draft.weightLb,
            targetWeightLb: draft.targetWeightLb,
            heightCm: draft.heightCm,
            bodyFatPct: draft.bodyFatPct,
            waistCm: draft.waistCm,
          });
        }

        setHistory(h);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmBack = () => {
    if (!dirty) return router.back();
    Alert.alert("Discard changes?", "You have unsaved updates.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const onSave = async () => {
    if (!user?.uid) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // convert canonical lb storage to kg for profile fields
    const nextWeightKg =
      draft.weightLb != null ? round1(lbToKg(draft.weightLb)) : undefined;

    const nextTargetKg =
      draft.targetWeightLb != null
        ? round1(lbToKg(draft.targetWeightLb))
        : undefined;

    await updateProfile(user.uid, {
      weightKg: nextWeightKg, // number | undefined
      targetWeightKg: nextTargetKg, // number | undefined
      heightCm: draft.heightCm ?? undefined, // number | undefined
      bodyFatPct: draft.bodyFatPct ?? undefined,
      waistCm: draft.waistCm ?? undefined,
      weightUnit: unitMode, // optional but nice
    });

    // optional: if you still want history, keep it local
    await appendBodyMetricsHistory({
      t: Date.now(),
      weightLb: draft.weightLb,
      waistCm: draft.waistCm,
      bodyFatPct: draft.bodyFatPct,
    });

    router.back(); // close modal -> profile subscription should re-render
  };

  // picker arrays
  const weightValuesLb = useMemo(() => {
    // 80..400 lb
    const arr: number[] = [];
    for (let i = 80; i <= 400; i += 1) arr.push(i);
    return arr;
  }, []);

  const weightValuesKg = useMemo(() => {
    // 36..181 kg -> convert to lb canonical
    const arr: number[] = [];
    for (let kg = 36; kg <= 181; kg += 0.5) {
      arr.push(round1(kgToLb(kg)));
    }
    // de-dupe approximate rounding collisions
    return Array.from(new Set(arr.map((x) => Math.round(x * 10) / 10)));
  }, []);

  const heightValues = useMemo(() => {
    const arr: number[] = [];
    for (let cm = 120; cm <= 220; cm += 1) arr.push(cm);
    return arr;
  }, []);

  const bodyFatValues = useMemo(() => {
    const arr: number[] = [];
    for (let p = 4; p <= 60; p += 0.5) arr.push(round1(p));
    return arr;
  }, []);

  const waistValues = useMemo(() => {
    const arr: number[] = [];
    for (let cm = 50; cm <= 160; cm += 0.5) arr.push(round1(cm));
    return arr;
  }, []);

  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";

  return (
    <>
      <Stack.Screen
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />

      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: border }]}>
          <Pressable
            onPress={confirmBack}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: pressed
                  ? isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)"
                  : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.navTitle, { color: colors.text }]}>
              Body metrics
            </Text>
          </View>

          <Pressable
            disabled={!dirty}
            onPress={onSave}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                opacity: dirty ? 1 : 0.5,
                backgroundColor: pressed
                  ? isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.07)"
                  : isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.04)",
              },
            ]}
          >
            <Text style={[styles.saveText, { color: colors.text }]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 34 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Safe copy */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.h1, { color: colors.text }]}>
              Keep it simple.
            </Text>
            <Text style={[styles.sub, { color: colors.muted }]}>
              Measurements are optional. They’re used to personalize
              insights—never a judgment.
            </Text>
          </View>

          {/* BMI summary */}
          <View
            style={[
              styles.bmiCard,
              { backgroundColor: cardBg, borderColor: border },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <Text style={[styles.bmiLabel, { color: colors.muted }]}>
                BMI
              </Text>
              <Pressable
                onPress={async () => {
                  try {
                    await Haptics.selectionAsync();
                  } catch {}
                  setUnitMode((u) => (u === "lb" ? "kg" : "lb"));
                }}
                style={({ pressed }) => [
                  styles.unitPill,
                  {
                    backgroundColor: pressed
                      ? isDark
                        ? "rgba(255,255,255,0.10)"
                        : "rgba(0,0,0,0.06)"
                      : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.03)",
                    borderColor: border,
                  },
                ]}
              >
                <Text style={[styles.unitText, { color: colors.text }]}>
                  {unitMode === "lb" ? "lb" : "kg"}
                </Text>
                <Text style={[styles.unitTextMuted, { color: colors.muted }]}>
                  toggle
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.bmiValue, { color: colors.text }]}>
              {bmi == null ? "—" : round1(bmi).toFixed(1)}
            </Text>
            <Text style={[styles.bmiHint, { color: colors.muted }]}>
              {bmi == null
                ? "BMI needs height + weight."
                : "Not a health verdict."}
            </Text>
          </View>

          {/* Editor group */}
          <View
            style={[
              styles.group,
              { borderColor: border, backgroundColor: cardBg },
            ]}
          >
            <Text style={[styles.groupTitle, { color: colors.text }]}>
              Body metrics
            </Text>

            <BodyMetricRow
              label="Weight"
              value={weightLabel}
              hint="Tap to adjust • no typing"
              onPress={() => setSheet("weight")}
            />
            <BodyMetricRow
              label="Target"
              value={targetLabel}
              hint="Used for gentle progress views"
              onPress={() => setSheet("target")}
            />
            <BodyMetricRow
              label="Height"
              value={heightLabel}
              hint="Needed for BMI"
              onPress={() => setSheet("height")}
            />
            <BodyMetricRow
              label="Body fat"
              value={bodyFatLabel}
              hint="Optional • you can leave this blank"
              onPress={() => setSheet("bodyfat")}
            />
            <BodyMetricRow
              label="Waist"
              value={waistLabel}
              hint="Optional • useful for recomposition"
              onPress={() => setSheet("waist")}
            />

            <View style={styles.safeFooter}>
              <Text style={[styles.safeText, { color: colors.muted }]}>
                Measurements are optional. This app doesn’t punish you for
                missing data.
              </Text>
            </View>
          </View>

          {/* Trend (optional) */}
          <View style={{ marginTop: 14 }}>
            <TrendMini
              title="Weight trend (30 days)"
              points={last30WeightPoints}
              format={(v) =>
                unitMode === "lb" ? `${v} lb` : `${round1(lbToKg(v))} kg`
              }
              emptyLabel="No trend yet. Add a couple check-ins and it’ll appear here."
            />
          </View>

          {/* Edge-state helper */}
          <View style={{ marginTop: 14 }}>
            <View
              style={[
                styles.noteCard,
                { borderColor: border, backgroundColor: cardBg },
              ]}
            >
              <Ionicons name="heart-outline" size={18} color={colors.muted} />
              <Text style={[styles.noteText, { color: colors.muted }]}>
                You can clear any metric anytime. If you’re not tracking
                something right now, leaving it blank is perfect.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sheets */}
        <MetricPickerSheet
          open={sheet === "weight"}
          title="Weight"
          subtitle="Quick adjust—no keyboard."
          unitLabel={unitMode === "lb" ? "lb" : "kg"}
          values={unitMode === "lb" ? weightValuesLb : weightValuesKg}
          value={
            draft.weightLb == null
              ? null
              : unitMode === "lb"
              ? Math.round(draft.weightLb)
              : round1(draft.weightLb)
          }
          formatValue={(v) =>
            unitMode === "lb" ? `${Math.round(v)}` : `${round1(lbToKg(v))}`
          }
          allowNull
          nullLabel="Not set"
          step={unitMode === "lb" ? 1 : 0.5}
          min={unitMode === "lb" ? 80 : round1(kgToLb(36))}
          max={unitMode === "lb" ? 400 : round1(kgToLb(181))}
          onChange={(v) => {
            if (v == null)
              return setDraft((d) => ({ ...d, weightLb: undefined }));
            // v is canonical lb
            setDraft((d) => ({ ...d, weightLb: unitMode === "lb" ? v : v }));
          }}
          onClose={() => setSheet(null)}
        />

        <MetricPickerSheet
          open={sheet === "target"}
          title="Target weight"
          subtitle="Optional. Set a gentle direction."
          unitLabel={unitMode === "lb" ? "lb" : "kg"}
          values={unitMode === "lb" ? weightValuesLb : weightValuesKg}
          value={
            draft.targetWeightLb == null
              ? null
              : unitMode === "lb"
              ? Math.round(draft.targetWeightLb)
              : round1(draft.targetWeightLb)
          }
          formatValue={(v) =>
            unitMode === "lb" ? `${Math.round(v)}` : `${round1(lbToKg(v))}`
          }
          allowNull
          nullLabel="Not set"
          step={unitMode === "lb" ? 1 : 0.5}
          onChange={(v) => {
            if (v == null)
              return setDraft((d) => ({ ...d, targetWeightLb: undefined }));
            setDraft((d) => ({ ...d, targetWeightLb: v }));
          }}
          onClose={() => setSheet(null)}
        />

        <MetricPickerSheet
          open={sheet === "height"}
          title="Height"
          subtitle="Used to calculate BMI."
          unitLabel="cm"
          values={heightValues}
          value={draft.heightCm == null ? null : Math.round(draft.heightCm)}
          formatValue={(v) => `${v}`}
          allowNull
          nullLabel="Not set"
          step={1}
          min={120}
          max={220}
          onChange={(v) => {
            if (v == null)
              return setDraft((d) => ({ ...d, heightCm: undefined }));
            setDraft((d) => ({ ...d, heightCm: v }));
          }}
          onClose={() => setSheet(null)}
        />

        <MetricPickerSheet
          open={sheet === "bodyfat"}
          title="Body fat"
          subtitle="Optional. Estimates are totally fine."
          unitLabel="%"
          values={bodyFatValues}
          value={draft.bodyFatPct == null ? null : round1(draft.bodyFatPct)}
          formatValue={(v) => `${round1(v)}`}
          allowNull
          nullLabel="Not set"
          step={0.5}
          min={4}
          max={60}
          onChange={(v) => {
            if (v == null)
              return setDraft((d) => ({ ...d, bodyFatPct: undefined }));
            setDraft((d) => ({ ...d, bodyFatPct: v }));
          }}
          onClose={() => setSheet(null)}
        />

        <MetricPickerSheet
          open={sheet === "waist"}
          title="Waist"
          subtitle="Optional. Useful for recomposition."
          unitLabel="cm"
          values={waistValues}
          value={draft.waistCm == null ? null : round1(draft.waistCm)}
          formatValue={(v) => `${round1(v)}`}
          allowNull
          nullLabel="Not set"
          step={0.5}
          min={50}
          max={160}
          onChange={(v) => {
            if (v == null)
              return setDraft((d) => ({ ...d, waistCm: undefined }));
            setDraft((d) => ({ ...d, waistCm: v }));
          }}
          onClose={() => setSheet(null)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingTop: Platform.OS === "ios" ? 16 : 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontSize: 16, fontWeight: "800" },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  saveText: { fontSize: 14, fontWeight: "900" },

  h1: { fontSize: 28, fontWeight: "900", letterSpacing: -0.4 },
  sub: { fontSize: 13, lineHeight: 18, marginTop: 6 },

  bmiCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginTop: 10,
  },
  bmiLabel: { fontSize: 13, fontWeight: "800" },
  bmiValue: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 6,
  },
  bmiHint: { fontSize: 12, marginTop: 6 },

  unitPill: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  unitText: { fontSize: 13, fontWeight: "900" },
  unitTextMuted: { fontSize: 12, fontWeight: "700" },

  group: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
    marginTop: 14,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
    paddingHorizontal: 6,
  },

  safeFooter: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 2 },
  safeText: { fontSize: 12, lineHeight: 16 },

  noteCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 16 },
});
