// app/(modals)/add-meal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MotiView } from "moti";
import { getAuth } from "firebase/auth";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";

import {
  fetchMyRecentFoods,
  type RecentFood,
} from "@/services/nutritionRecents";
import { searchCatalog } from "@/services/foodCatalog"; // your existing export

// ✅ Scan dependencies
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from "expo-camera";

type MealKey = "breakfast" | "lunch" | "dinner" | "snacks";

type AddPayload = {
  date: string;
  meal: MealKey;
  name: string;
  unit: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  source: "catalog" | "manual" | "recent" | "popular" | "describe" | "barcode";
};

type DraftItem = {
  name: string;
  unit: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  source: AddPayload["source"];
};

function withAlpha(color: string, alpha = 0.2) {
  if (!color) return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("rgb")) {
    const body = color.replace(/^rgba?\(|\)$/g, "");
    const [r, g, b] = body.split(",").map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const m = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return color;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(
    m[3],
    16
  )}, ${alpha})`;
}

const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.16,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
};

function toNum(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function TopBar({
  title,
  subtitle,
  onClose,
  colors,
  isDark,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  colors: any;
  isDark: boolean;
}) {
  const inner = (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 3 }}>
          <Text
            style={{ color: colors.muted, fontWeight: "900", fontSize: 12 }}
          >
            {subtitle}
          </Text>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>
            {title}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: withAlpha(colors.card, 0.55),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          overflow: "hidden",
        }}
      >
        <BlurView
          intensity={22}
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
        >
          <LinearGradient
            colors={[
              withAlpha(colors.primary, 0.22),
              withAlpha(colors.card, 0.2),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", inset: 0 }}
          />
          {inner}
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}
    >
      {inner}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? withAlpha(colors.primary, 0.35) : colors.border,
        backgroundColor: active
          ? withAlpha(colors.primary, 0.14)
          : withAlpha(colors.card, 0.35),
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontWeight: active ? "900" : "800",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  colors,
  placeholder,
  flex,
  multiline,
  minHeight,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  keyboardType?: any;
  colors: any;
  placeholder?: string;
  flex?: number;
  multiline?: boolean;
  minHeight?: number;
}) {
  return (
    <View style={{ flex: flex ?? 1, gap: 6 }}>
      <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
        style={{
          height: multiline ? undefined : 46,
          minHeight: multiline ? minHeight ?? 100 : undefined,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          backgroundColor: colors.inputBg,
          color: colors.text,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 12 : 0,
          fontWeight: "900",
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function clamp0(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

/* ───────────── Barcode resolvers + cache (ported from old file) ───────────── */
type SourceTag = "OFF" | "FDC";
type ResolvedProduct = {
  name: string;
  brand?: string | null;
  unit: string; // "serving" | "100 g" | "100 ml"
  per: number; // 1 or 100
  nutrients: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sugar?: number;
    fiber?: number;
  };
  fdcId?: string | null;
  source?: SourceTag;
};

type FdcItem = {
  fdcId: string;
  description: string;
  brandOwner?: string;
  labelNutrients?: {
    calories?: { value: number };
    protein?: { value: number };
    carbohydrates?: { value: number };
    fat?: { value: number };
    fiber?: { value: number };
    sugars?: { value: number };
  };
};

const FDC_API_KEY = process.env.EXPO_PUBLIC_FDC_API_KEY as string;

async function searchFDC(queryStr: string): Promise<FdcItem[]> {
  if (!FDC_API_KEY || !queryStr.trim()) return [];
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(
      FDC_API_KEY
    )}&query=${encodeURIComponent(queryStr)}&dataType=Branded&pageSize=10`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    return (j?.foods || []) as FdcItem[];
  } catch {
    return [];
  }
}

async function lookupOpenFoodFacts(
  barcode: string
): Promise<ResolvedProduct | null> {
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
        barcode
      )}.json`
    );
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.status !== 1) return null;

    const p = j.product || {};
    const nutr = p.nutriments || {};

    const hasServing =
      nutr["energy-kcal_serving"] ||
      nutr["proteins_serving"] ||
      nutr["carbohydrates_serving"] ||
      nutr["fat_serving"] ||
      nutr["sugars_serving"] ||
      nutr["fiber_serving"];

    if (hasServing) {
      return {
        name: String(p.product_name || p.generic_name || "Food"),
        brand: p.brands || null,
        unit: "serving",
        per: 1,
        nutrients: {
          calories:
            nutr["energy-kcal_serving"] ??
            (nutr["energy_serving"]
              ? nutr["energy_serving"] / 4.184
              : undefined),
          protein: nutr["proteins_serving"],
          carbs: nutr["carbohydrates_serving"],
          fat: nutr["fat_serving"],
          sugar: nutr["sugars_serving"],
          fiber: nutr["fiber_serving"],
        },
        fdcId: null,
        source: "OFF",
      };
    }

    const baseIsMl = (p.quantity || "").toLowerCase().includes("ml");
    return {
      name: String(p.product_name || p.generic_name || "Food"),
      brand: p.brands || null,
      unit: baseIsMl ? "100 ml" : "100 g",
      per: 100,
      nutrients: {
        calories:
          nutr["energy-kcal_100g"] ??
          (nutr["energy_100g"] ? nutr["energy_100g"] / 4.184 : undefined),
        protein: nutr["proteins_100g"],
        carbs: nutr["carbohydrates_100g"],
        fat: nutr["fat_100g"],
        sugar: nutr["sugars_100g"],
        fiber: nutr["fiber_100g"],
      },
      fdcId: null,
      source: "OFF",
    };
  } catch {
    return null;
  }
}

async function lookupFDCByBarcode(
  barcode: string
): Promise<ResolvedProduct | null> {
  const items = await searchFDC(barcode);
  if (!items?.length) return null;
  const x = items[0];
  const ln = x.labelNutrients || {};
  return {
    name: x.description || "Food",
    brand: x.brandOwner || null,
    unit: "serving",
    per: 1,
    nutrients: {
      calories: ln.calories?.value,
      protein: ln.protein?.value,
      carbs: ln.carbohydrates?.value,
      fat: ln.fat?.value,
      sugar: ln.sugars?.value,
      fiber: ln.fiber?.value,
    },
    fdcId: String(x.fdcId),
    source: "FDC",
  };
}

const CACHE_KEY = "@barcode_cache_v1";

function variantsFor(barcode: string): string[] {
  const b = barcode.trim();
  const xs = new Set<string>([b]);
  if (b.length === 12 && b.startsWith("0")) xs.add(b.slice(1));
  if (b.length === 11) xs.add("0" + b);
  if (b.length === 13 && b.startsWith("0")) xs.add(b.slice(1));
  if (b.length === 8 && !b.startsWith("0")) xs.add("0" + b);
  return Array.from(xs);
}

async function getCache(): Promise<Record<string, ResolvedProduct>> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
async function setCache(map: Record<string, ResolvedProduct>) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {}
}
async function cacheSave(barcode: string, item: ResolvedProduct) {
  const map = await getCache();
  map[barcode] = item;
  await setCache(map);
}
async function cacheLoad(barcode: string): Promise<ResolvedProduct | null> {
  const map = await getCache();
  return map[barcode] ?? null;
}

function scoreCandidate(r: ResolvedProduct): number {
  const filled = [
    "calories",
    "protein",
    "carbs",
    "fat",
    "sugar",
    "fiber",
  ].reduce((s, k) => s + (Number.isFinite((r.nutrients as any)[k]) ? 1 : 0), 0);
  const servingBonus = r.per === 1 ? 3 : 0;
  const srcBonus = r.source === "OFF" ? 1 : 0;
  return filled + servingBonus + srcBonus;
}

async function resolveBarcodeCandidates(
  barcode: string
): Promise<ResolvedProduct[]> {
  const cached = await cacheLoad(barcode);
  if (cached) return [cached];

  const tries = variantsFor(barcode);
  const seen: ResolvedProduct[] = [];

  for (const b of tries) {
    const off = await lookupOpenFoodFacts(b);
    if (off) seen.push(off);
    const fdc = await lookupFDCByBarcode(b);
    if (fdc) seen.push(fdc);
  }

  const key = (x: ResolvedProduct) =>
    [x.name, x.brand || "", x.unit, x.per, x.source || ""]
      .join("|")
      .toLowerCase();
  const uniq = Array.from(new Map(seen.map((v) => [key(v), v])).values());
  return uniq.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
}

/* ───────────── Small UI helpers (scan tab) ───────────── */
function Pill({
  icon,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: any;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.9),
        backgroundColor: withAlpha(colors.card, 0.32),
      }}
    >
      <Ionicons name={icon} size={16} color={colors.text} />
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 12 }}>
        {text}
      </Text>
    </View>
  );
}
function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractJsonFromText(text: string): any | null {
  // Try to locate a JSON object/array inside a string
  const s = text.trim();

  // direct parse
  const direct = safeJsonParse(s);
  if (direct) return direct;

  // try object substring
  const objStart = s.indexOf("{");
  const objEnd = s.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    const sub = s.slice(objStart, objEnd + 1);
    const parsed = safeJsonParse(sub);
    if (parsed) return parsed;
  }

  // try array substring
  const arrStart = s.indexOf("[");
  const arrEnd = s.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    const sub = s.slice(arrStart, arrEnd + 1);
    const parsed = safeJsonParse(sub);
    if (parsed) return parsed;
  }

  return null;
}

function unwrapDescribePayload(anyGot: any): any {
  if (!anyGot) return null;

  // If it’s an array, take first item
  if (Array.isArray(anyGot)) return anyGot[0] ?? null;

  // Common wrappers
  if (anyGot.data) return unwrapDescribePayload(anyGot.data);
  if (anyGot.result) return unwrapDescribePayload(anyGot.result);
  if (anyGot.item) return unwrapDescribePayload(anyGot.item);
  if (anyGot.meal) return unwrapDescribePayload(anyGot.meal);

  // OpenAI-style
  const content = anyGot?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    const parsed = extractJsonFromText(content);
    return parsed ?? { name: content };
  }

  // If backend returns a JSON string (ugh)
  if (typeof anyGot === "string") {
    const parsed = extractJsonFromText(anyGot);
    return parsed ?? { name: anyGot };
  }

  return anyGot;
}

function normalizeDescribeItem(gotRaw: any, fallbackName: string) {
  const got = unwrapDescribePayload(gotRaw) || {};

  // support alternate field names
  const name = String(got.name ?? got.title ?? got.food ?? fallbackName).trim();
  const unit = String(got.unit ?? got.servingUnit ?? "serving").trim();

  const qty =
    Number(got.quantity ?? got.qty ?? got.servingQty ?? got.servings ?? 1) || 1;

  const calories = Number(got.calories ?? got.kcal ?? got.energy ?? 0) || 0;
  const protein = Number(got.protein ?? got.proteins ?? 0) || 0;
  const carbs = Number(got.carbs ?? got.carbohydrates ?? 0) || 0;
  const fat = Number(got.fat ?? got.fats ?? 0) || 0;

  const sugar =
    got.sugar != null
      ? Number(got.sugar)
      : got.sugars != null
      ? Number(got.sugars)
      : undefined;

  const fiber =
    got.fiber != null
      ? Number(got.fiber)
      : got.fibre != null
      ? Number(got.fibre)
      : undefined;

  return { name, unit, qty, calories, protein, carbs, fat, sugar, fiber };
}

export default function AddMealModal() {
  const { colors, isDark } = useTheme() as any;
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const [meal, setMeal] = useState<MealKey>(
    (params.meal as MealKey) || "breakfast"
  );
  const date = (params.date as string) || new Date().toISOString().slice(0, 10);

  const [tab, setTab] = useState<
    "recents" | "search" | "scan" | "describe" | "manual"
  >("recents");

  // My recents (Firestore)
  const [myRecents, setMyRecents] = useState<RecentFood[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(false);

  // Popular (community catalog)
  const [popular, setPopular] = useState<any[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);

  // search
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounce = useRef<any>(null);

  // manual
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  // describe
  const [descText, setDescText] = useState("");
  const [descLoading, setDescLoading] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);

  // ✅ Confirm sheet state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDraft, setConfirmDraft] = useState<DraftItem | null>(null);
  const [confirmEdits, setConfirmEdits] = useState({
    name: "",
    qty: "1",
    unit: "serving",
    calories: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
    sugar: "",
    fiber: "",
  });

  // ✅ Scan tab state
  const [permission, requestPermission] = useCameraPermissions();
  const [scanBusy, setScanBusy] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  // Candidate picker for multiple matches (scan)
  const [pickOpen, setPickOpen] = useState(false);
  const [candidates, setCandidates] = useState<ResolvedProduct[]>([]);
  const [candidatePending, setCandidatePending] = useState(false);

  // Ask for permission when entering scan tab
  useEffect(() => {
    if (tab !== "scan") return;
    if (!permission) return;
    if (!permission.granted) {
      requestPermission().catch(() => {});
    }
  }, [tab, permission, requestPermission]);

  function done(payload: AddPayload) {
    AsyncStorage.setItem("@pending_add_meal", JSON.stringify(payload))
      .catch(() => {})
      .finally(() => router.back());
  }

  function openConfirm(item: DraftItem) {
    setConfirmDraft(item);
    setConfirmEdits({
      name: item.name ?? "",
      qty: String(item.qty ?? 1),
      unit: item.unit ?? "serving",
      calories: String(item.calories ?? 0),
      protein: String(item.protein ?? 0),
      carbs: String(item.carbs ?? 0),
      fat: String(item.fat ?? 0),
      sugar: item.sugar != null ? String(item.sugar) : "",
      fiber: item.fiber != null ? String(item.fiber) : "",
    });
    requestAnimationFrame(() => setConfirmOpen(true));
  }

  function closeConfirm() {
    Keyboard.dismiss();
    setConfirmOpen(false);
    setConfirmDraft(null);
  }

  function confirmAndAdd() {
    if (!confirmDraft) return;

    const payload: AddPayload = {
      date,
      meal,
      name: (confirmEdits.name || confirmDraft.name || "Food").trim(),
      unit: (confirmEdits.unit || confirmDraft.unit || "serving").trim(),
      qty: clamp0(toNum(confirmEdits.qty)) || 1,
      calories: clamp0(toNum(confirmEdits.calories)),
      protein: clamp0(toNum(confirmEdits.protein)),
      carbs: clamp0(toNum(confirmEdits.carbs)),
      fat: clamp0(toNum(confirmEdits.fat)),
      sugar:
        confirmEdits.sugar.trim().length > 0
          ? clamp0(toNum(confirmEdits.sugar))
          : confirmDraft.sugar,
      fiber:
        confirmEdits.fiber.trim().length > 0
          ? clamp0(toNum(confirmEdits.fiber))
          : confirmDraft.fiber,
      source: confirmDraft.source,
    };

    // ✅ optional: if this confirm came from barcode scan, remember any edits
    if (confirmDraft.source === "barcode" && scannedBarcode) {
      cacheSave(scannedBarcode, {
        name: payload.name,
        unit: payload.unit,
        per: payload.qty,
        nutrients: {
          calories: payload.calories,
          protein: payload.protein,
          carbs: payload.carbs,
          fat: payload.fat,
          sugar: payload.sugar,
          fiber: payload.fiber,
        },
        fdcId: null,
        source: "OFF",
      }).catch(() => {});
    }

    closeConfirm();
    done(payload);
  }

  // This used to immediately add. Now it decides:
  // - recents => immediate add
  // - everything else => open confirm sheet
  function pick(item: any, source: AddPayload["source"]) {
    const draft: DraftItem = {
      name: String(item.name || item.title || "Food").trim(),
      unit: String(item.unit || "serving"),
      qty: Number(item.qty || item.per || 1),
      calories: Number(item.calories ?? item?.nutrients?.calories ?? 0),
      protein: Number(item.protein ?? item?.nutrients?.protein ?? 0),
      carbs: Number(item.carbs ?? item?.nutrients?.carbs ?? 0),
      fat: Number(item.fat ?? item?.nutrients?.fat ?? 0),
      sugar:
        item.sugar != null
          ? Number(item.sugar)
          : item?.nutrients?.sugar != null
          ? Number(item.nutrients.sugar)
          : undefined,
      fiber:
        item.fiber != null
          ? Number(item.fiber)
          : item?.nutrients?.fiber != null
          ? Number(item.nutrients.fiber)
          : undefined,
      source,
    };

    if (source === "recent") {
      // ✅ 1-tap add for recents
      done({
        date,
        meal,
        ...draft,
        qty: clamp0(draft.qty) || 1,
        calories: clamp0(draft.calories),
        protein: clamp0(draft.protein),
        carbs: clamp0(draft.carbs),
        fat: clamp0(draft.fat),
      });
      return;
    }

    openConfirm(draft);
  }

  // ✅ Scan handlers (wired to new confirm flow)
  async function startEditFromBarcodeResolved(r: ResolvedProduct) {
    const draft: DraftItem = {
      name: String(r.name || "Food").trim(),
      unit: String(r.unit || "serving"),
      qty: Number(r.per || 1),
      calories: Number(r.nutrients.calories || 0),
      protein: Number(r.nutrients.protein || 0),
      carbs: Number(r.nutrients.carbs || 0),
      fat: Number(r.nutrients.fat || 0),
      sugar: r.nutrients.sugar != null ? Number(r.nutrients.sugar) : undefined,
      fiber: r.nutrients.fiber != null ? Number(r.nutrients.fiber) : undefined,
      source: "barcode",
    };
    // Open confirm sheet (premium “review & confirm”)
    openConfirm(draft);
  }

  async function onBarcodeScanned(res: BarcodeScanningResult) {
    if (scanBusy) return;
    const code = res?.data?.trim();
    if (!code) return;
    if (code === lastCode) return;

    setScanBusy(true);
    setLastCode(code);
    setScannedBarcode(code);
    setScanError(null);

    try {
      const list = await resolveBarcodeCandidates(code);
      if (!list.length) {
        setScanError("No nutrition match found for this barcode.");
        return;
      }
      if (list.length === 1) {
        await startEditFromBarcodeResolved(list[0]);
      } else {
        setCandidates(list);
        setPickOpen(true);
      }
    } catch {
      setScanError("Scan lookup failed. Please try again.");
    } finally {
      setScanBusy(false);
    }
  }

  async function onManualBarcodeLookup() {
    const code = manualBarcode.trim();
    if (!code) {
      setScanError("Enter the digits under the barcode first.");
      return;
    }
    if (scanBusy) return;

    setScanBusy(true);
    setScanError(null);
    setScannedBarcode(code);
    setLastCode(null);

    try {
      const list = await resolveBarcodeCandidates(code);
      if (!list.length) {
        setScanError(
          "We couldn’t find this barcode. Double-check the digits, or add it manually."
        );
        return;
      }
      if (list.length === 1) {
        await startEditFromBarcodeResolved(list[0]);
        setManualBarcode("");
      } else {
        setCandidates(list);
        setPickOpen(true);
      }
    } catch {
      setScanError(
        "Barcode lookup failed. Check your connection and try again."
      );
    } finally {
      setScanBusy(false);
    }
  }

  useEffect(() => {
    if (!user?.uid) return;
    setRecentsLoading(true);
    fetchMyRecentFoods(user.uid, 18)
      .then(setMyRecents)
      .finally(() => setRecentsLoading(false));
  }, [user?.uid]);

  useEffect(() => {
    let alive = true;
    setPopularLoading(true);

    (async () => {
      try {
        // optional: if your service exports a popular function, use it
        // @ts-ignore
        const fc = require("@/services/foodCatalog");
        const getPopular = fc.getPopularCatalog || fc.getPopular;
        let res: any;

        if (typeof getPopular === "function") {
          res = await getPopular(10);
        } else {
          res = await searchCatalog("", 10);
        }

        const items = Array.isArray(res)
          ? res
          : res?.items || res?.top || res?.results || res?.data || [];
        if (alive) setPopular(items || []);
      } catch {
        if (alive) setPopular([]);
      } finally {
        if (alive) setPopularLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== "search") return;
    if (debounce.current) clearTimeout(debounce.current);

    debounce.current = setTimeout(async () => {
      const qq = q.trim();
      if (!qq) {
        setResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const res: any = await searchCatalog(qq, 20);
        const items = Array.isArray(res)
          ? res
          : res?.items || res?.top || res?.results || res?.data || [];
        setResults(items || []);
      } catch {
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 260);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, tab]);

  const quickTiles = useMemo(
    () => [
      {
        name: "Protein shake",
        unit: "serving",
        qty: 1,
        calories: 220,
        protein: 42,
        carbs: 6,
        fat: 4,
      },
      {
        name: "Greek yogurt",
        unit: "serving",
        qty: 1,
        calories: 150,
        protein: 17,
        carbs: 10,
        fat: 4,
      },
      {
        name: "Chicken breast",
        unit: "serving",
        qty: 1,
        calories: 180,
        protein: 35,
        carbs: 0,
        fat: 4,
      },
      {
        name: "Eggs",
        unit: "2 eggs",
        qty: 1,
        calories: 140,
        protein: 12,
        carbs: 1,
        fat: 10,
      },
      {
        name: "Banana",
        unit: "1 medium",
        qty: 1,
        calories: 105,
        protein: 1,
        carbs: 27,
        fat: 0,
      },
      {
        name: "Rice",
        unit: "1 cup",
        qty: 1,
        calories: 205,
        protein: 4,
        carbs: 45,
        fat: 0,
      },
    ],
    []
  );

  function commitManual() {
    if (!name.trim()) return;
    pick(
      {
        name: name.trim(),
        unit: unit || "serving",
        qty: toNum(qty) || 1,
        calories: toNum(calories),
        protein: toNum(protein),
        carbs: toNum(carbs),
        fat: toNum(fat),
      },
      "manual"
    );
  }

  const AI_URL =
    process.env.EXPO_PUBLIC_AI_DESCRIBE_URL ||
    "https://us-central1-fitness-tracker-25254.cloudfunctions.net/describe";

  async function calculateFromDescription() {
    const text = descText.trim();
    if (!text) return;

    setDescLoading(true);
    setDescError(null);

    try {
      const token = await getAuth().currentUser?.getIdToken(true);

      // Try your current mode first
      const payload = {
        mode: "meal:v2",
        query: text,
        rawText: text,
        context: { meal, date },
      };

      const res = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setDescError("Please sign in to use Describe.");
        return;
      }

      const raw = await res.text(); // ✅ never throws
      if (!res.ok) {
        // Show status + a tiny snippet to help debug quickly
        const snippet = raw?.trim()?.slice(0, 160);
        setDescError(
          `Describe failed (${res.status}). ${
            snippet ? `Server says: ${snippet}` : "No response body."
          }`
        );
        return;
      }

      // Try parse raw JSON; if not JSON, attempt extraction
      const parsed = safeJsonParse(raw) ?? extractJsonFromText(raw);
      if (!parsed) {
        const snippet = raw?.trim()?.slice(0, 160);
        setDescError(
          `Describe returned non-JSON. ${
            snippet ? `Response: ${snippet}` : "Empty response."
          }`
        );
        return;
      }

      const item = normalizeDescribeItem(parsed, text);

      // If the model gave basically nothing, call it out
      const hasAnyMacros =
        Number.isFinite(item.calories) ||
        Number.isFinite(item.protein) ||
        Number.isFinite(item.carbs) ||
        Number.isFinite(item.fat);

      if (!hasAnyMacros) {
        setDescError(
          "Describe returned an unexpected format (no macros found)."
        );
        return;
      }

      requestAnimationFrame(() => pick(item, "describe"));
    } catch (e: any) {
      setDescError(
        e?.message || "Describe service unavailable. Please try again."
      );
    } finally {
      setDescLoading(false);
    }
  }

  const scanTypes = useMemo(
    () =>
      [
        "ean13",
        "ean8",
        "upc_a",
        "upc_e",
        "code128",
        "code39",
        "qr",
      ] as BarcodeType[],
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title="Add food"
        subtitle={`${meal.toUpperCase()} • ${date}`}
        onClose={() => router.back()}
        colors={colors}
        isDark={isDark}
      />

      {/* Meal picker */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}>
          Logging for
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
          }}
        >
          {(
            [
              ["breakfast", "🍳"],
              ["lunch", "🥗"],
              ["dinner", "🍽️"],
              ["snacks", "🍌"],
            ] as [MealKey, string][]
          ).map(([key, emoji]) => {
            const active = meal === key;
            return (
              <Pressable
                key={key}
                onPress={() => setMeal(key)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active
                    ? withAlpha(colors.primary, 0.65)
                    : colors.border,
                  backgroundColor: active
                    ? withAlpha(colors.primary, 0.16)
                    : withAlpha(colors.card, 0.7),
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ fontSize: 14 }}>{emoji}</Text>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    textTransform: "capitalize",
                  }}
                >
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ✅ Confirm sheet */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={closeConfirm}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <Pressable
            onPress={closeConfirm}
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.35)", zIndex: 0, elevation: 0 },
            ]}
          />

          {/* Sheet */}
          <View
            style={{
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: withAlpha(colors.border, 0.95),
              backgroundColor: withAlpha(colors.card, 0.98),
              height: "78%",
              maxHeight: "90%",
              zIndex: 2,
              elevation: 20,
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
              style={{ flex: 1 }}
            >
              {Platform.OS === "ios" ? (
                <BlurView
                  intensity={28}
                  tint={
                    isDark
                      ? "systemThinMaterialDark"
                      : "systemThinMaterialLight"
                  }
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={[
                      withAlpha(colors.primary, 0.18),
                      withAlpha(colors.card, 0.24),
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: "absolute", inset: 0 }}
                  />

                  <ConfirmSheetContent
                    colors={colors}
                    isDark={isDark}
                    edits={confirmEdits}
                    setEdits={setConfirmEdits}
                    onCancel={closeConfirm}
                    onConfirm={confirmAndAdd}
                  />
                </BlurView>
              ) : (
                <ConfirmSheetContent
                  colors={colors}
                  isDark={isDark}
                  edits={confirmEdits}
                  setEdits={setConfirmEdits}
                  onCancel={closeConfirm}
                  onConfirm={confirmAndAdd}
                />
              )}
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* ✅ Candidate picker for scan matches */}
      <Modal
        visible={pickOpen}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setPickOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => setPickOpen(false)}
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.35)" },
            ]}
          />

          <View
            style={{
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: withAlpha(colors.border, 0.95),
              backgroundColor: withAlpha(colors.card, 0.98),
              maxHeight: "70%",
              zIndex: 2,
              elevation: 20,
            }}
          >
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={28}
                tint={
                  isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"
                }
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={[
                    withAlpha(colors.primary, 0.14),
                    withAlpha(colors.card, 0.22),
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: "absolute", inset: 0 }}
                />
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ gap: 2 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "900",
                          fontSize: 16,
                        }}
                      >
                        Select a match
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontWeight: "800",
                          fontSize: 12,
                        }}
                      >
                        Pick the closest label. You’ll confirm next.
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => setPickOpen(false)}
                      hitSlop={10}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: withAlpha(colors.card, 0.35),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="close" size={18} color={colors.text} />
                    </Pressable>
                  </View>

                  <View style={{ gap: 8 }}>
                    {candidates.map((c, i) => (
                      <Pressable
                        key={`${c.name}-${c.brand || ""}-${c.unit}-${i}`}
                        onPress={async () => {
                          setPickOpen(false);
                          await startEditFromBarcodeResolved(c);
                        }}
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: withAlpha(colors.card, 0.35),
                          padding: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text
                            style={{ color: colors.text, fontWeight: "900" }}
                            numberOfLines={1}
                          >
                            {c.name}
                            {c.brand ? ` • ${c.brand}` : ""}
                          </Text>
                          <Text
                            style={{
                              color: colors.muted,
                              fontWeight: "800",
                              fontSize: 12,
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            {c.source} • per {c.per} {c.unit}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.text}
                        />
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </BlurView>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
              >
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                  Select a match
                </Text>
                <View style={{ height: 10 }} />
                <View style={{ gap: 8 }}>
                  {candidates.map((c, i) => (
                    <Pressable
                      key={`${c.name}-${c.brand || ""}-${c.unit}-${i}`}
                      onPress={async () => {
                        setPickOpen(false);
                        await startEditFromBarcodeResolved(c);
                      }}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: withAlpha(colors.card, 0.35),
                        padding: 12,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: "900" }}>
                        {c.name}
                        {c.brand ? ` • ${c.brand}` : ""}
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontWeight: "800",
                          fontSize: 12,
                        }}
                      >
                        {c.source} • per {c.per} {c.unit}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <Chip
              label="Recents"
              active={tab === "recents"}
              onPress={() => setTab("recents")}
              colors={colors}
            />
            <Chip
              label="Search"
              active={tab === "search"}
              onPress={() => setTab("search")}
              colors={colors}
            />
            <Chip
              label="Scan"
              active={tab === "scan"}
              onPress={() => setTab("scan")}
              colors={colors}
            />
            <Chip
              label="Describe"
              active={tab === "describe"}
              onPress={() => setTab("describe")}
              colors={colors}
            />
            <Chip
              label="Manual"
              active={tab === "manual"}
              onPress={() => setTab("manual")}
              colors={colors}
            />
          </View>

          {/* SCAN (NEW, matches vibe) */}
          {tab === "scan" && (
            <View style={{ gap: 14 }}>
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 320 }}
              >
                <View
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: colors.border,
                    ...softShadow,
                  }}
                >
                  <LinearGradient
                    colors={[
                      withAlpha("#22c55e", isDark ? 0.12 : 0.16),
                      withAlpha(colors.primary, 0.12),
                      withAlpha(colors.card, 0.12),
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 14 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 10, flex: 1 }}>
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: withAlpha(colors.primary, 0.25),
                            backgroundColor: withAlpha(colors.primary, 0.12),
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name="barcode-outline"
                            size={18}
                            color={colors.text}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: "900",
                              fontSize: 16,
                            }}
                          >
                            Scan barcode
                          </Text>
                          <Text
                            style={{
                              color: colors.muted,
                              fontWeight: "800",
                              marginTop: 2,
                            }}
                          >
                            We’ll find a match — then you confirm macros.
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pill
                          icon="shield-checkmark-outline"
                          text="Private"
                          colors={colors}
                        />
                      </View>
                    </View>

                    {/* Permission / Camera */}
                    {!permission ? (
                      <View
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: withAlpha(colors.card, 0.35),
                          padding: 14,
                        }}
                      >
                        <Text
                          style={{ color: colors.muted, fontWeight: "800" }}
                        >
                          Checking camera permission…
                        </Text>
                      </View>
                    ) : !permission.granted ? (
                      <View style={{ gap: 10 }}>
                        <View
                          style={{
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: withAlpha(colors.card, 0.35),
                            padding: 14,
                          }}
                        >
                          <Text
                            style={{ color: colors.text, fontWeight: "900" }}
                          >
                            Camera access needed
                          </Text>
                          <Text
                            style={{
                              color: colors.muted,
                              fontWeight: "800",
                              marginTop: 4,
                            }}
                          >
                            Enable camera to scan barcodes. You can also type
                            the digits below.
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => requestPermission().catch(() => {})}
                          style={{
                            height: 52,
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: withAlpha(colors.primary, 0.35),
                            backgroundColor: withAlpha(colors.primary, 0.16),
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "row",
                            gap: 10,
                          }}
                        >
                          <Ionicons
                            name="camera-outline"
                            size={18}
                            color={colors.text}
                          />
                          <Text
                            style={{ color: colors.text, fontWeight: "900" }}
                          >
                            Grant camera access
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View
                        style={{
                          borderRadius: 18,
                          overflow: "hidden",
                          borderWidth: 1,
                          borderColor: withAlpha(colors.border, 0.95),
                          backgroundColor: withAlpha(colors.card, 0.35),
                        }}
                      >
                        <View style={{ aspectRatio: 3 / 4 }}>
                          <CameraView
                            style={{ width: "100%", height: "100%" }}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: scanTypes }}
                            onBarcodeScanned={onBarcodeScanned}
                          />

                          {/* Premium overlay */}
                          <View
                            pointerEvents="none"
                            style={{ position: "absolute", inset: 0 }}
                          >
                            {/* top hint bar */}
                            <View
                              style={{
                                position: "absolute",
                                left: 10,
                                right: 10,
                                top: 10,
                                borderRadius: 999,
                                overflow: "hidden",
                                borderWidth: 1,
                                borderColor: "#ffffff33",
                              }}
                            >
                              <LinearGradient
                                colors={["#00000066", "#00000033"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 10,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 8,
                                }}
                              >
                                <Ionicons
                                  name="scan-outline"
                                  size={16}
                                  color={"white"}
                                />
                                <Text
                                  style={{
                                    color: "white",
                                    fontWeight: "900",
                                    fontSize: 12,
                                  }}
                                >
                                  Hold steady • Avoid glare • Fill the frame
                                </Text>
                              </LinearGradient>
                            </View>

                            {/* scanning frame */}
                            <View
                              style={{
                                position: "absolute",
                                left: "10%",
                                right: "10%",
                                top: "30%",
                                bottom: "30%",
                                borderRadius: 16,
                                borderWidth: 2,
                                borderColor: "#ffffff88",
                                backgroundColor: "transparent",
                              }}
                            />

                            {/* corner accents */}
                            <View
                              style={{
                                position: "absolute",
                                left: "10%",
                                top: "30%",
                                width: 22,
                                height: 22,
                                borderLeftWidth: 3,
                                borderTopWidth: 3,
                                borderColor: "#ffffffcc",
                                borderTopLeftRadius: 14,
                              }}
                            />
                            <View
                              style={{
                                position: "absolute",
                                right: "10%",
                                top: "30%",
                                width: 22,
                                height: 22,
                                borderRightWidth: 3,
                                borderTopWidth: 3,
                                borderColor: "#ffffffcc",
                                borderTopRightRadius: 14,
                              }}
                            />
                            <View
                              style={{
                                position: "absolute",
                                left: "10%",
                                bottom: "30%",
                                width: 22,
                                height: 22,
                                borderLeftWidth: 3,
                                borderBottomWidth: 3,
                                borderColor: "#ffffffcc",
                                borderBottomLeftRadius: 14,
                              }}
                            />
                            <View
                              style={{
                                position: "absolute",
                                right: "10%",
                                bottom: "30%",
                                width: 22,
                                height: 22,
                                borderRightWidth: 3,
                                borderBottomWidth: 3,
                                borderColor: "#ffffffcc",
                                borderBottomRightRadius: 14,
                              }}
                            />

                            {/* busy pill */}
                            {scanBusy && (
                              <View
                                style={{
                                  position: "absolute",
                                  left: 12,
                                  right: 12,
                                  bottom: 12,
                                  borderRadius: 999,
                                  overflow: "hidden",
                                  borderWidth: 1,
                                  borderColor: "#ffffff33",
                                }}
                              >
                                <LinearGradient
                                  colors={["#00000066", "#00000033"]}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 0 }}
                                  style={{
                                    height: 44,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexDirection: "row",
                                    gap: 10,
                                  }}
                                >
                                  <ActivityIndicator color="#fff" />
                                  <Text
                                    style={{
                                      color: "white",
                                      fontWeight: "900",
                                      fontSize: 12,
                                    }}
                                  >
                                    Looking up nutrition…
                                  </Text>
                                </LinearGradient>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Error */}
                    {scanError ? (
                      <View
                        style={{
                          marginTop: 10,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: withAlpha("#EF4444", 0.35),
                          backgroundColor: withAlpha("#EF4444", 0.12),
                          padding: 12,
                        }}
                      >
                        <Text style={{ color: colors.text, fontWeight: "900" }}>
                          Couldn’t find a match
                        </Text>
                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "800",
                            marginTop: 4,
                            opacity: 0.9,
                          }}
                        >
                          {scanError}
                        </Text>
                      </View>
                    ) : null}

                    {/* Manual fallback digits */}
                    <View style={{ marginTop: 12, gap: 10 }}>
                      <Text
                        style={{
                          color: colors.muted,
                          fontWeight: "900",
                          fontSize: 12,
                          letterSpacing: 0.5,
                        }}
                      >
                        FALLBACK
                      </Text>

                      <View
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: withAlpha(colors.card, 0.32),
                          padding: 12,
                        }}
                      >
                        <Text
                          style={{ color: colors.muted, fontWeight: "800" }}
                        >
                          Having trouble scanning? Type the digits under the
                          barcode.
                        </Text>

                        <View style={{ height: 10 }} />

                        <TextInput
                          value={manualBarcode}
                          onChangeText={(t) =>
                            setManualBarcode(t.replace(/[^0-9]/g, ""))
                          }
                          keyboardType="numeric"
                          placeholder="e.g. 060383123456"
                          placeholderTextColor={colors.placeholder}
                          style={{
                            height: 46,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: colors.inputBorder,
                            backgroundColor: colors.inputBg,
                            color: colors.text,
                            paddingHorizontal: 12,
                            fontWeight: "900",
                          }}
                        />

                        <Pressable
                          onPress={onManualBarcodeLookup}
                          disabled={scanBusy || manualBarcode.trim().length < 8}
                          style={{
                            marginTop: 10,
                            height: 52,
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: withAlpha(colors.primary, 0.35),
                            backgroundColor: scanBusy
                              ? withAlpha(colors.card, 0.35)
                              : withAlpha(colors.primary, 0.16),
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "row",
                            gap: 10,
                            opacity:
                              scanBusy || manualBarcode.trim().length < 8
                                ? 0.6
                                : 1,
                          }}
                        >
                          {scanBusy ? (
                            <ActivityIndicator />
                          ) : (
                            <Ionicons
                              name="search-outline"
                              size={18}
                              color={colors.text}
                            />
                          )}
                          <Text
                            style={{ color: colors.text, fontWeight: "900" }}
                          >
                            {scanBusy ? "Looking up…" : "Look up barcode"}
                          </Text>
                        </Pressable>

                        <Text
                          style={{
                            color: colors.muted,
                            fontWeight: "800",
                            fontSize: 12,
                            marginTop: 8,
                          }}
                        >
                          Data sources: Open Food Facts (primary), USDA FDC
                          (fallback).
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              </MotiView>
            </View>
          )}

          {/* RECENTS */}
          {tab === "recents" && (
            <View style={{ gap: 14 }}>
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 320 }}
              >
                <View
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: colors.border,
                    ...softShadow,
                  }}
                >
                  <LinearGradient
                    colors={[
                      withAlpha(colors.primary, 0.2),
                      withAlpha(colors.card, 0.14),
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 14 }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "900",
                        fontSize: 16,
                      }}
                    >
                      Quick add
                    </Text>
                    <Text
                      style={{
                        color: colors.muted,
                        fontWeight: "800",
                        marginTop: 4,
                      }}
                    >
                      Tap once → confirm macros → add.
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 10,
                        marginTop: 12,
                      }}
                    >
                      {quickTiles.map((t) => (
                        <Pressable
                          key={t.name}
                          onPress={() => pick(t, "manual")}
                          style={{
                            width: "48%",
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: withAlpha(colors.border, 0.9),
                            backgroundColor: withAlpha(colors.card, 0.35),
                            padding: 12,
                          }}
                        >
                          <Text
                            style={{ color: colors.text, fontWeight: "900" }}
                            numberOfLines={1}
                          >
                            {t.name}
                          </Text>
                          <Text
                            style={{
                              color: colors.muted,
                              fontWeight: "800",
                              marginTop: 4,
                              fontSize: 12,
                            }}
                          >
                            {Math.round(t.calories)} kcal • P{" "}
                            {Math.round(t.protein)}g
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </LinearGradient>
                </View>
              </MotiView>

              <Text
                style={{
                  color: colors.muted,
                  fontWeight: "900",
                  fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                MY RECENTS (1-tap add)
              </Text>

              {recentsLoading ? (
                <View style={{ paddingVertical: 10 }}>
                  <ActivityIndicator />
                </View>
              ) : myRecents.length === 0 ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 14,
                    backgroundColor: withAlpha(colors.card, 0.35),
                  }}
                >
                  <Text style={{ color: colors.muted, fontWeight: "800" }}>
                    Your recent foods (from Firestore) show here after you log
                    some.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {myRecents.map((r, i) => (
                    <Pressable
                      key={`${r.name}-${i}`}
                      onPress={() => pick(r, "recent")}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: withAlpha(colors.card, 0.35),
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text
                          style={{ color: colors.text, fontWeight: "900" }}
                          numberOfLines={1}
                        >
                          {r.name}
                        </Text>
                        <Text
                          style={{
                            color: colors.muted,
                            fontWeight: "800",
                            fontSize: 12,
                          }}
                        >
                          {Math.round(r.qty)} {r.unit} •{" "}
                          {Math.round(r.calories)} kcal
                        </Text>
                      </View>
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color={colors.text}
                      />
                    </Pressable>
                  ))}
                </View>
              )}

              <Text
                style={{
                  color: colors.muted,
                  fontWeight: "900",
                  fontSize: 12,
                  letterSpacing: 0.6,
                  marginTop: 8,
                }}
              >
                POPULAR (confirm first)
              </Text>

              {popularLoading ? (
                <View style={{ paddingVertical: 10 }}>
                  <ActivityIndicator />
                </View>
              ) : popular.length === 0 ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 14,
                    backgroundColor: withAlpha(colors.card, 0.35),
                  }}
                >
                  <Text style={{ color: colors.muted, fontWeight: "800" }}>
                    No popular items yet.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {popular.slice(0, 10).map((p: any, idx: number) => (
                    <Pressable
                      key={`${p?.id || p?.name || "p"}-${idx}`}
                      onPress={() => pick(p, "popular")}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: withAlpha(colors.card, 0.35),
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text
                          style={{ color: colors.text, fontWeight: "900" }}
                          numberOfLines={1}
                        >
                          {String(p?.name || p?.title || "Food")}
                        </Text>
                        <Text
                          style={{
                            color: colors.muted,
                            fontWeight: "800",
                            fontSize: 12,
                          }}
                        >
                          {Math.round(
                            Number(p?.calories ?? p?.nutrients?.calories ?? 0)
                          )}{" "}
                          kcal • P{" "}
                          {Math.round(
                            Number(p?.protein ?? p?.nutrients?.protein ?? 0)
                          )}
                          g
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={colors.text}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* SEARCH */}
          {tab === "search" && (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: withAlpha(colors.card, 0.35),
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: withAlpha(colors.primary, 0.25),
                      backgroundColor: withAlpha(colors.primary, 0.12),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="search-outline"
                      size={18}
                      color={colors.text}
                    />
                  </View>

                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Search community foods"
                    placeholderTextColor={colors.placeholder}
                    style={{
                      flex: 1,
                      height: 44,
                      color: colors.text,
                      fontWeight: "900",
                    }}
                    returnKeyType="search"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />

                  {q.length > 0 ? (
                    <Pressable onPress={() => setQ("")} hitSlop={10}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.muted}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {searchLoading ? (
                <View style={{ paddingVertical: 10 }}>
                  <ActivityIndicator />
                </View>
              ) : q.trim().length === 0 ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 14,
                    backgroundColor: withAlpha(colors.card, 0.35),
                  }}
                >
                  <Text style={{ color: colors.muted, fontWeight: "800" }}>
                    Start typing. Example: “quest”, “chicken”, “rice”.
                  </Text>
                </View>
              ) : results.length === 0 ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 14,
                    backgroundColor: withAlpha(colors.card, 0.35),
                  }}
                >
                  <Text style={{ color: colors.muted, fontWeight: "800" }}>
                    No results. Try a simpler term.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {results.slice(0, 20).map((r: any, idx: number) => (
                    <Pressable
                      key={`${r?.id || r?.name || "r"}-${idx}`}
                      onPress={() => pick(r, "catalog")}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: withAlpha(colors.card, 0.35),
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text
                          style={{ color: colors.text, fontWeight: "900" }}
                          numberOfLines={1}
                        >
                          {String(r?.name || r?.title || "Food")}
                        </Text>
                        <Text
                          style={{
                            color: colors.muted,
                            fontWeight: "800",
                            fontSize: 12,
                          }}
                        >
                          {Math.round(
                            Number(r?.calories ?? r?.nutrients?.calories ?? 0)
                          )}{" "}
                          kcal • P{" "}
                          {Math.round(
                            Number(r?.protein ?? r?.nutrients?.protein ?? 0)
                          )}
                          g
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={colors.text}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* DESCRIBE */}
          {tab === "describe" && (
            <View style={{ gap: 14 }}>
              <View
                style={{
                  borderRadius: 22,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.border,
                  ...softShadow,
                }}
              >
                <LinearGradient
                  colors={[
                    withAlpha(colors.accent ?? colors.primary, 0.18),
                    withAlpha(colors.card, 0.12),
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 14 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: withAlpha(colors.primary, 0.25),
                        backgroundColor: withAlpha(colors.primary, 0.12),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="sparkles-outline"
                        size={18}
                        color={colors.text}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "900",
                          fontSize: 16,
                        }}
                      >
                        Describe your meal
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontWeight: "800",
                          marginTop: 2,
                        }}
                      >
                        We’ll estimate macros, then you confirm.
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 12, gap: 10 }}>
                    <Field
                      label="Description"
                      value={descText}
                      onChange={setDescText}
                      colors={colors}
                      placeholder="e.g. chicken burrito bowl with rice, beans, cheese, salsa"
                      multiline
                      minHeight={110}
                    />

                    {descError ? (
                      <Text
                        style={{
                          color: withAlpha("#EF4444", 0.95),
                          fontWeight: "800",
                        }}
                      >
                        {descError}
                      </Text>
                    ) : null}

                    <Pressable
                      onPress={calculateFromDescription}
                      disabled={descLoading || !descText.trim()}
                      style={{
                        marginTop: 2,
                        height: 52,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: withAlpha(colors.primary, 0.35),
                        backgroundColor: descLoading
                          ? withAlpha(colors.card, 0.35)
                          : withAlpha(colors.primary, 0.16),
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 10,
                        opacity: !descText.trim() ? 0.55 : 1,
                      }}
                    >
                      {descLoading ? (
                        <ActivityIndicator />
                      ) : (
                        <Ionicons
                          name="calculator-outline"
                          size={18}
                          color={colors.text}
                        />
                      )}
                      <Text style={{ color: colors.text, fontWeight: "900" }}>
                        {descLoading ? "Estimating…" : "Estimate macros"}
                      </Text>
                    </Pressable>

                    <View
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: withAlpha(colors.border, 0.9),
                        backgroundColor: withAlpha(colors.card, 0.28),
                      }}
                    >
                      <Text
                        style={{
                          color: colors.muted,
                          fontWeight: "800",
                          fontSize: 12,
                        }}
                      >
                        Tip: include quantities (e.g. “2 eggs”, “1 cup rice”).
                        You’ll edit before confirming.
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}

          {/* MANUAL */}
          {tab === "manual" && (
            <View style={{ gap: 14 }}>
              <View
                style={{
                  borderRadius: 22,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.border,
                  ...softShadow,
                }}
              >
                <LinearGradient
                  colors={[
                    withAlpha(colors.primary, 0.18),
                    withAlpha(colors.card, 0.12),
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 14 }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "900",
                      fontSize: 16,
                    }}
                  >
                    Manual entry
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontWeight: "800",
                      marginTop: 4,
                    }}
                  >
                    You’ll confirm before adding.
                  </Text>

                  <View style={{ marginTop: 12, gap: 10 }}>
                    <Field
                      label="Name"
                      value={name}
                      onChange={setName}
                      colors={colors}
                      placeholder="e.g. Chicken burrito bowl"
                      flex={1}
                    />

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Field
                        label="Qty"
                        value={qty}
                        onChange={(t) => setQty(t.replace(/[^0-9.]/g, ""))}
                        colors={colors}
                        keyboardType="decimal-pad"
                        placeholder="1"
                        flex={1}
                      />
                      <Field
                        label="Unit"
                        value={unit}
                        onChange={setUnit}
                        colors={colors}
                        placeholder="serving"
                        flex={1}
                      />
                    </View>

                    <Text
                      style={{
                        color: colors.muted,
                        fontWeight: "900",
                        fontSize: 12,
                        letterSpacing: 0.5,
                      }}
                    >
                      TOTAL MACROS
                    </Text>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Field
                        label="Calories"
                        value={calories}
                        onChange={(t) => setCalories(t.replace(/[^0-9.]/g, ""))}
                        colors={colors}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        flex={1}
                      />
                      <Field
                        label="Protein (g)"
                        value={protein}
                        onChange={(t) => setProtein(t.replace(/[^0-9.]/g, ""))}
                        colors={colors}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        flex={1}
                      />
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Field
                        label="Carbs (g)"
                        value={carbs}
                        onChange={(t) => setCarbs(t.replace(/[^0-9.]/g, ""))}
                        colors={colors}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        flex={1}
                      />
                      <Field
                        label="Fat (g)"
                        value={fat}
                        onChange={(t) => setFat(t.replace(/[^0-9.]/g, ""))}
                        colors={colors}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        flex={1}
                      />
                    </View>
                  </View>

                  <Pressable
                    onPress={commitManual}
                    style={{
                      marginTop: 14,
                      height: 52,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: withAlpha(colors.primary, 0.35),
                      backgroundColor: withAlpha(colors.primary, 0.16),
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <Ionicons name="chevron-up" size={18} color={colors.text} />
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                      Review & confirm
                    </Text>
                  </Pressable>
                </LinearGradient>
              </View>
            </View>
          )}
        </ScrollView>

        {(tab === "recents" || tab === "search") && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 16,
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                borderRadius: 999,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.35),
                backgroundColor:
                  Platform.OS === "ios"
                    ? withAlpha(colors.card, 0.45)
                    : withAlpha(colors.card, 0.9),
                ...softShadow,
              }}
            >
              <Pressable
                onPress={() => {
                  setTab("manual");
                  setName("");
                  setQty("1");
                  setUnit("serving");
                  setCalories("");
                  setProtein("");
                  setCarbs("");
                  setFat("");
                  Keyboard.dismiss();
                }}
                style={{
                  height: 54,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <Ionicons name="create-outline" size={18} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                  Manual entry
                </Text>
                <Text style={{ color: colors.muted, fontWeight: "800" }}>
                  • confirm before add
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function ConfirmSheetContent({
  colors,
  isDark,
  edits,
  setEdits,
  onCancel,
  onConfirm,
}: {
  colors: any;
  isDark: boolean;
  edits: any;
  setEdits: (fn: any) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const scrollRef = React.useRef<ScrollView>(null);

  // "Smart lift": keep the sheet fixed, but scroll the focused field into view.
  const scrollIntoView = React.useCallback((e: any) => {
    const target = e?.target;
    if (!target?.measureInWindow) return;

    target.measureInWindow((x: number, y: number, w: number, h: number) => {
      const desiredTopY = 160;
      const delta = y - desiredTopY;
      if (delta > 24) {
        scrollRef.current?.scrollTo({ y: delta, animated: true });
      }
    });
  }, []);

  const numOnly = (t: string) => t.replace(/[^0-9.]/g, "");

  const RowField = React.useCallback(
    ({
      label,
      value,
      keyName,
    }: {
      label: string;
      value: string;
      keyName: string;
    }) => (
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}>
          {label}
        </Text>
        <TextInput
          value={value}
          onFocus={scrollIntoView}
          onChangeText={(t) =>
            setEdits((p: any) => ({ ...p, [keyName]: numOnly(t) }))
          }
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          style={{
            height: 46,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            backgroundColor: colors.inputBg,
            color: colors.text,
            paddingHorizontal: 12,
            fontWeight: "900",
          }}
        />
      </View>
    ),
    [colors, setEdits, scrollIntoView]
  );

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 140, flexGrow: 1 }}
    >
      <View style={{ gap: 12 }}>
        {/* grabber */}
        <View style={{ alignItems: "center", marginTop: 2 }}>
          <View
            style={{
              width: 42,
              height: 5,
              borderRadius: 999,
              backgroundColor: withAlpha(colors.text, isDark ? 0.18 : 0.12),
            }}
          />
        </View>

        {/* header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
            >
              Confirm macros
            </Text>
            <Text
              style={{ color: colors.muted, fontWeight: "800", fontSize: 12 }}
            >
              Edit anything — then confirm.
            </Text>
          </View>

          <Pressable
            onPress={onCancel}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: withAlpha(colors.card, 0.35),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          {/* Name */}
          <View style={{ gap: 6 }}>
            <Text
              style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}
            >
              Name
            </Text>
            <TextInput
              value={edits.name}
              onFocus={scrollIntoView}
              onChangeText={(t) => setEdits((p: any) => ({ ...p, name: t }))}
              placeholder="Food name"
              placeholderTextColor={colors.placeholder}
              style={{
                height: 46,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                backgroundColor: colors.inputBg,
                color: colors.text,
                paddingHorizontal: 12,
                fontWeight: "900",
              }}
            />
          </View>

          {/* Qty + Unit */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}
              >
                Qty
              </Text>
              <TextInput
                value={edits.qty}
                onFocus={scrollIntoView}
                onChangeText={(t) =>
                  setEdits((p: any) => ({ ...p, qty: numOnly(t) }))
                }
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={colors.placeholder}
                style={{
                  height: 46,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  paddingHorizontal: 12,
                  fontWeight: "900",
                }}
              />
            </View>

            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}
              >
                Unit
              </Text>
              <TextInput
                value={edits.unit}
                onFocus={scrollIntoView}
                onChangeText={(t) => setEdits((p: any) => ({ ...p, unit: t }))}
                placeholder="serving"
                placeholderTextColor={colors.placeholder}
                style={{
                  height: 46,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  paddingHorizontal: 12,
                  fontWeight: "900",
                }}
              />
            </View>
          </View>

          <Text
            style={{
              color: colors.muted,
              fontWeight: "900",
              fontSize: 12,
              letterSpacing: 0.5,
              marginTop: 2,
            }}
          >
            MACROS
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <RowField
              label="Calories"
              value={edits.calories}
              keyName="calories"
            />
            <RowField
              label="Protein (g)"
              value={edits.protein}
              keyName="protein"
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <RowField label="Carbs (g)" value={edits.carbs} keyName="carbs" />
            <RowField label="Fat (g)" value={edits.fat} keyName="fat" />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}
              >
                Sugar (optional)
              </Text>
              <TextInput
                value={edits.sugar}
                onFocus={scrollIntoView}
                onChangeText={(t) =>
                  setEdits((p: any) => ({ ...p, sugar: numOnly(t) }))
                }
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.placeholder}
                style={{
                  height: 46,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  paddingHorizontal: 12,
                  fontWeight: "900",
                }}
              />
            </View>

            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{ color: colors.muted, fontWeight: "900", fontSize: 11 }}
              >
                Fiber (optional)
              </Text>
              <TextInput
                value={edits.fiber}
                onFocus={scrollIntoView}
                onChangeText={(t) =>
                  setEdits((p: any) => ({ ...p, fiber: numOnly(t) }))
                }
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.placeholder}
                style={{
                  height: 46,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  paddingHorizontal: 12,
                  fontWeight: "900",
                }}
              />
            </View>
          </View>
        </View>

        {/* actions */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <Pressable
            onPress={onCancel}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: withAlpha(colors.card, 0.35),
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={onConfirm}
            style={{
              flex: 1.2,
              height: 52,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.35),
              backgroundColor: withAlpha(colors.primary, 0.18),
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={colors.text}
            />
            <Text style={{ color: colors.text, fontWeight: "900" }}>
              Confirm & add
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
