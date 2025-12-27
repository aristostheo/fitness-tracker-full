// app/(modals)/add-meal.tsx
import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  Alert,
  Keyboard,
  InputAccessoryView,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from "expo-camera";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { getAuth } from "firebase/auth";
import { useEntitlements } from "@/content/useEntitlements";

import { computeMealScore } from "@/utils/mealScore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Community Food Catalog
import {
  searchCatalog,
  submitSuggestionFromScan,
  bumpUse,
} from "@/services/foodCatalog";

/* ───────────── Types ───────────── */
type Meal = "breakfast" | "lunch" | "dinner" | "snacks";

type AddPayload = {
  date: string;
  meal: Meal;
  name: string;
  unit: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  source: "catalog" | "fdc" | "manual" | "describe" | "barcode";
  fdcId?: string | null;
  healthScore?: number;
};

const FDC_API_KEY = process.env.EXPO_PUBLIC_FDC_API_KEY as string;

type FdcItem = {
  fdcId: string;
  description: string;
  brandOwner?: string;
  dataType?: string;
  gtinUpc?: string;
  labelNutrients?: {
    calories?: { value: number };
    protein?: { value: number };
    carbohydrates?: { value: number };
    fat?: { value: number };
    fiber?: { value: number };
    sugars?: { value: number };
  };
};

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

/* ───────────── Barcode → product resolvers (OFF primary, FDC fallback) ───────────── */
type SourceTag = "OFF" | "FDC";
export type ResolvedProduct = {
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

function withAlpha(color: string, alpha = 0.25) {
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

/* ───────────── Scanner Upgrades: normalizer, cache, candidates, picker ───────────── */
const CACHE_KEY = "@barcode_cache_v1"; // { [barcode: string]: ResolvedProduct }

function variantsFor(barcode: string): string[] {
  const b = barcode.trim();
  const xs = new Set<string>([b]);
  if (b.length === 12 && b.startsWith("0")) xs.add(b.slice(1)); // UPC-A -> EAN-ish
  if (b.length === 11) xs.add("0" + b); // pad UPC-A
  if (b.length === 13 && b.startsWith("0")) xs.add(b.slice(1)); // EAN13 -> UPC-A
  if (b.length === 8 && !b.startsWith("0")) xs.add("0" + b); // pad EAN-8
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
  // Cache first (exact code only)
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

  // De-dupe by significant fields
  const key = (x: ResolvedProduct) =>
    [x.name, x.brand || "", x.unit, x.per, x.source || ""]
      .join("|")
      .toLowerCase();
  const uniq = Array.from(new Map(seen.map((v) => [key(v), v])).values());

  // Rank best first
  return uniq.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
}

/* ───────────── Small UI helpers ───────────── */
function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const color =
    pct >= 80
      ? "#16a34a"
      : pct >= 60
      ? "#22c55e"
      : pct >= 40
      ? "#f59e0b"
      : pct >= 20
      ? "#f97316"
      : "#ef4444";
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "800" }}>Healthy meal score</Text>
        <Text style={{ fontWeight: "900", color }}>{pct}/100</Text>
      </View>
      <View
        style={{ height: 12, borderRadius: 999, backgroundColor: "#00000014" }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 999,
          }}
        />
      </View>
      <Text style={{ fontSize: 12, color: "#6b7280" }}>
        Higher is better. Balanced protein, reasonable calories, more fiber,
        less added sugar.
      </Text>
    </View>
  );
}

function GlassPanel({
  children,
  pad = 12,
  inset = 0,
  radius = 16,
}: React.PropsWithChildren<{ pad?: number; inset?: number; radius?: number }>) {
  const { colors, isDark } = useTheme() as any;
  const inner = <View style={{ padding: pad, gap: 10 }}>{children}</View>;

  if (Platform.OS === "ios") {
    return (
      <View
        style={{
          borderRadius: radius,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <BlurView
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          intensity={20}
          style={{ padding: inset }}
        >
          <LinearGradient
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={[colors.card + "66", colors.card + "99"]}
            style={{ position: "absolute", inset: 0 }}
          />
          {inner}
        </BlurView>
      </View>
    );
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      colors={[colors.card, colors.card]}
      style={{
        borderRadius: radius,
        borderWidth: 1,
        borderColor: colors.border,
        padding: inset,
      }}
    >
      {inner}
    </LinearGradient>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
      {children}
    </Text>
  );
}

function Segmented({
  value,
  onChange,
  items,
  size = "default",
}: {
  value: string;
  onChange: (val: string) => void;
  items: Array<{
    key: string;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
  }>;
  size?: "default" | "compact";
}) {
  const { colors } = useTheme();
  const compact = size === "compact";
  const vPad = compact ? 7 : 8;
  const hPad = compact ? 10 : 14;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 6,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        padding: 4,
        backgroundColor: withAlpha(colors.card, 0.92),
        overflow: "hidden",
      }}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(it.key);
            }}
            hitSlop={8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: vPad,
              paddingHorizontal: hPad,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active
                ? withAlpha(colors.primary, 0.3)
                : "transparent",
              backgroundColor: active
                ? withAlpha(colors.primary, 0.12)
                : "transparent",
            }}
          >
            {it.icon && (
              <Ionicons
                name={it.icon}
                size={14}
                color={active ? colors.chipActiveText : colors.muted}
              />
            )}
            <Text
              style={{
                color: active ? colors.chipActiveText : colors.text,
                fontWeight: active ? "800" : "600",
                fontSize: 13,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  multiline,
  onFocus,
  autoFocus,
  inputAccessoryViewID,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  placeholder?: string;
  multiline?: boolean;
  onFocus?: () => void;
  autoFocus?: boolean;
  inputAccessoryViewID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      {!!label && (
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
        autoFocus={autoFocus}
        returnKeyType="done"
        autoCapitalize="sentences"
        inputAccessoryViewID={inputAccessoryViewID}
        style={{
          minHeight: multiline ? 88 : 48,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 12 : 10,
          lineHeight: 20,
          backgroundColor: colors.inputBg,
          color: colors.text,
        }}
      />
    </View>
  );
}

function ListRow({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "transparent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text
          style={{ color: colors.text, fontWeight: "700" }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={!disabled ? onPress : undefined}
      onPressIn={() => {
        if (!disabled) Haptics.selectionAsync().catch(() => {});
      }}
      style={{
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.buttonBg,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Text style={{ color: colors.buttonText, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ContextTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
      <Text
        style={{
          color: colors.text,
          fontWeight: "800",
          ...(mono ? { fontVariant: ["tabular-nums"] as any } : null),
          textTransform: label === "Meal" ? "capitalize" : "none",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyHint({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ color: colors.muted }}>{text}</Text>
    </View>
  );
}

/* ───────────── Main ───────────── */

export default function AddMealModal() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isPro } = useEntitlements();

  const ensurePro = (feature: string) => {
    if (isPro) return true;
    Alert.alert(
      "Pro required",
      `${feature} is part of Pro. Unlock to continue.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "See Pro", onPress: () => router.push("/paywall") },
      ]
    );
    return false;
  };

  useLayoutEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  const params = useLocalSearchParams<{
    meal?: string;
    date?: string;
    tab?: string;
  }>();
  const [meal, setMeal] = useState<Meal>((params.meal as Meal) || "breakfast");
  const date = params.date || new Date().toISOString().slice(0, 10);

  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab: "scan" | "search" | "describe" | "manual" =
    tabParam === "scan" ||
    tabParam === "describe" ||
    tabParam === "manual" ||
    tabParam === "search"
      ? (tabParam as "scan" | "search" | "describe" | "manual")
      : "search";
  const [tab, setTab] = useState<"scan" | "search" | "describe" | "manual">(
    initialTab
  );

  // Top-level scroll
  const scrollRef = useRef<ScrollView>(null);

  // SCAN state
  const [permission, requestPermission] = useCameraPermissions();
  const [scanBusy, setScanBusy] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string>("");
  const [manualBarcode, setManualBarcode] = useState("");

  // Picker for multiple candidates
  const [pickOpen, setPickOpen] = useState(false);
  const [candidates, setCandidates] = useState<ResolvedProduct[]>([]);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "scan" && !permission?.granted) requestPermission();
  }, [tab, permission, requestPermission]);

  // SEARCH
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  type CatalogItem = {
    id?: string;
    name: string;
    unit?: string;
    per?: number;
    nutrients?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      sugar?: number;
      fiber?: number;
    };
    brand?: string | null;
  };

  const [catalogResults, setCatalogResults] = useState<CatalogItem[]>([]);
  const [fdcResults, setFdcResults] = useState<FdcItem[]>([]);

  function normalizeCatalogResponse(r: any): any[] {
    if (!r) return [];
    if (Array.isArray(r)) return r;
    if (Array.isArray(r.items)) return r.items;
    if (Array.isArray(r.top)) return r.top;
    if (Array.isArray(r.results)) return r.results;
    if (Array.isArray(r.data)) return r.data;
    return [];
  }

  let getPopularCatalog:
    | undefined
    | ((limit?: number, opts?: any) => Promise<any>);
  try {
    // @ts-ignore
    const fc = require("@/services/foodCatalog");
    if (typeof fc.getPopularCatalog === "function")
      getPopularCatalog = fc.getPopularCatalog;
  } catch {}

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const queryText = q.trim();

        let idToken: string | undefined;
        try {
          const auth = getAuth();
          idToken = await auth.currentUser?.getIdToken?.(true);
        } catch {}

        const opts = idToken
          ? { headers: { Authorization: `Bearer ${idToken}` } }
          : undefined;

        let cat: any[] = [];

        if (queryText) {
          try {
            const res = await (searchCatalog as any)(queryText, 30, opts);
            cat = normalizeCatalogResponse(res);
          } catch (e) {
            console.warn("[catalog] searchCatalog failed:", e);
          }
        } else {
          let res: any = null;
          if (getPopularCatalog) {
            try {
              res = await getPopularCatalog(30, opts);
            } catch (e) {
              console.warn("[catalog] getPopularCatalog failed:", e);
            }
          }
          if (!res) {
            try {
              res = await (searchCatalog as any)("*", 30, opts);
            } catch (e) {
              console.warn("[catalog] wildcard searchCatalog failed:", e);
            }
          }
          cat = normalizeCatalogResponse(res);
        }

        let fdc: any[] = [];
        if (queryText) {
          try {
            fdc = await searchFDC(queryText);
          } catch (e) {
            console.warn("[fdc] searchFDC failed:", e);
          }
        }

        const fixed = (cat || []).map((c: any) => {
          const n = c?.nutrients || c?.nutrition || {};
          return {
            id: c?.id || c?.docId || c?._id,
            name: String(c?.name || c?.title || "Food"),
            unit: c?.unit || c?.servingUnit || "serving",
            per: Number(c?.qty ?? c?.per ?? c?.servingSize ?? 1),
            nutrients: {
              calories: Number(
                n.calories ?? n.kcal ?? n.energy ?? c?.calories ?? 0
              ),
              protein: Number(n.protein ?? c?.protein ?? 0),
              carbs: Number(n.carbs ?? n.carbohydrates ?? c?.carbs ?? 0),
              fat: Number(n.fat ?? c?.fat ?? 0),
              sugar: Number(n.sugar ?? n.sugars ?? c?.sugar ?? 0),
              fiber: Number(n.fiber ?? c?.fiber ?? 0),
            },
            brand: c?.brand ?? c?.brandOwner ?? null,
          };
        });

        setCatalogResults(fixed);
        setFdcResults(Array.isArray(fdc) ? fdc : []);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [q]);

  // DESCRIBE
  const [descText, setDescText] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");

  const AI_URL = process.env.EXPO_PUBLIC_AI_DESCRIBE_URL; // optional

  function numstr(x: any) {
    const n = Number(x);
    return Number.isFinite(n) ? String(n) : "";
  }

  // Probe catalog (unchanged)
  useEffect(() => {
    (async () => {
      try {
        // probe catalog
        // @ts-ignore
        const fc = require("@/services/foodCatalog");
        const search = fc.searchCatalog || fc.search || fc.default;
        const getPopular = fc.getPopularCatalog;
        let res: any;

        if (typeof getPopular === "function") {
          res = await getPopular(5);
        } else if (typeof search === "function") {
          res = await search("", 5);
          if (!res || (Array.isArray(res) && res.length === 0)) {
            res = await search("*", 5);
          }
        } else {
          console.log(
            "foodCatalog service not wired: no search function exported"
          );
          return;
        }

        const _items = Array.isArray(res)
          ? res
          : res?.items || res?.top || res?.results || res?.data || [];
        void _items;
      } catch (e) {
        console.warn("CATALOG_PROBE error:", e);
      }
    })();
  }, []);

  // MANUAL (basic details only – macros handled in shared editor)
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("serving");

  // EDIT SHEET (shared macro editor for Catalog, FDC, Barcode, Describe, Manual)
  const [editOpen, setEditOpen] = useState(false);
  const [editSource, setEditSource] = useState<
    "fdc" | "catalog" | "barcode" | "manual" | "describe" | null
  >(null);
  const [barcodeSource, setBarcodeSource] = useState<SourceTag | null>(null);
  const [eName, setEName] = useState("");
  const [eQty, setEQty] = useState("1");
  const [eUnit, setEUnit] = useState("serving");
  const [eCalories, setECalories] = useState("");
  const [eProtein, setEProtein] = useState("");
  const [eCarbs, setECarbs] = useState("");
  const [eFat, setEFat] = useState("");
  const [eSugar, setESugar] = useState("");
  const [eFiber, setEFiber] = useState("");
  const [eFdcId, setEFdcId] = useState<string | null>(null);
  const [eScore, setEScore] = useState(0);

  const lastQtyRef = useRef<number>(1);

  useEffect(() => {
    setEScore(
      computeMealScore({
        calories: Number(eCalories || 0),
        protein: Number(eProtein || 0),
        carbs: Number(eCarbs || 0),
        fat: Number(eFat || 0),
        sugar: Number(eSugar || 0),
        fiber: Number(eFiber || 0),
      })
    );
  }, [eCalories, eProtein, eCarbs, eFat, eSugar, eFiber]);

  // Bottom sheet animation (shared by macro editor + candidate picker)
  const sheetProgress = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const H = Dimensions.get("window").height;
  const scrimOpacity = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });
  const translateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [H * 0.5, 0],
  });

  function animateSheet(to: 0 | 1, after?: () => void) {
    Animated.timing(sheetProgress, {
      toValue: to,
      duration: 220,
      easing: to ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && after) after();
    });
  }
  function openEdit() {
    setEditOpen(true);
    requestAnimationFrame(() => animateSheet(1));
  }
  function closeEdit() {
    animateSheet(0, () => setEditOpen(false));
  }

  // When quantity changes in macro editor, scale all macros accordingly
  const handleEditQtyChange = (t: string) => {
    const cleaned = t.replace(/[^0-9.]/g, "");
    setEQty(cleaned);

    const newQty = parseFloat(cleaned);
    if (!isFinite(newQty) || newQty <= 0) {
      // User is still typing / cleared the field – don't scale yet
      return;
    }

    const prevQty = lastQtyRef.current || 1;
    const factor = newQty / prevQty;
    if (!isFinite(factor) || factor <= 0) {
      lastQtyRef.current = newQty;
      return;
    }

    const scale = (val: string) => {
      const num = parseFloat(val || "0");
      if (!isFinite(num)) return val;
      const scaled = num * factor;
      const rounded = Math.round(scaled * 10) / 10; // 1 decimal
      return rounded ? String(rounded) : "";
    };

    setECalories(scale(eCalories));
    setEProtein(scale(eProtein));
    setECarbs(scale(eCarbs));
    setEFat(scale(eFat));
    setESugar(scale(eSugar));
    setEFiber(scale(eFiber));

    // Remember latest numeric qty for the next change
    lastQtyRef.current = newQty;
  };

  function startEditFromFdc(item: FdcItem) {
    const ln = item.labelNutrients || {};
    setEditSource("fdc");
    setBarcodeSource(null);
    setEName(item.description || "Food");
    setEQty("1");
    lastQtyRef.current = 1;
    setEUnit("serving");
    setECalories(String(ln.calories?.value ?? 0));
    setEProtein(String(ln.protein?.value ?? 0));
    setECarbs(String(ln.carbohydrates?.value ?? 0));
    setEFat(String(ln.fat?.value ?? 0));
    setESugar(String(ln.sugars?.value ?? 0));
    setEFiber(String(ln.fiber?.value ?? 0));
    setEFdcId(String(item.fdcId));
    openEdit();
    setTab("search");
  }

  function startEditFromCatalog(item: any) {
    if (item?.id) {
      try {
        bumpUse(item.id);
      } catch {}
    }
    const n = item?.nutrients || {};
    const baseQty = Number(item?.per ?? 1) || 1;
    setEditSource("catalog");
    setBarcodeSource(null);
    setEName(item?.name || "Food");
    setEQty(String(baseQty));
    lastQtyRef.current = baseQty;
    setEUnit(item?.unit || "serving");
    setECalories(String(Number(n.calories || 0)));
    setEProtein(String(Number(n.protein || 0)));
    setECarbs(String(Number(n.carbs || 0)));
    setEFat(String(Number(n.fat || 0)));
    setESugar(String(Number(n.sugar || 0)));
    setEFiber(String(Number(n.fiber || 0)));
    setEFdcId(null);
    openEdit();
    setTab("search");
  }

  function startEditFromBarcode(r: ResolvedProduct) {
    const baseQty = Number(r.per ?? 1) || 1;
    setEditSource("barcode");
    setBarcodeSource(r.source ?? null);
    setEName(r.name || "Food");
    setEQty(String(baseQty)); // 1 (serving) or 100
    lastQtyRef.current = baseQty;
    setEUnit(r.unit || "serving");
    setECalories(String(Number(r.nutrients.calories || 0)));
    setEProtein(String(Number(r.nutrients.protein || 0)));
    setECarbs(String(Number(r.nutrients.carbs || 0)));
    setEFat(String(Number(r.nutrients.fat || 0)));
    setESugar(String(Number(r.nutrients.sugar || 0)));
    setEFiber(String(Number(r.nutrients.fiber || 0)));
    setEFdcId(r.fdcId ?? null);
    openEdit();
    setScanBusy(false);
  }

  // Start macro editor from Manual tab
  function startManualEdit() {
    if (!name.trim()) {
      Alert.alert("Add a name", "Please enter a meal name first.");
      return;
    }

    const baseQty = parseFloat(qty || "1") || 1;

    setEditSource("manual");
    setBarcodeSource(null);
    setEName(name.trim());
    setEQty(String(baseQty));
    lastQtyRef.current = baseQty;
    setEUnit(unit || "serving");

    // Always start with empty macros for manual mode
    setECalories("");
    setEProtein("");
    setECarbs("");
    setEFat("");
    setESugar("");
    setEFiber("");
    setEFdcId(null);

    openEdit();
  }

  function startScanFallbackManual() {
    const trimmed = manualBarcode.trim();

    // If user typed digits, treat it as a barcode (so we can cache + submit suggestion)
    if (trimmed) {
      setScannedBarcode(trimmed);
      setEditSource("barcode");
      setBarcodeSource(null);
    } else {
      setEditSource("manual");
      setBarcodeSource(null);
    }

    setEName("");
    setEQty("1");
    lastQtyRef.current = 1;
    setEUnit("serving");

    // Start with empty macros – user fills them from the label
    setECalories("");
    setEProtein("");
    setECarbs("");
    setEFat("");
    setESugar("");
    setEFiber("");
    setEFdcId(null);

    openEdit();
  }

  // Describe → fill macro editor and open sheet
  async function onCalculateMacros() {
    if (!ensurePro("AI meal describe")) return;
    setCalcError("");
    const text = descText.trim();
    if (!text) {
      setCalcError("Please describe your meal first.");
      return;
    }

    setCalcLoading(true);
    try {
      const token = await getAuth().currentUser?.getIdToken(true);
      if (!AI_URL) {
        setCalcError("AI endpoint is not configured.");
        return;
      }

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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setCalcError("Please sign in to use Describe.");
        return;
      }

      const got = await res.json();

      const nName = String(got.name || text);
      const qVal = got.quantity;
      const nQty = Number.isFinite(Number(qVal)) ? String(qVal) : "1";
      const nUnit = String(got.unit || "serving");

      const nCalories = numstr(got.calories);
      const nProtein = numstr(got.protein);
      const nCarbs = numstr(got.carbs);
      const nFat = numstr(got.fat);
      const nSugar = numstr(got.sugar);
      const nFiber = numstr(got.fiber);

      setEditSource("describe");
      setBarcodeSource(null);
      setEName(nName);
      setEQty(nQty || "1");
      lastQtyRef.current = parseFloat(nQty || "1") || 1;
      setEUnit(nUnit);
      setECalories(nCalories);
      setEProtein(nProtein);
      setECarbs(nCarbs);
      setEFat(nFat);
      setESugar(nSugar);
      setEFiber(nFiber);
      setEFdcId(null);

      openEdit();
    } catch {
      setCalcError("Describe service unavailable. Please try again.");
    } finally {
      setCalcLoading(false);
    }
  }

  // Back with payload (pairs with nutrition.tsx AsyncStorage reader)
  function done(payload: AddPayload) {
    AsyncStorage.setItem("@pending_add_meal", JSON.stringify(payload))
      .catch(() => {})
      .finally(() => {
        router.back();
      });
  }

  async function addFromEditDraft() {
    if (!eName.trim()) return;

    const healthScore = computeMealScore({
      calories: Number(eCalories || 0),
      protein: Number(eProtein || 0),
      carbs: Number(eCarbs || 0),
      fat: Number(eFat || 0),
      sugar: Number(eSugar || 0),
      fiber: Number(eFiber || 0),
    });

    // Save user correction locally for this barcode
    if (editSource === "barcode" && scannedBarcode) {
      await cacheSave(scannedBarcode, {
        name: eName,
        unit: eUnit,
        per: Number(eQty || 1),
        nutrients: {
          calories: Number(eCalories || 0),
          protein: Number(eProtein || 0),
          carbs: Number(eCarbs || 0),
          fat: Number(eFat || 0),
          sugar: Number(eSugar || 0),
          fiber: Number(eFiber || 0),
        },
        fdcId: eFdcId ?? null,
        source: "OFF",
      });

      // ALSO push to Community DB + link barcode -> foodId
      try {
        const uid = getAuth().currentUser?.uid || null;
        await submitSuggestionFromScan({
          barcode: scannedBarcode,
          name: eName,
          unit: eUnit,
          qty: Number(eQty || 1),
          calories: Number(eCalories || 0),
          protein: Number(eProtein || 0),
          carbs: Number(eCarbs || 0),
          fat: Number(eFat || 0),
          sugar: Number(eSugar || 0),
          fiber: Number(eFiber || 0),
          submitterUid: uid,
          verified: false,
          bumpPopularity: true,
        });
      } catch {}
    }

    done({
      date,
      meal,
      name: eName.trim(),
      unit: eUnit || "serving",
      qty: Number(eQty || 1),
      calories: Number(eCalories || 0),
      protein: Number(eProtein || 0),
      carbs: Number(eCarbs || 0),
      fat: Number(eFat || 0),
      sugar: Number(eSugar || 0),
      fiber: Number(eFiber || 0),
      source: (editSource as any) ?? "catalog",
      fdcId: editSource === "fdc" ? eFdcId : null,
      healthScore,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  }

  // --- Scan handler with candidates/picker ---
  async function onBarcodeScanned(res: BarcodeScanningResult) {
    if (scanBusy) return;
    const code = res?.data;
    if (!code || code === lastCode) return;

    setScanBusy(true);
    setLastCode(code);
    setScannedBarcode(code);
    setScanError("");

    try {
      const list = await resolveBarcodeCandidates(code);
      if (!list.length) {
        setScanError("No nutrition match found for this barcode.");
        setScanBusy(false);
        return;
      }
      if (list.length === 1) {
        startEditFromBarcode(list[0]);
        setScanBusy(false);
      } else {
        setCandidates(list);
        setPickOpen(true);
        setScanBusy(false);
      }
    } catch {
      setScanError("Scan lookup failed. Please try again.");
      setScanBusy(false);
    }
  }

  async function onManualBarcodeLookup() {
    const code = manualBarcode.trim();
    if (!code) {
      setScanError("Please enter the digits from the barcode first.");
      return;
    }
    if (scanBusy) return;

    setScanBusy(true);
    setScanError("");
    setScannedBarcode(code); // so edits still tie back to this barcode
    setLastCode(null);

    try {
      const list = await resolveBarcodeCandidates(code);

      if (!list.length) {
        setScanError(
          "We couldn’t find this barcode. Double-check the digits and try again, or add it manually in the Manual tab."
        );
        return;
      }

      if (list.length === 1) {
        // Same behavior as a successful camera scan
        startEditFromBarcode(list[0]); // opens macro popup with values
        setManualBarcode("");
      } else {
        // Reuse the candidate picker sheet
        setCandidates(list);
        setPickOpen(true);
      }
    } catch (e) {
      setScanError(
        "Barcode lookup failed. Check your connection and try again."
      );
    } finally {
      setScanBusy(false);
    }
  }

  // helper for per-100g/ml warning
  const perIs100 = (() => {
    const qNum = Number(eQty);
    const u = (eUnit || "").toLowerCase();
    return (
      qNum === 100 &&
      (u.includes("100 g") ||
        u === "100 g" ||
        u.includes("100 ml") ||
        u === "100 ml")
    );
  })();

  const sourceLabel = (() => {
    if (!editSource) return null;
    if (editSource === "describe") return "AI parsed";
    if (editSource === "barcode") {
      if (barcodeSource === "OFF") return "OpenFoodFacts";
      if (barcodeSource === "FDC") return "FDC fallback";
      return "Barcode scan";
    }
    if (editSource === "fdc") return "USDA FDC";
    if (editSource === "catalog") return "Community catalog";
    return "Manual entry";
  })();

  const headerHeight = insets.top + 120;
  const mealOptions: Meal[] = ["breakfast", "lunch", "dinner", "snacks"];
  const accessoryId = "macroAccessory";
  const showAccessory = Platform.OS === "ios";
  const formatMeal = (m: Meal) => m.charAt(0).toUpperCase() + m.slice(1);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.background}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* iOS-style blurred header with large title */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: headerHeight,
            zIndex: 30,
            overflow: "hidden",
          }}
          pointerEvents="box-none"
        >
          <View style={{ flex: 1 }}>
            {BlurView ? (
              <BlurView
                intensity={28}
                tint={isDark ? "dark" : "light"}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            ) : (
              <LinearGradient
                colors={
                  isDark
                    ? ["rgba(12,14,20,0.95)", "rgba(12,14,20,0.75)"]
                    : ["rgba(247,249,255,0.95)", "rgba(235,240,255,0.75)"]
                }
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            )}

            <View
              style={{
                flex: 1,
                paddingTop: insets.top + 10,
                paddingHorizontal: 16,
                gap: 12,
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 28,
                      fontWeight: "900",
                      letterSpacing: -0.3,
                    }}
                  >
                    Add meal
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      marginTop: 2,
                      fontSize: 13,
                    }}
                  >
                    {date} · {formatMeal(meal)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => router.back()}
                  hitSlop={10}
                  accessibilityLabel="Close"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: withAlpha(colors.card, 0.9),
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>

              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <ContextTile label="Date" value={date} mono />
                  <ContextTile label="Meal" value={formatMeal(meal)} />
                </View>
                <Segmented
                  value={meal}
                  onChange={(val) => {
                    Haptics.selectionAsync().catch(() => {});
                    setMeal(val as Meal);
                  }}
                  items={mealOptions.map((m) => ({
                    key: m,
                    label: formatMeal(m),
                  }))}
                  size="compact"
                />
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            padding: 16,
            gap: 14,
            paddingBottom: 24,
            paddingTop: headerHeight + 10,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          automaticallyAdjustKeyboardInsets
        >
          {/* spacer covered by header */}

          {/* AI meal ideas entrypoint (complete today's macros) */}
          <Pressable
            onPress={() => {
              if (!ensurePro("AI meal suggestions")) return;
              router.push({
                pathname: "/(modals)/ai-meal-suggestions",
                params: { date, meal },
              });
            }}
            accessibilityLabel="Generate meal ideas to hit today's macros"
            style={{
              borderRadius: 14,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <LinearGradient
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              colors={isDark ? ["#a78bfa", "#8b5cf6"] : ["#22c55e", "#16a34a"]}
              style={{
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 14,
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Ionicons name="sparkles-outline" size={20} color={"#fff"} />
              <Text
                style={{ color: "#fff", fontWeight: "900", letterSpacing: 0.3 }}
              >
                AI meal ideas
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Optional: quick notes/restrictions chip */}
          <Pressable
            onPress={() => {
              if (!ensurePro("AI meal suggestions")) return;
              router.push({
                pathname: "/(modals)/ai-meal-suggestions",
                params: { date, meal, focus: "notes" },
              });
            }}
            accessibilityLabel="Add notes or dietary restrictions"
            style={{
              alignSelf: "flex-start",
              marginTop: 8,
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
            }}
          >
            <Ionicons name="create-outline" size={16} color={colors.text} />
            <Text
              style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}
            >
              Notes / restrictions
            </Text>
          </Pressable>

          {/* Tabs */}
          <Segmented
            value={tab}
            onChange={(k) => setTab(k as any)}
            items={[
              { key: "scan", label: "Scan", icon: "barcode-outline" },
              { key: "search", label: "Search", icon: "search-outline" },
              {
                key: "describe",
                label: "Describe",
                icon: "chatbox-ellipses-outline",
              },
              { key: "manual", label: "Manual", icon: "apps-outline" },
            ]}
          />

          {/* SCAN */}
          {tab === "scan" && (
            <View style={{ gap: 12 }}>
              <GlassPanel>
                <SectionTitle>Scan a barcode</SectionTitle>

                {!permission ? (
                  <EmptyHint text="Requesting camera permission…" />
                ) : !permission.granted ? (
                  <View style={{ gap: 10 }}>
                    <EmptyHint text="Camera access is blocked. Grant access to scan barcodes." />
                    <PrimaryButton
                      label="Grant Camera Access"
                      onPress={() => requestPermission()}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      overflow: "hidden",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View style={{ aspectRatio: 3 / 4 }}>
                      <CameraView
                        style={{ width: "100%", height: "100%" }}
                        facing="back"
                        barcodeScannerSettings={{
                          barcodeTypes: [
                            "ean13",
                            "ean8",
                            "upc_a",
                            "upc_e",
                            "code128",
                            "code39",
                            "qr",
                          ] as BarcodeType[],
                        }}
                        onBarcodeScanned={onBarcodeScanned}
                      />

                      {/* Improved overlay tip + frame */}
                      <View
                        pointerEvents="none"
                        style={{ position: "absolute", inset: 0 }}
                      >
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 48,
                            backgroundColor: "#00000033",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: "white", fontWeight: "800" }}>
                            Hold steady • Avoid glare • Fill the frame
                          </Text>
                        </View>
                        <View
                          style={{
                            position: "absolute",
                            left: "10%",
                            right: "10%",
                            top: "30%",
                            bottom: "30%",
                            borderWidth: 2,
                            borderColor: "#ffffff88",
                            borderRadius: 12,
                          }}
                        />
                      </View>

                      {scanBusy && (
                        <View
                          style={{
                            position: "absolute",
                            bottom: 12,
                            left: 12,
                            right: 12,
                            height: 40,
                            borderRadius: 999,
                            backgroundColor: "#00000066",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: "white", fontWeight: "800" }}>
                            Looking up nutrition…
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {!!scanError && (
                  <Text
                    style={{ color: "#ef4444", marginTop: 8, fontSize: 12 }}
                  >
                    {scanError}
                  </Text>
                )}
                {permission?.granted && (
                  <Text
                    style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}
                  >
                    Data sources: Open Food Facts (primary), USDA FDC
                    (fallback).
                  </Text>
                )}

                {/* Fallback: manual barcode digits → same lookup as camera */}
                <View style={{ marginTop: 12, gap: 8 }}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Having trouble scanning? Type the digits printed under the
                    barcode and we’ll look it up. If we find a match, we’ll
                    autofill calories, protein, carbs, fat, sugar and fiber —
                    you can still tweak everything before adding.
                  </Text>

                  <Field
                    label="Barcode digits"
                    value={manualBarcode}
                    onChangeText={(t) =>
                      setManualBarcode(t.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="numeric"
                    inputAccessoryViewID={
                      showAccessory ? accessoryId : undefined
                    }
                    placeholder="e.g., 060383123456"
                  />

                  <PrimaryButton
                    label={scanBusy ? "Looking up…" : "Look up barcode"}
                    onPress={onManualBarcodeLookup}
                    disabled={scanBusy || !manualBarcode.trim()}
                  />

                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    Tip: Use all the numbers directly under the barcode. Once
                    the product is found, check the serving size and macros
                    against the nutrition label so everything matches.
                  </Text>
                </View>
              </GlassPanel>
            </View>
          )}

          {/* SEARCH */}
          {tab === "search" && (
            <View style={{ gap: 12 }}>
              <GlassPanel>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 12,
                    backgroundColor: colors.inputBg,
                    paddingHorizontal: 12,
                    height: 48,
                  }}
                >
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={colors.muted}
                  />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Search the community & USDA…"
                    placeholderTextColor={colors.placeholder}
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      color: colors.text,
                      fontSize: 16,
                    }}
                    autoCapitalize="none"
                    onFocus={() =>
                      setTimeout(
                        () =>
                          scrollRef.current?.scrollTo({ y: 0, animated: true }),
                        60
                      )
                    }
                  />
                  {loading ? (
                    <ActivityIndicator />
                  ) : q ? (
                    <Pressable
                      onPress={() => setQ("")}
                      hitSlop={8}
                      accessibilityLabel="Clear search"
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.muted}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </GlassPanel>

              {/* Community catalog */}
              <GlassPanel>
                <SectionTitle>
                  {q.trim()
                    ? "Community catalog results"
                    : "Popular in community"}
                </SectionTitle>
                {catalogResults.length === 0 ? (
                  <EmptyHint
                    text={
                      loading
                        ? "Searching…"
                        : q.trim()
                        ? "No matches yet."
                        : "No community items yet."
                    }
                  />
                ) : (
                  catalogResults.map((c, idx) => {
                    const n = c.nutrients || {};
                    const macro =
                      `per ${c.per ?? 1} ${c.unit || "serving"} • ` +
                      `${Math.round(Number(n.calories || 0))} kcal • ` +
                      `P${Math.round(Number(n.protein || 0))} ` +
                      `C${Math.round(Number(n.carbs || 0))} ` +
                      `F${Math.round(Number(n.fat || 0))}`;
                    return (
                      <ListRow
                        key={`cat-${idx}-${c.name}-${c.unit}`}
                        onPress={() => startEditFromCatalog(c)}
                        title={c.name}
                        subtitle={macro}
                        right={
                          <Ionicons
                            name="create-outline"
                            size={20}
                            color={colors.text}
                          />
                        }
                      />
                    );
                  })
                )}
              </GlassPanel>

              {/* USDA */}
              <GlassPanel>
                <SectionTitle>USDA FoodData Central</SectionTitle>
                {!q.trim() ? (
                  <EmptyHint text="Type above to search the national database." />
                ) : fdcResults.length === 0 ? (
                  <EmptyHint
                    text={loading ? "Searching…" : "No results found."}
                  />
                ) : (
                  fdcResults.map((f) => (
                    <ListRow
                      key={f.fdcId}
                      onPress={() => startEditFromFdc(f)}
                      title={f.description}
                      subtitle={f.brandOwner}
                      right={
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={colors.text}
                        />
                      }
                    />
                  ))
                )}
              </GlassPanel>
            </View>
          )}

          {/* DESCRIBE (now only prompt + button; macros handled in shared sheet) */}
          {tab === "describe" && (
            <View style={{ gap: 12 }}>
              <GlassPanel>
                <SectionTitle>Describe your meal</SectionTitle>
                <Field
                  value={descText}
                  onChangeText={setDescText}
                  placeholder="e.g., chicken bowl with rice and veggies"
                  multiline
                  onFocus={() =>
                    scrollRef.current?.scrollTo({ y: 0, animated: true })
                  }
                />
                <PrimaryButton
                  label={
                    calcLoading ? "Calculating…" : "Calculate & edit macros"
                  }
                  onPress={onCalculateMacros}
                  disabled={calcLoading || !descText.trim()}
                />
                {!!calcError && (
                  <Text style={{ color: "#ef4444", fontSize: 12 }}>
                    {calcError}
                  </Text>
                )}
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: colors.muted,
                  }}
                >
                  After calculation, a popup will let you tweak quantity and
                  macros before adding.
                </Text>
              </GlassPanel>
            </View>
          )}

          {/* MANUAL (basic details → shared macro editor) */}
          {tab === "manual" && (
            <View style={{ gap: 12 }}>
              <GlassPanel>
                <SectionTitle>Details</SectionTitle>
                <Field
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Greek yogurt"
                  onFocus={() =>
                    scrollRef.current?.scrollTo({ y: 0, animated: true })
                  }
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field
                    label="Qty"
                    value={qty}
                    onChangeText={(t) => setQty(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    inputAccessoryViewID={
                      showAccessory ? accessoryId : undefined
                    }
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 120, animated: true })
                    }
                  />
                  <Field
                    label="Unit"
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="serving / g / ml"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 120, animated: true })
                    }
                  />
                </View>

                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: colors.muted,
                  }}
                >
                  You’ll set calories, protein, carbs, fat, sugar and fiber in a
                  popup next.
                </Text>

                <PrimaryButton
                  label="Edit macros"
                  onPress={startManualEdit}
                  disabled={!name.trim()}
                />
              </GlassPanel>
            </View>
          )}
        </ScrollView>

        {/* Bottom Sheet: Shared Macro Editor */}
        {editOpen && (
          <>
            {/* Scrim */}
            <Animated.View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "#000",
                opacity: scrimOpacity,
              }}
            />
            <Pressable
              onPress={closeEdit}
              style={{ position: "absolute", inset: 0 }}
              accessibilityLabel="Dismiss editor"
            />
            {/* Sheet */}
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                transform: [{ translateY }],
              }}
            >
              <SafeAreaView
                edges={["bottom"]}
                style={{ padding: 16, paddingTop: 8 }}
              >
                {/* Keyboard + scroll handling for popup */}
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
                  style={{ maxHeight: H * 0.8 }}
                >
                  <GlassPanel>
                    {/* Header row stays fixed */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: "800" }}>
                        Edit details
                      </Text>
                      <Pressable
                        onPress={closeEdit}
                        hitSlop={8}
                        accessibilityLabel="Close edit"
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={colors.muted}
                        />
                      </Pressable>
                    </View>

                    {/* Scrollable content so keyboard doesn't trap the user */}
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode={
                        Platform.OS === "ios" ? "interactive" : "on-drag"
                      }
                      contentContainerStyle={{ paddingBottom: 8, gap: 10 }}
                      showsVerticalScrollIndicator={false}
                    >
                      {/* Source + basis badges */}
                      {(sourceLabel || editSource) && (
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 8,
                            alignItems: "center",
                            marginTop: 2,
                          }}
                        >
                          {sourceLabel && (
                            <View
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 999,
                                borderWidth: 1,
                                backgroundColor:
                                  editSource === "describe"
                                    ? withAlpha(colors.primary, 0.14)
                                    : withAlpha(colors.card, 0.9),
                                borderColor:
                                  editSource === "describe"
                                    ? withAlpha(colors.primary, 0.35)
                                    : colors.border,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "800",
                                  color:
                                    editSource === "describe"
                                      ? colors.primary
                                      : colors.text,
                                }}
                              >
                                {sourceLabel}
                              </Text>
                            </View>
                          )}
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 999,
                              borderWidth: 1,
                              backgroundColor: withAlpha(colors.card, 0.9),
                              borderColor: colors.border,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: colors.muted,
                              }}
                            >
                              per {eQty} {eUnit}
                            </Text>
                          </View>
                        </View>
                      )}
                      {perIs100 && (
                        <Text
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "#f59e0b",
                          }}
                        >
                          Tip: This entry is per 100{" "}
                          {eUnit.toLowerCase().includes("ml") ? "ml" : "g"}.
                          Adjust quantity/unit to match your serving.
                        </Text>
                      )}

                      <Field
                        label="Name"
                        value={eName}
                        onChangeText={setEName}
                        placeholder="Meal name"
                        autoFocus={editOpen}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Field
                          label="Quantity"
                          value={eQty}
                          onChangeText={handleEditQtyChange}
                          keyboardType="decimal-pad"
                          inputAccessoryViewID={
                            showAccessory ? accessoryId : undefined
                          }
                        />
                        <Field
                          label="Unit"
                          value={eUnit}
                          onChangeText={setEUnit}
                          placeholder="serving / g / ml"
                        />
                      </View>

                      <SectionTitle>
                        Macros (totals for the whole meal)
                      </SectionTitle>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Field
                          label="Calories"
                          value={eCalories}
                          onChangeText={(t) =>
                            setECalories(t.replace(/[^0-9.]/g, ""))
                          }
                          keyboardType="decimal-pad"
                          inputAccessoryViewID={
                            showAccessory ? accessoryId : undefined
                          }
                        />
                        <Field
                          label="Protein (g)"
                          value={eProtein}
                          onChangeText={(t) =>
                            setEProtein(t.replace(/[^0-9.]/g, ""))
                          }
                          keyboardType="decimal-pad"
                          inputAccessoryViewID={
                            showAccessory ? accessoryId : undefined
                          }
                        />
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Field
                          label="Carbs (g)"
                          value={eCarbs}
                          onChangeText={(t) =>
                            setECarbs(t.replace(/[^0-9.]/g, ""))
                          }
                          keyboardType="decimal-pad"
                          inputAccessoryViewID={
                            showAccessory ? accessoryId : undefined
                          }
                        />
                        <Field
                          label="Fat (g)"
                          value={eFat}
                          onChangeText={(t) =>
                            setEFat(t.replace(/[^0-9.]/g, ""))
                          }
                          keyboardType="decimal-pad"
                          inputAccessoryViewID={
                            showAccessory ? accessoryId : undefined
                          }
                        />
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Field
                          label="Sugar (g)"
                          value={eSugar}
                          onChangeText={(t) =>
                            setESugar(t.replace(/[^0-9.]/g, ""))
                          }
                          keyboardType="decimal-pad"
                          inputAccessoryViewID={
                            showAccessory ? accessoryId : undefined
                          }
                        />
                        <Field
                          label="Fiber (g)"
                          value={eFiber}
                          onChangeText={(t) =>
                            setEFiber(t.replace(/[^0-9.]/g, ""))
                          }
                          keyboardType="decimal-pad"
                          inputAccessoryViewID={
                            showAccessory ? accessoryId : undefined
                          }
                        />
                      </View>

                      <ScoreBar score={eScore} />

                      {/* Report mismatch / update from label */}
                      <Pressable
                        onPress={async () => {
                          try {
                            // try forwarding to your catalog if available
                            // @ts-ignore
                            const fc = require("@/services/foodCatalog");
                            if (typeof fc.submitSuggestion === "function") {
                              await fc.submitSuggestion({
                                barcode: scannedBarcode,
                                name: eName,
                                unit: eUnit,
                                per: Number(eQty || 1),
                                nutrients: {
                                  calories: Number(eCalories || 0),
                                  protein: Number(eProtein || 0),
                                  carbs: Number(eCarbs || 0),
                                  fat: Number(eFat || 0),
                                  sugar: Number(eSugar || 0),
                                  fiber: Number(eFiber || 0),
                                },
                                source: editSource,
                              });
                            }
                            // always cache locally
                            if (scannedBarcode) {
                              await cacheSave(scannedBarcode, {
                                name: eName,
                                unit: eUnit,
                                per: Number(eQty || 1),
                                nutrients: {
                                  calories: Number(eCalories || 0),
                                  protein: Number(eProtein || 0),
                                  carbs: Number(eCarbs || 0),
                                  fat: Number(eFat || 0),
                                  sugar: Number(eSugar || 0),
                                  fiber: Number(eFiber || 0),
                                },
                                fdcId: eFdcId ?? null,
                                source: "OFF",
                              });
                            }
                            Alert.alert("Thanks!", "We saved your correction.");
                          } catch {
                            Alert.alert(
                              "Oops",
                              "Couldn’t send suggestion. Saved locally."
                            );
                          }
                        }}
                        style={{ alignSelf: "flex-start", marginBottom: 4 }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.muted,
                            textDecorationLine: "underline",
                          }}
                        >
                          Report mismatch / Update from label
                        </Text>
                      </Pressable>

                      <PrimaryButton
                        label="Add"
                        onPress={addFromEditDraft}
                        disabled={!eName.trim()}
                      />
                    </ScrollView>
                  </GlassPanel>
                </KeyboardAvoidingView>
              </SafeAreaView>
            </Animated.View>
          </>
        )}

        {/* Candidate Picker Sheet */}
        {pickOpen && (
          <>
            <Animated.View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "#000",
                opacity: scrimOpacity,
              }}
            />
            <Pressable
              onPress={() => setPickOpen(false)}
              style={{ position: "absolute", inset: 0 }}
            />
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                transform: [{ translateY }],
              }}
            >
              <SafeAreaView
                edges={["bottom"]}
                style={{ padding: 16, paddingTop: 8 }}
              >
                <GlassPanel>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                      Select a match
                    </Text>
                    <Pressable onPress={() => setPickOpen(false)}>
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.muted}
                      />
                    </Pressable>
                  </View>

                  {candidates.map((c, i) => (
                    <ListRow
                      key={i}
                      onPress={() => {
                        setPickOpen(false);
                        startEditFromBarcode(c);
                      }}
                      title={`${c.name}${c.brand ? " • " + c.brand : ""}`}
                      subtitle={`${c.source} • per ${c.per} ${c.unit}`}
                      right={
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.muted}
                        />
                      }
                    />
                  ))}
                </GlassPanel>
              </SafeAreaView>
            </Animated.View>
          </>
        )}

        {showAccessory && (
          <InputAccessoryView nativeID={accessoryId}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
                flexDirection: "row",
                justifyContent: "flex-end",
              }}
            >
              <Pressable
                onPress={() => Keyboard.dismiss()}
                hitSlop={8}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: withAlpha(colors.primary, 0.15),
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.35),
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "800" }}>
                  Done
                </Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
